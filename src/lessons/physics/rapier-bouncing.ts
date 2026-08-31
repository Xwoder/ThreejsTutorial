import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_BLUE} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const bouncingDescription = `
  <h2>自由落体弹跳</h2>
  <p>本例演示一个物体从高处自由落下，落到平面上后<b>向上弹起</b>，并且<b>每次弹跳高度逐渐降低</b>，最终停在地面。</p>
  <p>核心机制是碰撞体的<b>恢复系数（restitution）</b>：它决定碰撞后保留多少法向速度（0 = 完全不弹，1 = 完全弹性、高度不衰减）。弹跳高度逐渐降低，正是恢复系数小于 1 时，每次碰撞都损失一部分动能导致的自然结果。</p>
  <p>场景中只有一个落体，可通过面板按钮切换形状（立方体 / 球体 / 胶囊体 / 圆柱 / 圆锥 / 四面体 / 八面体 / 十二面体 / 二十面体）。面板中的<b>「弹性强度」</b>滑块实时控制恢复系数，调大弹得更高、衰减更慢，调小则几乎不弹。地面四周设有四面矮墙（固定刚体），可接住侧向弹出的落体，防止其飞出场景。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 物理引擎，逻辑与「自由落体」一课一致：创建 <code>World</code> → 为每个网格挂刚体与碰撞体 → 每帧 <code>world.step()</code> 并同步位姿。</p>
  <ul>
    <li><b>恢复系数 <code>setRestitution()</code></b>：控制弹性大小，本例由「弹性强度」滑块统一驱动。</li>
    <li><b>摩擦 <code>setFriction()</code></b>：影响落体在平面上的滑动与旋转。</li>
    <li><b>阻尼 <code>setLinearDamping() / setAngularDamping()</code></b>：进一步抑制晃动，让物体尽快静止。</li>
  </ul>
`;

