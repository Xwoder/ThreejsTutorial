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
    id: 'physics/free-fall',
    title: '自由落体',
    description: rapierDescription,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(11, 9, 14);
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

        // 容器（地面 + 四面矮墙）网格，仅用于显示
        const floorSize = 20;   // 地面边长
        const wallH = 1.8;      // 墙高（不要太⾼）
        const wallT = 0.4;      // 墙厚
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.9});
        const wallMat = new THREE.MeshStandardMaterial({color: 0x2b3a52, roughness: 0.9});

        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        // 四面矮墙：沿 +X / -X / +Z / -Z，固定在地面边缘
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
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2).setRestitution(0.2).setFriction(0.8),
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

            const colors = [0xff5d5d, 0xffb84d, 0xffe65d, 0x5dff8f, 0x5dc8ff, 0xb45dff, 0xff5dd6];
            // 当前碰撞体形状：cube | ball | capsule | cylinder | cone | octa(八面体) | ico(二十面体体)
            const shapes = ['cube', 'ball', 'capsule', 'cylinder', 'cone', 'octa', 'ico'] as const;
            type Shape = (typeof shapes)[number];
            let currentShape: Shape = 'cube';

            // 每种形状的物理参数键值对：
            //   restitution 弹性（恢复系数）、friction 摩擦系数（0 无摩擦，越大越「涩」）、
            //   angularDamping 角阻尼（抑制旋转/滚动）、linearDamping 线阻尼（抑制平移）。
            // 胶囊体与球体同档：摩擦更高、阻尼更大，落地后能较快停下。
            const SHAPE_PHYSICS: Record<Shape, {
                restitution: number;
                friction: number;
                angularDamping: number;
                linearDamping: number
            }> = {
                cube: {restitution: 0.1, friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                ball: {restitution: 0.3, friction: 0.8, angularDamping: 1.5, linearDamping: 0.3},
                capsule: {restitution: 0.1, friction: 0.8, angularDamping: 1.5, linearDamping: 0.3},
                cylinder: {restitution: 0.1, friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                cone: {restitution: 0.1, friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                octa: {restitution: 0.1, friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
                ico: {restitution: 0.1, friction: 0.6, angularDamping: 0.6, linearDamping: 0.1},
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
                        const halfH = size / 2; // 圆柱段半高
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
                    case 'octa': {
                        const r = size / 2;
                        const oct = new THREE.OctahedronGeometry(r, 0);
                        geo = oct;
                        // 用几何体顶点构建凸包碰撞体，保证物理与外观一致
                        const pos = oct.getAttribute('position');
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
                        // 用几何体顶点构建凸包碰撞体，保证物理与外观一致
                        const pos = ico.getAttribute('position');
                        const verts = new Float32Array(pos.array.length);
                        verts.set(pos.array as Float32Array);
                        const hull = R.ColliderDesc.convexHull(verts);
                        collider = hull ?? R.ColliderDesc.ball(r);
                        break;
                    }
                }
                // 从形状参数表取弹性与摩擦
                collider.setRestitution(SHAPE_PHYSICS[currentShape].restitution);
                collider.setFriction(SHAPE_PHYSICS[currentShape].friction);
                return {geo, collider};
            };

            const spawn = (count: number) => {
                for (let i = 0; i < count; i++) {
                    const size = 0.8 + Math.random() * 0.6;
                    const x = (Math.random() - 0.5) * 6;
                    const z = (Math.random() - 0.5) * 6;
                    const y = 4 + i * 1.2;

                    const {geo, collider} = buildShape(R, size);
                    const mat = new THREE.MeshStandardMaterial({
                        color: colors[i % colors.length],
                        roughness: 0.4,
                        metalness: 0.1,
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    ctx.scene.add(mesh);

                    // 从形状参数表取阻尼（角阻尼抑制滚动/旋转，让球体/胶囊体落地后较快停下）
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
                resettable: false,
                controls: [
                    {
                        type: 'group',
                        label: '重力向量',
                        children: [
                            {
                                type: 'readonly',
                                key: 'gx',
                                label: 'X',
                                value: gravity.x,
                                labelColor: '#ff5d5d'
                            },
                            {
                                type: 'readonly',
                                key: 'gy',
                                label: 'Y',
                                value: gravity.y,
                                labelColor: '#5dff8f'
                            },
                            {
                                type: 'readonly',
                                key: 'gz',
                                label: 'Z',
                                value: gravity.z,
                                labelColor: '#5dc8ff'
                            },
                        ],
                    },
                ],
                defaults: {gx: gravity.x, gy: gravity.y, gz: gravity.z},
            });
            // 碰撞体形状切换标签（默认立方体），切换后重新生成落体
            const shapeGroup = paramPanel.addControlGroup({
                title: '碰撞体形状',
                items: shapes.map((s) => {
                    const labels: Record<Shape, string> = {
                        cube: '立方体',
                        ball: '球体',
                        capsule: '胶囊体',
                        cylinder: '圆柱体',
                        cone: '圆锥',
                        octa: '八面体',
                        ico: '二十面体体',
                    };
                    return {
                        label: labels[s],
                        active: () => currentShape === s,
                        onClick: () => {
                            currentShape = s;
                            shapeGroup.sync();
                            reSpawn();
                        },
                        color: '#5dc8ff',
                        activeColor: '#0f172a',
                    };
                }),
            });
            // 初始默认选中「立方体」按钮
            shapeGroup.sync();
            // 底部重放按钮
            paramPanel.addControlGroup({
                title: '',
                items: [
                    {
                        label: '重放',
                        active: () => false,
                        onClick: () => reSpawn(),
                        color: '#ff5d5d',
                        activeColor: '#ff5d5d',
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
            // 清理地面与四面墙
            for (const m of [floorMesh, ...wallMeshes]) {
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
