import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup} from '../helper';
import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const rapierDescription = `
  <h2>Rapier 物理引擎</h2>
  <p>本例演示在 Three.js 中集成 <b>Rapier</b>（基于 Rust/wasm 的高性能物理引擎）。</p>
  <p>逻辑流程：</p>
  <ol>
    <li>调用 <code>await RAPIER.init()</code> 异步加载物理引擎内核；</li>
    <li>创建 <code>World</code> 并设置重力 <code>world.gravity = { x:0, y:-9.81, z:0 }</code>；</li>
    <li>为每个 Three.js 网格创建对应的刚体（<code>RigidBodyDesc</code>）与碰撞体（<code>ColliderDesc</code>）；</li>
    <li>每帧调用 <code>world.step()</code> 推进物理，再把刚体的 <code>translation / rotation</code> 同步到网格。</li>
  </ol>
  <p>场景中：地面为<b>固定刚体</b>（static），彩色立方体为<b>动态刚体</b>（dynamic），受重力下落并相互堆叠碰撞。点击「重置」可让所有方块重新从高处落下。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 包，wasm 已内联为 base64，无需额外 Vite 配置即可直接运行。</p>
`;

export const rapierPhysics: Lesson = {
    id: 'physics/rapier',
    title: 'Rapier 物理引擎',
    description: rapierDescription,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(7, 6, 9);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 1, 0);

        // 光照：环境光提供整体基础亮度，平行光模拟主光源（太阳光）
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        ctx.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1.8);
        dir.position.set(6, 10, 4);
        ctx.scene.add(dir);
        // 让主平行光跟随相机方向，保证正对视角的面始终被照亮，
        // 避免滚轮拉近/旋转后看到背光暗面而显得「变暗」
        const syncLightToCamera = () => {
            const dirVec = new THREE.Vector3();
            camera.getWorldDirection(dirVec);
            dir.position.copy(camera.position).addScaledVector(dirVec, -10);
            dir.target.position.copy(camera.position).addScaledVector(dirVec, 10);
            dir.target.updateMatrixWorld();
        };
        syncLightToCamera();

        // 地面网格（仅用于显示）
      const groundGeo = new THREE.BoxGeometry(20, 0.5, 20);
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.9});
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.position.y = -0.25;
        ctx.scene.add(groundMesh);

        let raf = 0;
        // 在 `create` 返回之后全局可见，供清理逻辑判断资源归属
        let world: RAPIER.World | null = null;
        let paramPanel: ReturnType<typeof createParamPanel> | null = null;
        let axes: LabeledAxesHelper | null = null;
        const dynamicObjs: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

        // 带文字标签的坐标轴辅助器：红=X, 绿=Y, 蓝=Z，便于对照重力面板的轴方向
        axes = new LabeledAxesHelper(3);
        // 抬高一点点，避免 X/Z 轴与地面顶面共面而被遮挡（否则低角度看会缺一段）
        axes.position.y = 0.05;
        ctx.scene.add(axes);

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const RAPIER_NS = await import('@dimforge/rapier3d-compat');
            const R = RAPIER_NS;

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 地面：固定刚体 + 立方体碰撞体
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
          w.createCollider(R.ColliderDesc.cuboid(10, 0.25, 10), groundBody);

            const colors = [0xff5d5d, 0xffb84d, 0xffe65d, 0x5dff8f, 0x5dc8ff, 0xb45dff, 0xff5dd6];
            const spawn = (count: number) => {
                for (let i = 0; i < count; i++) {
                    const size = 0.8 + Math.random() * 0.6;
                    const x = (Math.random() - 0.5) * 6;
                    const z = (Math.random() - 0.5) * 6;
                    const y = 4 + i * 1.2;

                    const geo = new THREE.BoxGeometry(size, size, size);
                    const mat = new THREE.MeshStandardMaterial({
                        color: colors[i % colors.length],
                        roughness: 0.4,
                        metalness: 0.1,
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    ctx.scene.add(mesh);

                    const body = w.createRigidBody(
                        R.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation(randomQuat()),
                    );
                    w.createCollider(R.ColliderDesc.cuboid(size / 2, size / 2, size / 2), body);

                    dynamicObjs.push({body, mesh});
                }
            };

            const reSpawn = () => {
                for (const {body} of dynamicObjs) w.removeRigidBody(body);
                dynamicObjs.forEach(({mesh}) => {
                    ctx.scene.remove(mesh);
                    mesh.geometry.dispose();
                    (mesh.material as THREE.Material).dispose();
                });
                dynamicObjs.length = 0;
                spawn(7);
            };

            // 参数面板：标题「参数 CONTROLS」，固定显示重力向量 (gx, gy, gz)，不可修改
            const gravity = w.gravity;
            paramPanel = createParamPanel({
                container,
                controls: [
                    {
                        type: 'display',
                        key: 'gx',
                        label: 'X',
                        min: gravity.x,
                        max: gravity.x,
                        step: 0.01,
                        value: gravity.x
                    },
                    {
                        type: 'display',
                        key: 'gy',
                        label: 'Y',
                        min: gravity.y,
                        max: gravity.y,
                        step: 0.01,
                        value: gravity.y
                    },
                    {
                        type: 'display',
                        key: 'gz',
                        label: 'Z',
                        min: gravity.z,
                        max: gravity.z,
                        step: 0.01,
                        value: gravity.z
                    },
                ],
                defaults: {gx: gravity.x, gy: gravity.y, gz: gravity.z},
            });
            // 在标题与 XYZ 行之间插入「重力向量」文字标签
            const gLabel = document.createElement('div');
            gLabel.className = 'control-group-title';
            gLabel.style.marginTop = '6px';
            gLabel.textContent = '重力向量';
            paramPanel.el.insertBefore(gLabel, paramPanel.el.children[1]);
            // 底部重放按钮
            paramPanel.addControlGroup({
                title: '',
                items: [
                    {
                        label: '重放',
                        active: () => false,
                        onClick: () => reSpawn(),
                    },
                ],
            });

            spawn(7);

            const clock = new THREE.Clock();
            const loop = () => {
                raf = requestAnimationFrame(loop);
                const dt = Math.min(clock.getDelta(), 1 / 30);
                w.step();
                for (const {body, mesh} of dynamicObjs) {
                    const t = body.translation();
                    const r = body.rotation();
                    mesh.position.set(t.x, t.y, t.z);
                    mesh.quaternion.set(r.x, r.y, r.z, r.w);
                }
                orbit.update();
                syncLightToCamera();
                ctx.renderer.render(ctx.scene, camera);
                void dt;
            };
            loop();
        };

        run();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            orbit.dispose();
            paramPanel?.remove();
            world?.free();
            if (axes) {
                ctx.scene.remove(axes);
                axes.traverse((obj) => {
                    const anyObj = obj as unknown as {
                        geometry?: { dispose(): void };
                        material?: { dispose(): void } | { dispose(): void }[];
                    };
                    anyObj.geometry?.dispose();
                    const mat = anyObj.material;
                    if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                    else mat?.dispose();
                });
            }
            for (const {mesh} of dynamicObjs) {
                ctx.scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            }
            dynamicObjs.length = 0;
        });
    },
};

/** 生成随机初始朝向四元数（防止方块完美对齐，碰撞更自然） */
function randomQuat(): { x: number; y: number; z: number; w: number } {
    const ax = Math.random();
    const ay = Math.random();
    const az = Math.random();
    const angle = Math.random() * Math.PI;
    const s = Math.sin(angle / 2);
    return {x: ax * s, y: ay * s, z: az * s, w: Math.cos(angle / 2)};
}
