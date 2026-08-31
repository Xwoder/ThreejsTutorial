import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Lesson} from '../types';
import {createContext, disposeObject3D, makeCleanup, setSceneBackground, BG_DARK} from '../helper';
import {parseMjcf, buildRobot, applyKeyframe} from './microduckMjcf';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';

import robotXml from '../../assets/Model/microduck/robot_walk.xml?raw';
// 批量导入 assets 目录下所有 STL，构建期复制到产物并拿到运行时 URL。
// 用 import.meta.glob 避免手写每个文件名（磁盘上有 47 个、MJCF 引用 38 个，
// 命名不完全对应，动态导入最稳妥）。
const stlModules = import.meta.glob('../../assets/Model/microduck/assets/*.stl', {
    query: '?url',
    import: 'default',
    eager: true,
}) as Record<string, string>;

/** STL 文件名（含扩展名，如 trunk_base.stl）→ 运行时 URL */
const STL_URLS: Record<string, string> = {};
for (const [path, url] of Object.entries(stlModules)) {
    const name = path.split('/').pop()!;
    STL_URLS[name] = url;
}

/** 按部件给网格上色，让机器人更清晰可辨 */
function paletteFor(meshName: string): THREE.Material {
    const c = (hex: number) =>
        new THREE.MeshStandardMaterial({color: hex, metalness: 0.15, roughness: 0.6});
    if (/trunk|shell|shell_left|shell_right/.test(meshName)) return c(0x3b82f6); // 蓝：躯干/外壳
    if (/head|jaw|neck|lens|noenoeil|face|speaker/.test(meshName)) return c(0xf59e0b); // 橙：头部
    if (/hip|upper_leg|leg|foot|sole|ankle/.test(meshName)) return c(0x10b981); // 绿：腿部
    if (/yaw|roll|motor|power|banana|pcb|elec/.test(meshName)) return c(0x64748b); // 灰：结构/电子
    if (/roller|tire|rim|bearing/.test(meshName)) return c(0xef4444); // 红：滚轮
    return c(0x9aa3b2);
}

export const microduck: Lesson = {
    id: 'examples/microduck-robot',
    title: 'Microduck 四足机器人 (MJCF+STL)',
    description: `
    <h2>从 MuJoCo MJCF 还原机器人</h2>
    <p>本示例加载一个真实四足机器人 <b>microduck</b> 的模型。它来自
    <code>microduck_rl</code> 仓库，原始模型以 <b>MuJoCo MJCF</b>（XML）描述装配关系，
    零件几何为 <b>STL</b> 网格（共 47 个）。</p>
    <p>我们用 <code>DOMParser</code> 解析 MJCF，按 <code>&lt;body&gt;</code> 层级、
    <code>&lt;joint&gt;</code> 旋转轴、<code>&lt;geom type="mesh"&gt;</code> 引用的 STL
    在 Three.js 里重建出完整机器人，并摆到 MJCF <code>STAND</code> 关键帧记录的站立姿态：</p>
    <ul>
      <li>使用 <b>STLLoader</b> 异步加载每个零件网格，同名零件网格复用（缓存）</li>
      <li>MJCF 是 <b>Z-up</b>（重力沿 -Z），Three.js 是 <b>Y-up</b>：用一个外层组
          绕 X 轴 -90° 做坐标转换（Z-up → Y-up），机器人因此直立站在原点</li>
      <li>再绕 Y 轴 -90°，让 MJCF 的前向 (+X) 转为面朝 <b>+Z</b></li>
      <li>MuJoCo 四元数写法是 <code>w x y z</code>，需转成 Three 的 <code>x y z w</code></li>
    </ul>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK);

        const pmrem = new THREE.PMREMGenerator(ctx.renderer);
        ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(0.6, 0.4, 0.6);

        ctx.scene.add(new THREE.GridHelper(2, 20, 0x475569, 0x1e293b));
      // 带 X/Y/Z 文字标签的坐标轴辅助器（红=X, 绿=Y, 蓝=Z），便于对照机器人姿态
      const axes = new LabeledAxesHelper(0.4, true, true);
      // 抬高一点，避免 X/Z 轴与地面共面被遮挡
      axes.position.y = 0.002;
      ctx.scene.add(axes);
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dir = new THREE.DirectionalLight(0xffffff, 2.5);
        dir.position.set(1, 2, 1.5);
        ctx.scene.add(dir);
        const dir2 = new THREE.DirectionalLight(0xffffff, 1.0);
        dir2.position.set(-1.5, 1, -1);
        ctx.scene.add(dir2);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.12, 0);

        // MJCF 是 Z-up（重力沿 -Z），Three.js 是 Y-up。用一个外层组绕 X 轴
        // 旋转 -90° 把整个机器人从 Z-up 坐标系转换到 Y-up：
        //   (x,y,z) -> (x, z, -y)，即 MJCF 的 +Z（上）映射到 Three 的 +Y（上）。
        // 这样关键帧里的 rootPos(0,0,0.12) 会落到 y=0.12，机器人直立站在原点。
        // 再绕世界 Y 轴 -90° 让 MJCF 前向(+X)转为面朝 +Z。
        const coordFix = new THREE.Group();
        // Z-up -> Y-up：绕 X 轴 -90°
        const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
        // 朝向：MJCF 前向为 +X，绕世界 Y 轴 -90° 把 +X 转到 +Z（面朝 +Z）
        const qy = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.PI / 2);
        coordFix.quaternion.copy(qy).multiply(qx);
        ctx.scene.add(coordFix);

        let disposed = false;
        const loadingTip = document.createElement('div');
        loadingTip.textContent = '正在解析 MJCF 并加载 47 个 STL 零件…';
        loadingTip.style.cssText =
            'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;text-align:center;';
        container.appendChild(loadingTip);

        const stlLoader = new STLLoader();
        const geomCache = new Map<string, THREE.BufferGeometry>();

        const loadMesh = async (_meshName: string, fileName: string): Promise<THREE.BufferGeometry> => {
            const cached = geomCache.get(fileName);
            if (cached) return cached;
            const url = STL_URLS[fileName];
            if (!url) throw new Error(`缺少 STL 导入：${fileName}`);
            const geom = await stlLoader.loadAsync(url);
            geomCache.set(fileName, geom);
            return geom;
        };

        const model = parseMjcf(robotXml);

        buildRobot(model, loadMesh, paletteFor)
            .then((b) => {
                if (disposed) {
                    disposeObject3D(b.root);
                    return;
                }
                coordFix.add(b.root);
                // 一次性摆好站立姿态：优先用 STAND 关键帧（否则退回第一个关键帧）。
                // 若不设置关节角度，机器人会停留在零位姿态（腿伸直的初始建模姿态）。
                const stand = model.keyframes.find((k) => k.name === 'STAND') ?? model.keyframes[0];
                if (stand) applyKeyframe(b, stand);
                loadingTip.remove();
            })
            .catch((err) => {
                if (disposed) return;
                loadingTip.textContent = '模型构建失败';
                console.error(err);
            });

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            disposed = true;
            cancelAnimationFrame(raf);
            controls.dispose();
            pmrem.dispose();
          disposeObject3D(axes);
            loadingTip.remove();
            geomCache.forEach((g) => g.dispose());
        });
    },
};