export const bouncing: Lesson = {
    id: 'physics/bouncing',
    title: '自由落体弹跳',
    description: bouncingDescription,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(8, 6, 11);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 1, 0);

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

        // 地面网格（仅显示）
        const floorSize = 20;
        const wallH = 1.8;      // 墙高
        const wallT = 0.4;      // 墙厚
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.9});
        const wallMat = new THREE.MeshStandardMaterial({color: 0x2b3a52, roughness: 0.9});

        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        // 四面矮墙：沿 +X / -X / +Z / -Z，固定在地面边缘（仅显示）
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
        axes.position.y = 0.05;
        ctx.scene.add(axes);

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const R = await import('@dimforge/rapier3d-compat');

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 地面：固定刚体 + 立方体碰撞体；恢复系数用统一变量 restitution
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2)
                    .setRestitution(0.2)
                    .setFriction(0.8),
                groundBody,
            );

            // 四面矮墙：固定刚体，与可视网格位置/尺寸保持一致
            for (const {pos, size} of wallDefs) {
                const wallBody = w.createRigidBody(
                    R.RigidBodyDesc.fixed().setTranslation(pos[0], pos[1], pos[2]),
                );
                w.createCollider(
                    R.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setRestitution(0.2).setFriction(0.8),
                    wallBody,
                );
            }

            // 形状列表：仅一个落体，可切换形状
            const shapes = ['cube', 'ball', 'capsule', 'cylinder', 'cone', 'tetra', 'octa', 'dodeca', 'ico'] as const;
            type Shape = (typeof shapes)[number];
            let currentShape: Shape = 'cube';

            // 弹性强度（恢复系数）：由面板滑块控制，范围 0~0.995
            let restitution = 0.9;

            // 每种形状的摩擦与阻尼（弹性统一由 restitution 控制）
            const SHAPE_PHYSICS: Record<Shape, {
                friction: number;
                angularDamping: number;
                linearDamping: number;
            }> = {
                cube: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                ball: {friction: 0.8, angularDamping: 1.5, linearDamping: 0.3},
                capsule: {friction: 0.8, angularDamping: 1.5, linearDamping: 0.3},
                cylinder: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                cone: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                tetra: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                octa: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                dodeca: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                ico: {friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
            };

            // 根据形状创建 Three.js 几何与 Rapier 碰撞体描述
            const buildShape = (R: typeof import('@dimforge/rapier3d-compat'), size: number) => {
                let geo: THREE.BufferGeometry;
                let collider: RAPIER.ColliderDesc;
                switch (currentShape) {
                    case 'ball': {
                        const r = size / 2;
                        geo = new THREE.SphereGeometry(r, 24, 16);
                        collider = R.ColliderDesc.ball(r);
                        break;
                    }
                    case 'capsule': {
                        const r = size / 2;
                        const halfH = size / 2;
                        geo = new THREE.CapsuleGeometry(r, halfH * 2, 8, 16);
                        collider = R.ColliderDesc.capsule(halfH, r);
                        break;
                    }
                    case 'cylinder': {
                        const r = size / 2;
                        const halfH = size / 2;
                        geo = new THREE.CylinderGeometry(r, r, size, 24);
                        collider = R.ColliderDesc.cylinder(halfH, r);
                        break;
                    }
                    case 'cone': {
                        const r = size / 2;
                        const h = size;
                        geo = new THREE.ConeGeometry(r, h, 24);
                        collider = R.ColliderDesc.cone(h / 2, r);
                        break;
                    }
                    case 'cube':
                    default: {
                        geo = new THREE.BoxGeometry(size, size, size);
                        collider = R.ColliderDesc.cuboid(size / 2, size / 2, size / 2);
                        break;
                    }
                    case 'tetra': {
                        const r = size / 2;
                        const tet = new THREE.TetrahedronGeometry(r, 0);
                        geo = tet;
                        const pos = tet.getAttribute('position');
                        const verts = new Float32Array(pos.array.length);
                        verts.set(pos.array as Float32Array);
                        const hull = R.ColliderDesc.convexHull(verts);
                        collider = hull ?? R.ColliderDesc.ball(r);
                        break;
                    }
                    case 'octa': {
                        const r = size / 2;
                        const oct = new THREE.OctahedronGeometry(r, 0);
                        geo = oct;
                        const pos = oct.getAttribute('position');
                        const verts = new Float32Array(pos.array.length);
                        verts.set(pos.array as Float32Array);
                        const hull = R.ColliderDesc.convexHull(verts);
                        collider = hull ?? R.ColliderDesc.ball(r);
                        break;
                    }
                    case 'dodeca': {
                        const r = size / 2;
                        const dod = new THREE.DodecahedronGeometry(r, 0);
                        geo = dod;
                        const pos = dod.getAttribute('position');
                        const verts = new Float32Array(pos.array.length);
                        verts.set(pos.array as Float32Array);
                        const hull = R.ColliderDesc.convexHull(verts);
                        collider = hull ?? R.ColliderDesc.ball(r);
                        break;
                    }
                    case 'ico': {
                        const r = size / 2;
                        const ico = new THREE.IcosahedronGeometry(r, 0);
                        geo = ico;
                        const pos = ico.getAttribute('position');
                        const verts = new Float32Array(pos.array.length);
                        verts.set(pos.array as Float32Array);
                        const hull = R.ColliderDesc.convexHull(verts);
                        collider = hull ?? R.ColliderDesc.ball(r);
                        break;
                    }
                }
                // 恢复系数由统一变量控制，实现「弹性强度」滑块实时生效
                collider.setRestitution(restitution);
                collider.setFriction(SHAPE_PHYSICS[currentShape].friction);
                return {geo, collider};
            };

            // 只生成一个落体；落点统一在中心上方，避免偏移
            const spawn = () => {
                const size = 1.2;
                const x = 0;
                const z = 0;
                const y = 6;

                const {geo, collider} = buildShape(R, size);
                const mat = new THREE.MeshStandardMaterial({
                    color: 0x5dc8ff,
                    roughness: 0.4,
                    metalness: 0.1,
                });
                const mesh = new THREE.Mesh(geo, mat);
                ctx.scene.add(mesh);

                const {angularDamping, linearDamping} = SHAPE_PHYSICS[currentShape];
                const body = w.createRigidBody(
                    R.RigidBodyDesc.dynamic()
                        .setTranslation(x, y, z)
                        .setRotation(randomQuat())
                        .setAngularDamping(angularDamping)
                        .setLinearDamping(linearDamping),
                );
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
            paramPanel = createParamPanel({
                container,
                resettable: false,
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
                        key: 'restitution',
                        label: 'restitution',
                        min: 0,
                        max: 1.5,
                        step: 0.01,
                        value: restitution,
                        precision: 3,
                        desc: '碰撞恢复系数：0 不弹，1 完全弹性，大于 1 每次弹得更高（能量注入）',
                    },
                ],
                defaults: {gx: gravity.x, gy: gravity.y, gz: gravity.z, restitution},
                onChange: (key, value) => {
                    if (key === 'restitution') {
                        restitution = value;
                        // 实时更新当前落体的恢复系数；下一次重放也沿用新值
                        const obj = dynamicObjs[0];
                        if (obj) {
                            const c = obj.body.collider(0);
                            c.setRestitution(restitution);
                        }
                    }
                },
            });

            // 形状切换按钮组
            const shapeGroup = paramPanel.addControlGroup({
                title: '碰撞体形状',
                items: shapes.map((s) => {
                    const labels: Record<Shape, string> = {
                        cube: '立方体',
                        ball: '球体',
                        capsule: '胶囊体',
                        cylinder: '圆柱体',
                        cone: '圆锥',
                        tetra: '四面体',
                        octa: '八面体',
                        dodeca: '十二面体',
                        ico: '二十面体',
                    };
                    return {
                        label: labels[s],
                        active: () => currentShape === s,
                        onClick: () => selectShape(s),
                        color: 'var(--pp-axis-z)',
                        activeColor: 'var(--pp-on-accent)',
                    };
                }),
            });
            const selectShape = (s: Shape) => {
                currentShape = s;
                shapeGroup.sync();
                reSpawn();
            };
            selectShape('cube');

            // 底部重放按钮：让落体重新从高处落下
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

/** 生成随机初始朝向四元数（防止方块完美对齐，碰撞更自然） */
function randomQuat(): { x: number; y: number; z: number; w: number } {
    const ax = Math.random();
    const ay = Math.random();
    const az = Math.random();
    const angle = Math.random() * Math.PI;
    const s = Math.sin(angle / 2);
    return {x: ax * s, y: ay * s, z: az * s, w: Math.cos(angle / 2)};
}
