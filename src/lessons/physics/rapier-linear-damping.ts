import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {BG_DARK_BLUE, createContext, makeCleanup, setSceneBackground} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const linearDampingDescription = `
  <h2>线性阻尼滑行</h2>
  <p>本例演示一个<b>立方体在四面墙围成的平面上滑行</b>。它带着一个<b>水平初速度</b>出发，靠墙反弹，最终因<b>线性阻尼（linearDamping）</b>逐渐慢下来并停下。</p>
  <p>核心变量是<b>线性阻尼</b>：它是一种「速度相关」的阻力，会让运动速度按指数衰减（<code>v *= (1 - damping·dt)</code> 近似）。阻尼越大，物体衰减越快、滑行距离越短；阻尼为 0 时，在完全光滑的平面上它将<b>永远匀速滑行、永不停止</b>。</p>
  <p>面板中两个滑块分别控制：</p>
  <ul>
    <li><b>初速度</b>：立方体出发时的水平速度大小（沿 +X 方向发射）。</li>
    <li><b>线性阻尼</b>：<code>setLinearDamping()</code> 的取值，实时作用于当前立方体。</li>
  </ul>
  <p>地面四周设有<b>四面矮墙（固定刚体）</b>，可接住立方体，使其在场内反复反弹、直观对比不同阻尼下的减速快慢。地面摩擦设得很低，以突出阻尼的作用。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 物理引擎：地面与四面墙为<b>固定刚体</b>，立方体为<b>动态刚体</b>，每帧 <code>world.step()</code> 后同步位姿。</p>
`;

