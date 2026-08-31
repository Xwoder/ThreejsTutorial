import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {BG_DARK_BLUE, createContext, makeCleanup, setSceneBackground} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const forceDescription = `
  <h2>力与移动</h2>
  <p>本例演示如何用<b>力（Force）</b>让一个<b>立方体在平面上移动</b>。立方体初始静止，通过施加力获得动量并开始运动。</p>
  <p>Rapier 提供两种常用施力方式：</p>
  <ul>
    <li><b>冲量 Impulse</b>：一次性的瞬时动量改变（<code>applyImpulse</code>），让静止物体立刻获得一个速度。</li>
    <li><b>持续力 Force</b>：在多个物理步中持续作用（<code>addForce</code>），让物体<b>持续加速</b>，直到停止施力。</li>
  </ul>
  <p>面板中两个滑块分别控制：</p>
  <ul>
    <li><b>力大小</b>：持续力模式下每步沿 +X 方向施加的力。</li>
    <li><b>冲量大小</b>：点击「施加冲量」时沿 +X 方向一次性施加的冲量。</li>
  </ul>
  <p>两个按钮：<b>施加冲量</b>让立方体瞬间弹出；<b>持续施力</b>开启后立方体在 +X 方向不断加速（再次点击关闭）。<b>重放</b>把立方体放回原点静止。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 物理引擎：地面为<b>固定刚体</b>，立方体为<b>动态刚体</b>，每帧 <code>world.step()</code> 后同步位姿。线性阻尼设为 0，摩擦正常，便于观察力与加速度的关系。</p>
`;

export const force: Lesson = {
    id: 'physics/force',
    title: '力与移动',
    description: forceDescription,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 12, 18);
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

        // 地面（仅显示）材质
        const floorSize = 40;
        const SIZE = 1.5;        // 立方体边长
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.95});

        // 水平地面
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        let raf = 0;
        let world: RAPIER.World | null = null;
        let paramPanel: ReturnType<typeof createParamPanel> | null = null;
        let axes: LabeledAxesHelper | null = null;
        const dynamicObjs: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

        axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0.05;
        ctx.scene.add(axes);

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const R = await import('@dimforge/rapier3d-compat');

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            const friction = 0.6;
            // 力大小（滑块控制）：持续力模式下沿 +X 施加
            let forceMag = 20;
            // 冲量大小（滑块控制）：点击「施加冲量」时沿 +X 施加
            let impulseMag = 15;
            // 持续施力开关
            let forceOn = false;

            // 地面：固定刚体
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2)
                    .setRestitution(0.2)
                    .setFriction(friction),
                groundBody,
            );

            const spawn = () => {
                const geo = new THREE.BoxGeometry(SIZE, SIZE, SIZE);
                const mat = new THREE.MeshStandardMaterial({
                    color: 0x5dc8ff,
                    roughness: 0.4,
                    metalness: 0.1,
                });
                const mesh = new THREE.Mesh(geo, mat);
                ctx.scene.add(mesh);

                const q = {x: 0, y: 0, z: 0, w: 1};
                const body = w.createRigidBody(
                    R.RigidBodyDesc.dynamic()
                        .setTranslation(0, SIZE / 2, 0)
                        .setRotation(q)
                        .setLinearDamping(0)
                        .setAngularDamping(0.6),
                );
                const collider = R.ColliderDesc.cuboid(SIZE / 2, SIZE / 2, SIZE / 2)
                    .setRestitution(0.2)
                    .setFriction(friction);
                w.createCollider(collider, body);

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
                forceOn = false;
                spawn();
            };

            // 施加一次冲量（沿 +X）
            const applyImpulseOnce = () => {
                const obj = dynamicObjs[0];
                if (obj) obj.body.applyImpulse({x: impulseMag, y: 0, z: 0}, true);
            };

            // 持续力：开启时施加一次（持续生效），关闭时清除
            const setForceOn = (on: boolean) => {
                forceOn = on;
                const obj = dynamicObjs[0];
                if (!obj) return;
                if (on) {
                    obj.body.resetForces(true);
                    obj.body.addForce({x: forceMag, y: 0, z: 0}, true);
                } else {
                    obj.body.resetForces(true);
                }
            };

            const gravity = w.gravity;
            const defaults = {
                gx: gravity.x, gy: gravity.y, gz: gravity.z,
                forceMag, impulseMag,
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
                        key: 'forceMag',
                        label: '力大小',
                        min: 0,
                        max: 50,
                        step: 1,
                        value: forceMag,
                        precision: 0,
                        desc: '持续力模式下沿 +X 方向每步施加的力；越大加速越快',
                    },
                    {
                        type: 'range',
                        key: 'impulseMag',
                        label: '冲量大小',
                        min: 0,
                        max: 40,
                        step: 1,
                        value: impulseMag,
                        precision: 0,
                        desc: '点击「施加冲量」时沿 +X 方向一次性施加的冲量，让静止立方体瞬间弹出',
                    },
                ],
                defaults,
                onReset: () => {
                    forceMag = 20;
                    impulseMag = 15;
                    paramPanel?.setDisplay('forceMag', forceMag);
                    paramPanel?.setDisplay('impulseMag', impulseMag);
                    reSpawn();
                },
                onChange: (key, value) => {
                    if (key === 'forceMag') {
                        forceMag = value;
                        // 若正在持续施力，用新力大小更新
                        if (forceOn) {
                            const obj = dynamicObjs[0];
                            if (obj) {
                                obj.body.resetForces(true);
                                obj.body.addForce({x: forceMag, y: 0, z: 0}, true);
                            }
                        }
                    }
                    if (key === 'impulseMag') {
                        impulseMag = value;
                    }
                },
            });

            // 底部按钮组
            paramPanel.addControlGroup({
                title: '',
                items: [
                    {
                        label: '施加冲量',
                        active: () => false,
                        onClick: () => applyImpulseOnce(),
                        color: 'var(--pp-danger)',
                        activeColor: 'var(--pp-danger)',
                    },
                    {
                        label: '持续施力',
                        active: () => forceOn,
                        onClick: () => setForceOn(!forceOn),
                        color: 'var(--pp-primary)',
                        activeColor: 'var(--pp-primary)',
                    },
                    {
                        label: '重放',
                        active: () => false,
                        onClick: () => reSpawn(),
                        color: 'var(--pp-danger)',
                        activeColor: 'var(--pp-danger)',
                    },
                ],
            });

            // 进入即播放（静止于原点）
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
        });
    },
};
