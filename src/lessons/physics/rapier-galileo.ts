import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_BLUE} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const galileoDescription = `
  <h2>伽利略落体实验</h2>
  <p>本例用 <b>Rapier</b> 物理引擎重现伽利略在比萨斜塔做的落体实验：两个<b>质量不同</b>的球从同一高度自由下落，观察它们是否同时落地。</p>
  <p>实验设置：</p>
  <ul>
    <li><b>倾斜的圆柱</b>代表比萨斜塔（绕 Z 轴倾斜约 8°，仅作视觉参考，固定不动）；</li>
    <li>塔顶同时释放<b>大球（半径 0.5m、质量 10kg）</b>与<b>小球（半径 0.28m、质量 2kg）</b>；</li>
    <li>两者起始高度相同，初速度为零，只受重力 <code>g = 9.81 m/s²</code>。</li>
  </ul>
  <p><b>结论：</b>在忽略空气阻力时，自由落体的加速度与质量无关（<code>a = g</code>），因此大球与小球会<b>同时落地</b>。点击「开始下落」释放两球，观察落地时刻与面板计时。</p>
  <p><b>用到的 Rapier 知识点：</b></p>
  <ul>
    <li><b>固定刚体（fixed）</b>：斜塔与地面不参与动力学，质量视为无穷大；</li>
    <li><b>动态刚体 + 附加质量</b>：<code>RigidBodyDesc.dynamic().setAdditionalMass(m)</code> 直接指定刚体质量（覆盖由密度算出的质量），从而让 10kg 与 2kg 两球质量不同；</li>
    <li><b>球碰撞体</b>：<code>ColliderDesc.ball(r)</code>，配合低恢复系数（<code>setRestitution(0)</code>）避免落地弹跳干扰观察；</li>
    <li><b>重力与步进</b>：<code>world.gravity = {x:0, y:-9.81, z:0}</code>，每帧 <code>world.step()</code> 后把刚体位姿同步到网格。</li>
  </ul>
`;

