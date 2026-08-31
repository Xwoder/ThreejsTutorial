import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_BLUE} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const slidingDescription = `
  <h2>斜面滑动</h2>
  <p>本例演示一个<b>方块从斜面上滑下</b>，滑到平面后继续向前，最终因摩擦与阻尼停下。</p>
  <p>核心变量有两个：碰撞体的<b>摩擦系数（friction）</b>与刚体的<b>阻尼（damping）</b>。</p>
  <ul>
    <li><b>摩擦系数</b>：描述接触面间的「涩滞」程度（0 = 完全光滑、几乎不减速，越大越「涩」、越快停下）。本例由「摩擦系数」滑块统一驱动方块、斜面与地面。</li>
    <li><b>线性阻尼 / 角阻尼</b>：模拟空气 / 黏滞阻力，<b>不依赖摩擦</b>，只要有速度就会持续衰减速度直至停下。设为 0 即关闭阻尼。</li>
  </ul>
  <p>把「摩擦系数」与「线性阻尼」都拉到 0，就是<b>理想无摩擦、无阻尼</b>的极端情形：方块滑上水平面后会永远匀速前进、永不停止。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 物理引擎：斜面与水平地面为<b>固定刚体</b>，方块为<b>动态刚体</b>。斜面由一个旋转的固定长方体充当，靠重力沿斜面分量驱动方块下滑。</p>
  <ul>
    <li><b>摩擦 <code>setFriction()</code></b>：本例由「摩擦系数」滑块统一驱动，同时作用于方块、斜面与地面碰撞体。</li>
    <li><b>阻尼 <code>setLinearDamping()</code> / <code>setAngularDamping()</code></b>：由对应滑块实时驱动动态方块刚体。</li>
    <li><b>恢复系数 <code>setRestitution()</code></b>：本例设得很低（0.05），让方块落地后几乎不弹、专注表现滑动。</li>
    <li><b>旋转的固定刚体</b>：斜面通过 <code>RigidBodyDesc.fixed().setRotation(quat)</code> 倾斜放置，碰撞体随之倾斜。</li>
  </ul>
`;

