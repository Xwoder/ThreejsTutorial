import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {STLLoader} from 'three/examples/jsm/loaders/STLLoader.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Lesson} from '../types';
import {createContext, disposeObject3D, makeCleanup, setSceneBackground, BG_DARK} from '../helper';
import {parseMjcf, buildRobot, type BuiltRobot, type MjcfKeyframe} from './microduckMjcf';

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
    在 Three.js 里重建出完整机器人，再用 MJCF 中 <code>&lt;keyframe&gt;</code> 记录的
    <code>qpos</code>（关节角度）驱动姿态切换：</p>
    <ul>
      <li>使用 <b>STLLoader</b> 异步加载每个零件网格</li>
      <li>MJCF 与 Three.js 同为「米 + Y-up」坐标系，<code>pos/quat</code> 可直接使用
          （注意 MuJoCo 四元数是 <code>w x y z</code>，需转成 Three 的 <code>x y z w</code>）</li>
      <li>点击下方按钮可在 <code>INIT / STAND / SIT / FOLD</code> 等姿态间平滑过渡</li>
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

        let disposed = false;
        const loadingTip = document.createElement('div');
        loadingTip.textContent = '正在解析 MJCF 并加载 47 个 STL 零件…';
        loadingTip.style.cssText =
            'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;text-align:center;';
        container.appendChild(loadingTip);

        // 姿态切换按钮（左上角浮层）
        const ui = document.createElement('div');
        ui.style.cssText =
            'position:absolute;left:12px;top:12px;display:flex;flex-wrap:wrap;gap:6px;max-width:60%;';
        container.appendChild(ui);

        const stlLoader = new STLLoader();
        const geomCache = new Map<string, THREE.BufferGeometry>();

        let built: BuiltRobot | null = null;
        let keyframes: MjcfKeyframe[] = [];

        // 当前/目标关键帧（用于平滑插值）
        let currentQ: number[] = [];
        let targetQ: number[] = [];
        let currentRoot = {pos: new THREE.Vector3(), quat: new THREE.Quaternion()};
        let targetRoot = {pos: new THREE.Vector3(), quat: new THREE.Quaternion()};
        let transitioning = false;

        const loadMesh = async (_meshName: string, fileName: string): Promise<THREE.BufferGeometry> => {
            const cached = geomCache.get(fileName);
            if (cached) return cached;
            const url = STL_URLS[fileName];
            if (!url) throw new Error(`缺少 STL 导入：${fileName}`);
            const geom = await stlLoader.loadAsync(url);
            geomCache.set(fileName, geom);
            return geom;
        };

        const applyPose = (qpos: number[], rootPos: THREE.Vector3, rootQuat: THREE.Quaternion) => {
            if (!built) return;
            built.root.position.copy(rootPos);
            built.root.quaternion.copy(rootQuat);
            for (let i = 0; i < built.jointOrder.length; i++) {
                const pivot = built.jointOrder[i];
                const axis = (pivot.userData.axis as THREE.Vector3) ?? new THREE.Vector3(0, 0, 1);
                pivot.quaternion.setFromAxisAngle(axis, qpos[i] ?? 0);
            }
        };

        const selectKeyframe = (idx: number) => {
            const kf = keyframes[idx];
            if (!kf) return;
            // 初始化 currentQ（首次）
            if (currentQ.length === 0) {
                currentQ = [0, ...kf.jointValues];
                currentRoot.pos.copy(kf.rootPos);
                currentRoot.quat.copy(kf.rootQuat);
            }
            targetQ = [0, ...kf.jointValues];
            targetRoot.pos.copy(kf.rootPos);
            targetRoot.quat.copy(kf.rootQuat);
            transitioning = true;
        };

        const model = parseMjcf(robotXml);
        keyframes = model.keyframes;

        buildRobot(model, loadMesh, paletteFor)
            .then((b) => {
                if (disposed) {
                    disposeObject3D(b.root);
                    return;
                }
                built = b;
                ctx.scene.add(b.root);
                loadingTip.remove();

                // 姿态按钮
                keyframes.forEach((kf, idx) => {
                    const btn = document.createElement('button');
                    btn.textContent = kf.name;
                    btn.style.cssText =
                        'padding:4px 10px;border:1px solid #334155;border-radius:6px;background:#1e293b;color:#e2e8f0;font-size:12px;cursor:pointer;';
                    btn.onclick = () => selectKeyframe(idx);
                    ui.appendChild(btn);
                });
                // 默认摆到 STAND（若存在），否则 INIT
                const standIdx = keyframes.findIndex((k) => k.name === 'STAND');
                selectKeyframe(standIdx >= 0 ? standIdx : 0);
            })
            .catch((err) => {
                if (disposed) return;
                loadingTip.textContent = '模型构建失败';
                console.error(err);
            });

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            if (built && transitioning) {
                const t = 0.12; // 插值系数（每帧逼近）
                for (let i = 0; i < targetQ.length; i++) {
                    currentQ[i] += (targetQ[i] - currentQ[i]) * t;
                }
                currentRoot.pos.lerp(targetRoot.pos, t);
                currentRoot.quat.slerp(targetRoot.quat, t);
                applyPose(currentQ, currentRoot.pos, currentRoot.quat);
                const done =
                    Math.abs(targetQ[targetQ.length - 1] - currentQ[currentQ.length - 1]) < 1e-4 &&
                    currentRoot.pos.distanceTo(targetRoot.pos) < 1e-4;
                if (done) transitioning = false;
            }
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            disposed = true;
            cancelAnimationFrame(raf);
            controls.dispose();
            pmrem.dispose();
            loadingTip.remove();
            ui.remove();
            geomCache.forEach((g) => g.dispose());
        });
    },
};