export const galileo: Lesson = {
    id: 'physics/galileo',
    title: '伽利略落体',
    description: galileoDescription,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
        camera.position.set(45, 42, 62);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 26, 0);

        // 光照：环境光 + 跟随相机的主平行光
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

        // 地面（平面）：box 网格 + 固定刚体碰撞体，顶面位于 y=0
        const floorSize = 30;
        const floorMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.95});
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), floorMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        const grid = new THREE.GridHelper(floorSize, floorSize, 0x3b506e, 0x1e2c40);
        grid.position.y = 0.001;
        ctx.scene.add(grid);

        // 带文字标签的坐标轴辅助器
        const axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0;
        ctx.scene.add(axes);

        // 比萨斜塔：倾斜的圆柱（含底座、塔身、塔顶平台），纯视觉 + 固定碰撞体
        const TOWER_H = 55;         // 塔身高度
        const TOWER_R = 0.6;        // 塔身半径
        const TOWER_LEAN = THREE.MathUtils.degToRad(8); // 倾斜角度（绕 Z 轴）
        const towerGroup = new THREE.Group();
        towerGroup.rotation.z = TOWER_LEAN;
        const stoneMat = new THREE.MeshStandardMaterial({color: 0xcdbfa3, roughness: 0.85, metalness: 0.05});
        const stoneDark = new THREE.MeshStandardMaterial({color: 0xb6a784, roughness: 0.9});

        // 底座
        const baseMesh = new THREE.Mesh(new THREE.CylinderGeometry(TOWER_R * 1.6, TOWER_R * 1.8, 0.4, 28), stoneDark);
        baseMesh.position.y = 0.2;
        towerGroup.add(baseMesh);
        // 塔身（几何体原点设在底部，使 y∈[0, TOWER_H]）
        const shaftMesh = new THREE.Mesh(
            new THREE.CylinderGeometry(TOWER_R, TOWER_R * 1.1, TOWER_H, 28).translate(0, TOWER_H / 2, 0),
            stoneMat,
        );
        towerGroup.add(shaftMesh);
        // 塔顶平台（装饰，无碰撞体）
        const topMesh = new THREE.Mesh(new THREE.CylinderGeometry(TOWER_R * 1.5, TOWER_R * 1.2, 0.4, 28), stoneDark);
        topMesh.position.y = TOWER_H + 0.2;
        towerGroup.add(topMesh);
        ctx.scene.add(towerGroup);

        // 塔顶中心在世界坐标中的位置（group 位于原点，绕 Z 旋转）：( -H sinθ, H cosθ, 0 )
        const topX = -TOWER_H * Math.sin(TOWER_LEAN);
        const topY = TOWER_H * Math.cos(TOWER_LEAN);

        let raf = 0;
        let world: RAPIER.World | null = null;
        let paramPanel: ReturnType<typeof createParamPanel> | null = null;

        // 两球定义：大球 10kg、小球 2kg，沿 Z 轴分置塔顶两侧（避免与塔身/彼此重叠）
        const ballDefs = [
            {name: '大球', radius: 0.5, mass: 10, color: 0xff5d5d, z: 1.3},
            {name: '小球', radius: 0.28, mass: 2, color: 0x5dc8ff, z: -1.3},
        ];
        // 两球起始高度一致，保证同时释放、同时落地
        const startY = topY + 0.6;
        type Ball = {
            def: typeof ballDefs[number];
            mesh: THREE.Mesh;
            body: RAPIER.RigidBody | null;
            startPos: { x: number; y: number; z: number };
            landed: boolean;
        };
        const balls: Ball[] = [];

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const R = await import('@dimforge/rapier3d-compat');

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 地面：固定刚体 + 立方体碰撞体（顶面 y=0）
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2).setRestitution(0).setFriction(0.6),
                groundBody,
            );

            // 斜塔：固定刚体 + 圆柱碰撞体（仅塔身参与碰撞；用 setRotation 传四元数）
            const tbody = w.createRigidBody(
                R.RigidBodyDesc.fixed()
                    .setTranslation(0, 0, 0)
                    .setRotation({x: 0, y: 0, z: Math.sin(TOWER_LEAN / 2), w: Math.cos(TOWER_LEAN / 2)}),
            );
            w.createCollider(
                R.ColliderDesc.cylinder(TOWER_H / 2, TOWER_R).setRestitution(0).setFriction(0.6),
                tbody,
            );

            // 创建两球的可视网格，初始停在塔顶（此时尚无物理刚体）
            for (const def of ballDefs) {
                const mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(def.radius, 32, 20),
                    new THREE.MeshStandardMaterial({color: def.color, roughness: 0.35, metalness: 0.2}),
                );
                const startPos = {x: topX, y: startY, z: def.z};
                mesh.position.set(startPos.x, startPos.y, startPos.z);
                ctx.scene.add(mesh);
                balls.push({def, mesh, body: null, startPos, landed: false});
            }

            let started = false;
            let elapsed = 0;

            const startDrop = () => {
                // 清掉旧刚体，把网格复位到塔顶
                for (const b of balls) {
                    if (b.body) w.removeRigidBody(b.body);
                    b.body = null;
                    b.landed = false;
                    b.mesh.position.set(b.startPos.x, b.startPos.y, b.startPos.z);
                }
                // 在塔顶创建动态刚体，用 setAdditionalMass 指定质量
                for (const b of balls) {
                    const body = w.createRigidBody(
                        R.RigidBodyDesc.dynamic()
                            .setTranslation(b.startPos.x, b.startPos.y, b.startPos.z)
                            .setAdditionalMass(b.def.mass),
                    );
                    w.createCollider(
                        R.ColliderDesc.ball(b.def.radius).setRestitution(0).setFriction(0.6),
                        body,
                    );
                    b.body = body;
                }
                started = true;
                elapsed = 0;
                paramPanel?.setDisplay('status', '下落中');
                paramPanel?.setDisplay('time', '0.00');
            };

            // 参数面板：实验说明 + 质量信息 + 状态/计时 + 开始按钮
            const gravity = w.gravity;
            paramPanel = createParamPanel({
                container,
                resettable: false,
                controls: [
                    {
                        type: 'group',
                        label: '实验说明',
                        children: [
                            {
                                type: 'readonly',
                                key: 'm1',
                                label: '大球质量',
                                value: '10 kg',
                                labelColor: 'var(--pp-axis-x)'
                            },
                            {
                                type: 'readonly',
                                key: 'm2',
                                label: '小球质量',
                                value: '2 kg',
                                labelColor: 'var(--pp-axis-z)'
                            },
                            {
                                type: 'readonly',
                                key: 'g',
                                label: '重力 g',
                                value: gravity.y,
                                labelColor: 'var(--pp-axis-y)'
                            },
                        ],
                    },
                    {type: 'readonly', key: 'status', label: '状态', value: '待开始'},
                    {type: 'readonly', key: 'time', label: '下落时间', value: '0.00'},
                ],
                defaults: {m1: '10 kg', m2: '2 kg', g: gravity.y, status: '待开始', time: '0.00'},
            });
            // 重置：清除物理刚体、把两球复位到塔顶、计时与状态归零
            const reset = () => {
                started = false;
                elapsed = 0;
                for (const b of balls) {
                    if (b.body) w.removeRigidBody(b.body);
                    b.body = null;
                    b.landed = false;
                    b.mesh.position.set(b.startPos.x, b.startPos.y, b.startPos.z);
                }
                paramPanel?.setDisplay('status', '待开始');
                paramPanel?.setDisplay('time', '0.00');
            };

            paramPanel.addControlGroup({
                title: '控制',
                columns: 2,
                items: [
                    {
                        label: '开始',
                        active: () => false,
                        onClick: () => startDrop(),
                        // 用明亮的主题强调色作为文字/边框，确保深色面板上清晰可见
                        color: 'var(--pp-accent)',
                        activeColor: 'var(--pp-accent)',
                    },
                    {
                        label: '重置',
                        active: () => false,
                        onClick: () => reset(),
                        color: 'var(--pp-text)',
                        activeColor: 'var(--pp-text)',
                    },
                ],
            });

            const clock = new THREE.Clock();
            const loop = () => {
                raf = requestAnimationFrame(loop);
                const dt = Math.min(clock.getDelta(), 1 / 30);
                w.step();

                if (started) {
                    let allLanded = true;
                    for (const b of balls) {
                        if (!b.body) continue;
                        const t = b.body.translation();
                        const r = b.body.rotation();
                        b.mesh.position.set(t.x, t.y, t.z);
                        b.mesh.quaternion.set(r.x, r.y, r.z, r.w);
                        // 落地判定：球心高度接近半径（地面顶面 y=0）
                        if (!b.landed && t.y <= b.def.radius + 0.02) b.landed = true;
                        if (!b.landed) allLanded = false;
                    }
                    // 仅在所有球落地前累计下落时间；落地后冻结计时
                    if (!allLanded) {
                        elapsed += dt;
                        paramPanel?.setDisplay('time', elapsed.toFixed(2));
                    } else {
                        paramPanel?.setDisplay('status', '已落地');
                    }
                }

                orbit.update();
                syncLightToCamera();
                ctx.renderer.render(ctx.scene, camera);
            };
            loop();
        };

        run();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            orbit.dispose();
            paramPanel?.remove();
            world?.free();
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
            ctx.scene.remove(grid);
            grid.geometry.dispose();
            (grid.material as THREE.Material).dispose();
            for (const {mesh} of balls) {
                ctx.scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            }
            for (const m of [floorMesh, baseMesh, shaftMesh, topMesh]) {
                ctx.scene.remove(m);
                m.geometry.dispose();
                (m.material as THREE.Material).dispose();
            }
        });
    },
};