export const linearDamping: Lesson = {
    id: 'physics/linear-damping',
    title: '线性阻尼滑行',
    description: linearDampingDescription,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 16, 22);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 0.5, 0);

        // 光照
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        ctx.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1.8);
        dir.position.set(6, 10, 4);
        ctx.scene.add(dir);
        const syncLightToCamera = () => {
            const dirVec = new THREE.Vector3();
            camera.getWorldDirection(dirVec);
            dir.position.copy(camera.position).addScaledVector(dirVec, -10);
            dir.target.position.copy(camera.position).addScaledVector(dirVec, 10);
            dir.target.updateMatrixWorld();
        };
        syncLightToCamera();

        // 地面 + 四壁（仅显示）材质
        const floorSize = 24;
        const wallH = 1.6;       // 墙高
        const wallT = 0.4;       // 墙厚
        const SIZE = 1.2;        // 立方体边长
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.95});
        const wallMat = new THREE.MeshStandardMaterial({color: 0x2b3a52, roughness: 0.95});

        // 水平地面
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        // 四面墙：沿 +X / -X / +Z / -Z，固定在地面边缘（仅显示）
        const wallDefs: { pos: [number, number, number]; size: [number, number, number] }[] = [
            {pos: [floorSize / 2, wallH / 2, 0], size: [wallT, wallH, floorSize]},
            {pos: [-floorSize / 2, wallH / 2, 0], size: [wallT, wallH, floorSize]},
            {pos: [0, wallH / 2, floorSize / 2], size: [floorSize, wallH, wallT]},
            {pos: [0, wallH / 2, -floorSize / 2], size: [floorSize, wallH, wallT]},
        ];
        const wallMeshes: THREE.Mesh[] = [];
        for (const {pos, size} of wallDefs) {
            const m = new THREE.Mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), wallMat);
            m.position.set(pos[0], pos[1], pos[2]);
            ctx.scene.add(m);
            wallMeshes.push(m);
        }

        let raf = 0;
        let world: RAPIER.World | null = null;
        let paramPanel: ReturnType<typeof createParamPanel> | null = null;
        let axes: LabeledAxesHelper | null = null;
        const dynamicObjs: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

        axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0;
        ctx.scene.add(axes);

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const R = await import('@dimforge/rapier3d-compat');

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 摩擦系数：设得很低，让「线性阻尼」而非摩擦主导减速过程
            const friction = 0.05;
            // 初速度：沿 +X 方向发射（滑块控制）
            let initSpeed = 8;
            // 线性阻尼（滑块控制），实时作用于当前立方体
            let linearDamping = 0.3;

            // 地面：固定刚体 + 立方体碰撞体
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2)
                    .setRestitution(0.9)
                    .setFriction(friction),
                groundBody,
            );

            // 四面墙：固定刚体，与可视网格位置/尺寸保持一致
            for (const {pos, size} of wallDefs) {
                const wallBody = w.createRigidBody(
                    R.RigidBodyDesc.fixed().setTranslation(pos[0], pos[1], pos[2]),
                );
                w.createCollider(
                    R.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setRestitution(0.9).setFriction(friction),
                    wallBody,
                );
            }

            // 立方体：固定尺寸，统一材质
            const spawn = () => {
                const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
                const mat = new THREE.MeshStandardMaterial({
                    color: 0x5dc8ff,
                    roughness: 0.4,
                    metalness: 0.1,
                });
                const mesh = new THREE.Mesh(geo, mat);
                ctx.scene.add(mesh);

                // 初始姿态：平放、无旋转，避免一开始翻滚
                const q = {x: 0, y: 0, z: 0, w: 1};
                const body = w.createRigidBody(
                    R.RigidBodyDesc.dynamic()
                        .setTranslation(0, SIZE / 2, 0)
                        .setRotation(q)
                        .setLinearDamping(linearDamping)
                        .setAngularDamping(0.6),
                );
                const collider = R.ColliderDesc.cuboid(SIZE / 2, SIZE / 2, SIZE / 2)
                    .setRestitution(0.9)
                    .setFriction(friction);
                w.createCollider(collider, body);

                // 赋予水平初速度（沿 +X 方向）
                body.setLinvel({x: initSpeed, y: 0, z: 0}, true);

                dynamicObjs.push({body, mesh});
            };

            const reSpawn = () => {
                for (const {body} of dynamicObjs) w.removeRigidBody(body);
                dynamicObjs.forEach(({mesh}) => {
                    ctx.scene.remove(mesh);
                    mesh.geometry.dispose();
                    (mesh.material as THREE.Material).dispose();
                });
                dynamicObjs.length = 0;
                spawn();
            };

            const gravity = w.gravity;
            // 默认参数：重置按钮会把所有控件恢复为这些值
            const defaults = {
                gx: gravity.x, gy: gravity.y, gz: gravity.z,
                initSpeed, linearDamping,
            };
            paramPanel = createParamPanel({
                container,
                resettable: true,
                controls: [
                    {
                        type: 'group',
                        label: '重力向量',
                        children: [
                            {type: 'readonly', key: 'gx', label: 'X', value: gravity.x, labelColor: 'var(--pp-axis-x)'},
                            {type: 'readonly', key: 'gy', label: 'Y', value: gravity.y, labelColor: 'var(--pp-axis-y)'},
                            {type: 'readonly', key: 'gz', label: 'Z', value: gravity.z, labelColor: 'var(--pp-axis-z)'},
                        ],
                    },
                    {
                        type: 'range',
                        key: 'initSpeed',
                        label: '初速度',
                        min: 0,
                        max: 20,
                        step: 0.5,
                        value: initSpeed,
                        precision: 1,
                        desc: '立方体出发时的水平速度大小（沿 +X 方向发射），调大滑得更远、撞墙更猛',
                    },
                    {
                        type: 'range',
                        key: 'linearDamping',
                        label: '线性阻尼',
                        min: 0,
                        max: 3,
                        step: 0.05,
                        value: linearDamping,
                        precision: 2,
                        desc: '速度相关阻力：0 永远匀速滑行，越大衰减越快、滑行距离越短',
                    },
                ],
                defaults,
                onReset: () => {
                    initSpeed = 8;
                    linearDamping = 0.3;
                    paramPanel?.setDisplay('initSpeed', initSpeed);
                    paramPanel?.setDisplay('linearDamping', linearDamping);
                    // 同步到当前立方体
                    const obj = dynamicObjs[0];
                    if (obj) {
                        obj.body.setLinearDamping(linearDamping);
                        obj.body.setLinvel({x: initSpeed, y: 0, z: 0}, true);
                    }
                    reSpawn();
                },
                onChange: (key, value) => {
                    if (key === 'initSpeed') {
                        initSpeed = value;
                        // 回到原点、以新初速度重新发射
                        reSpawn();
                    }
                    if (key === 'linearDamping') {
                        linearDamping = value;
                        // 回到原点、以新线性阻尼重新发射
                        reSpawn();
                    }
                },
            });

            // 底部重放按钮：让立方体重新从起点带初速度发射
            paramPanel.addControlGroup({
                title: '',
                items: [
                    {
                        label: '重放',
                        active: () => false,
                        onClick: () => reSpawn(),
                        color: 'var(--pp-danger)',
                        activeColor: 'var(--pp-danger)',
                    },
                ],
            });

            // 进入即播放
            reSpawn();

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
            ctx.scene.remove(floorMesh);
            floorMesh.geometry.dispose();
            (floorMesh.material as THREE.Material).dispose();
            // 清理四面墙
            for (const m of wallMeshes) {
                ctx.scene.remove(m);
                m.geometry.dispose();
                (m.material as THREE.Material).dispose();
            }
        });
    },
};