export const sliding: Lesson = {
    id: 'physics/sliding',
    title: '斜面滑动',
    description: slidingDescription,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(10, 8, 14);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(-2, 1.5, 0);

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

        // 地面 + 斜面（仅显示）材质
        const floorSize = 30;
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.95});
        const rampMat = new THREE.MeshStandardMaterial({color: 0x2b3a52, roughness: 0.95});

        // 水平地面
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        // 斜面参数
        const RAMP_LEN = 10;      // 斜面长度（沿斜面方向）
        const RAMP_THICK = 0.4;   // 斜面厚度
        const RAMP_WIDTH = 5;     // 斜面宽度（Z 方向）
        const RAMP_ANGLE = THREE.MathUtils.degToRad(25); // 倾角
        const rampCenter: [number, number, number] = [
            1 - (RAMP_LEN / 2) * Math.cos(RAMP_ANGLE),
            (RAMP_LEN / 2) * Math.sin(RAMP_ANGLE),
            0,
        ];
        // 绕 Z 轴顺时针旋转 -angle，使斜面从高处(左)向低处(右)下降
        // 注意：rapier3d-compat 的 setRotation 必须传四元数对象 {x,y,z,w}，不能 spread 四个数字
        const rampQuat = (() => {
            const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, -RAMP_ANGLE));
            return {x: q.x, y: q.y, z: q.z, w: q.w};
        })();

        const rampMesh = new THREE.Mesh(
            new THREE.BoxGeometry(RAMP_LEN, RAMP_THICK, RAMP_WIDTH),
            rampMat,
        );
        rampMesh.position.set(...rampCenter);
        rampMesh.quaternion.set(rampQuat.x, rampQuat.y, rampQuat.z, rampQuat.w);
        ctx.scene.add(rampMesh);

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

            // 摩擦系数：由「摩擦强度」滑块统一驱动，同时作用于方块 / 斜面 / 地面碰撞体
            let friction = 0.2;
            // 阻尼：模拟空气/黏滞阻力，不依赖摩擦，有速度就会持续衰减速度直至停下
            let linearDamping = 0.1;
            let angularDamping = 0.1;

            // 地面：固定刚体 + 立方体碰撞体
            // 地面摩擦也跟随 friction 变量，这样 friction=0 时组合摩擦真正为 0（完全光滑）
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2)
                    .setRestitution(0.05)
                    .setFriction(friction),
                groundBody,
            );

            // 斜面：固定刚体 + 旋转后的立方体碰撞体
            // 注意：斜面摩擦也要跟随 friction 变量，否则与方块摩擦取平均后
            // （Rapier 默认平均组合）会远大于 tan(倾角)，导致方块停在斜面上不下滑。
            const rampBody = w.createRigidBody(
                R.RigidBodyDesc.fixed().setTranslation(...rampCenter).setRotation(rampQuat),
            );
            const rampCollider = w.createCollider(
                R.ColliderDesc.cuboid(RAMP_LEN / 2, RAMP_THICK / 2, RAMP_WIDTH / 2)
                    .setRestitution(0.05)
                    .setFriction(friction),
                rampBody,
            );

            // 根据摩擦系数创建方块网格与刚体（碰撞体）
            const spawn = () => {
                const s = 1.2;
                // 沿斜面上段（朝向顶端、左上方向）放置，并沿斜面法线 (sinθ, cosθ) 抬高半个厚度+半个边长，
                // 使方块正好落在斜面上表面，受重力沿斜面分量下滑。
                const d = RAMP_LEN / 2 - 1.4; // 距斜面中心、朝顶端方向的距离
                const nx = Math.sin(RAMP_ANGLE); // 斜面法线 X
                const ny = Math.cos(RAMP_ANGLE); // 斜面法线 Y
                const spawnX = rampCenter[0] - d * Math.cos(RAMP_ANGLE) + nx * (RAMP_THICK / 2 + s / 2);
                const spawnY = rampCenter[1] + d * Math.sin(RAMP_ANGLE) + ny * (RAMP_THICK / 2 + s / 2);

                const geo = new THREE.BoxGeometry(s, s, s);
                const mat = new THREE.MeshStandardMaterial({
                    color: 0x5dc8ff,
                    roughness: 0.4,
                    metalness: 0.1,
                });
                const mesh = new THREE.Mesh(geo, mat);
                ctx.scene.add(mesh);

                const body = w.createRigidBody(
                    R.RigidBodyDesc.dynamic()
                        .setTranslation(spawnX, spawnY, 0)
                        // 让方块姿态与斜面一致，平稳贴在斜面上再下滑
                        .setRotation(rampQuat)
                        // 阻尼：线性阻尼衰减平移速度（让方块最终停下），角阻尼衰减旋转速度
                        .setLinearDamping(linearDamping)
                        .setAngularDamping(angularDamping),
                );
                // 方块与斜面使用同一摩擦系数，保证「摩擦强度」整体生效
                const collider = R.ColliderDesc.cuboid(s / 2, s / 2, s / 2)
                    .setRestitution(0.05)
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
                spawn();
            };

            const gravity = w.gravity;
            // 默认参数：重置按钮会把所有控件恢复为这些值
            const defaults = {
                gx: gravity.x, gy: gravity.y, gz: gravity.z,
                friction, linearDamping, angularDamping,
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
                        // 摩擦强度：滑块直接修改 friction（方块与斜面 / 地面碰撞体的摩擦系数）
                        type: 'range',
                        key: 'friction',
                        label: '摩擦系数',
                        min: 0,
                        max: 0.4,
                        step: 0.01,
                        value: friction,
                        precision: 2,
                        desc: '方块与斜面 / 地面的摩擦系数：0 完全光滑、滑得又快又远，越大越「涩」、很快减速静止',
                    },
                    {
                        // 线性阻尼：衰减平移速度，越大越快停下；0 表示无阻尼（仅靠摩擦减速）
                        type: 'range',
                        key: 'linearDamping',
                        label: '线性阻尼',
                        min: 0,
                        max: 1,
                        step: 0.01,
                        value: linearDamping,
                        precision: 2,
                        desc: '衰减方块平移速度（类似空气阻力）：0 表示永不因阻尼停下，越大越快静止',
                    },
                    {
                        // 角阻尼：衰减旋转速度（本例方块几乎不转，影响很小）
                        type: 'range',
                        key: 'angularDamping',
                        label: '角阻尼',
                        min: 0,
                        max: 1,
                        step: 0.01,
                        value: angularDamping,
                        precision: 2,
                        desc: '衰减方块旋转速度：0 表示旋转不受黏滞阻力',
                    },
                ],
                defaults,
                onReset: () => {
                    // 恢复所有内部变量到初始默认值
                    friction = 0.2;
                    linearDamping = 0.1;
                    angularDamping = 0.1;
                    // 同步滑块显示值回默认
                    paramPanel?.setDisplay('friction', friction);
                    paramPanel?.setDisplay('linearDamping', linearDamping);
                    paramPanel?.setDisplay('angularDamping', angularDamping);
                    // 同步到物理对象
                    rampCollider.setFriction(friction);
                    groundBody.collider(0)?.setFriction(friction);
                    const obj = dynamicObjs[0];
                    if (obj) {
                        obj.body.collider(0).setFriction(friction);
                        obj.body.setLinearDamping(linearDamping);
                        obj.body.setAngularDamping(angularDamping);
                    }
                    // 重新从斜面顶端滑下，回到初始演示状态
                    reSpawn();
                },
                onChange: (key, value) => {
                    if (key === 'friction') {
                        friction = value;
                        // 实时更新方块 / 斜面 / 地面的摩擦系数（Rapier 默认取两者平均，
                        // 三者都改才能保证 friction=0 时组合摩擦真正为 0）
                        const obj = dynamicObjs[0];
                        if (obj) obj.body.collider(0).setFriction(friction);
                        rampCollider.setFriction(friction);
                        groundBody.collider(0)?.setFriction(friction);
                    } else if (key === 'linearDamping') {
                        linearDamping = value;
                        dynamicObjs[0]?.body.setLinearDamping(linearDamping);
                    } else if (key === 'angularDamping') {
                        angularDamping = value;
                        dynamicObjs[0]?.body.setAngularDamping(angularDamping);
                    }
                },
            });

            // 底部重放按钮：让方块重新从斜面顶端滑下
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
            ctx.scene.remove(rampMesh);
            rampMesh.geometry.dispose();
            (rampMesh.material as THREE.Material).dispose();
        });
    },
};
