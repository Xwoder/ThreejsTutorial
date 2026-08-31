import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_BLUE} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const dominoDescription = `
  <h2>多米诺骨牌</h2>
  <p>本例在<b>四面有墙的平面</b>中沿一条<b>连续的蛇形（S 型）路径</b>摆好 50 张多米诺骨牌。点击<b>开始</b>推倒第一张，触发连锁倒塌；点击<b>重置</b>让所有骨牌恢复直立。</p>
  <p><b>为什么必须沿「连续路径」摆放？</b></p>
  <p>多米诺靠「前一张倒下时撞到后一张」传递。如果生硬地换行——上一行最后一张沿 +X 倒，而下一行第一张在 Z 方向偏移了一整行——两者根本碰不到，<b>链条会在拐弯处断掉</b>。</p>
  <p>所以这里把整个 S 型看成<b>一条连续曲线</b>：直线段（每行）+ 半圆掉头弯（行与行之间），再沿曲线<b>按等弧长</b>取点摆放。弯道处骨牌方向<b>平滑旋转</b>，倒下的方向也随之逐渐转向，连锁才不会断。</p>
  <p><b>实现要点：</b></p>
  <ul>
    <li><b>路径</b>：<code>直线 → 半圆掉头 → 直线 → 半圆掉头 → …</code>。掉头弯的<b>圆心恒定在 +Z 侧</b>（保证始终向下一行推进），而<b>绕行方向左右交替</b>（否则会原路折返）。</li>
    <li><b>骨牌朝向</b>：骨牌是扁平长方体 <code>BoxGeometry(厚, 高, 宽)</code>，<b>厚度方向（局部 +X）就是倒塌方向</b>。摆放时把局部 +X 旋转对齐到路径切线，即绕 Y 轴转 <code>φ = atan2(-tz, tx)</code>。</li>
    <li><b>间距</b>：相邻骨牌沿路径的弧长间距要<b>大于厚度</b>（否则初始就挤在一起），又要<b>小于骨牌高度</b>（否则倒下够不到下一张）。这里厚 0.15、高 0.8、间距 0.5。</li>
    <li><b>弯道半径</b>：半径太小，相邻骨牌在弯道上的转角过大就会推空。这里取 1.0，对应相邻骨牌转角约 28°。</li>
    <li><b>场地</b>：先让路径总弧长恰好等于骨牌铺满所需长度 <code>(COUNT-1)×间距</code>，最后一张正好落在路径终点；再由骨牌包围盒反推地面尺寸（因此是矩形而非正方形）。</li>
    <li>地面与四面墙是<b>固定刚体</b>（fixed），骨牌是<b>动态刚体</b>（dynamic）；骨牌低弹性（<code>restitution</code> 小）+ 较高摩擦，倒下后不弹跳，倒塌更连贯。</li>
    <li><b>开始</b>：对第 0 张骨牌在<b>质心上方</b>沿其朝向施加一次冲量（<code>applyImpulseAtPoint</code>），产生翻转力矩把它推倒。</li>
    <li><b>重置</b>：把每张骨牌的位姿恢复到初始值，并清零线速度/角速度。</li>
  </ul>
  <p>每帧 <code>world.step()</code> 后把刚体的 <code>translation / rotation</code> 同步到网格，实现「物理驱动渲染」。</p>
`;

// 骨牌尺寸（局部坐标：厚沿 X = 倒塌方向，高沿 Y，宽沿 Z）
const DOMINO_T = 0.15;  // 厚
const DOMINO_H = 0.8;   // 高
const DOMINO_W = 0.4;   // 宽

// 摆放参数
const COUNT = 50;       // 骨牌数量
const ROWS = 3;         // S 型的行数
const SPACING = 0.5;    // 相邻骨牌沿路径的弧长间距
const TURN_R = 1.0;     // 掉头弯半径（行间距 = 2 × TURN_R）
const MARGIN = 1.0;     // 骨牌到墙的内边距

/** 二维向量（XZ 平面） */
type Vec2 = { x: number; z: number };

/** 标准 2D 旋转 */
const rot2 = (v: Vec2, a: number): Vec2 => ({
    x: v.x * Math.cos(a) - v.z * Math.sin(a),
    z: v.x * Math.sin(a) + v.z * Math.cos(a),
});

/** 路径采样点：位置 p、单位切线 t、累计弧长 s */
type Sample = { p: Vec2; t: Vec2; s: number };

/**
 * 生成蛇形（S 型）路径的密集采样点：直线段 → 半圆掉头弯 → 直线段 → …
 *
 * 关键点：掉头弯的<b>圆心恒定在 +Z 侧</b>（即始终往下一行推进），
 * 而<b>绕行方向左右交替</b>——若两者都固定，第二个弯会把路径原路折返回去。
 */
const sampleSerpentine = (rows: number, rowLen: number, R: number, step = 0.02): Sample[] => {
    const samples: Sample[] = [];
    let p: Vec2 = {x: 0, z: 0};
    let d: Vec2 = {x: 1, z: 0};   // 初始方向 +X
    let arc = 0;
    samples.push({p: {...p}, t: {...d}, s: arc});

    for (let r = 0; r < rows; r++) {
        // 直线段
        const n = Math.max(1, Math.round(rowLen / step));
        const segLen = rowLen / n;
        for (let i = 0; i < n; i++) {
            p = {x: p.x + d.x * segLen, z: p.z + d.z * segLen};
            arc += segLen;
            samples.push({p: {...p}, t: {...d}, s: arc});
        }
        if (r === rows - 1) break;

        // 半圆掉头弯：圆心在 +Z 侧，绕行方向交替（+1 / -1），终点方向反向、Z 前进 2R
        const c: Vec2 = {x: p.x, z: p.z + R};
        const u: Vec2 = {x: 0, z: -R};            // = p - c
        const dir = r % 2 === 0 ? 1 : -1;         // 交替左右绕行，形成蛇形
        const m = Math.max(2, Math.round((Math.PI * R) / step));
        const da = Math.PI / m;
        for (let i = 1; i <= m; i++) {
            const rv = rot2(u, dir * da * i);
            p = {x: c.x + rv.x, z: c.z + rv.z};
            d = rot2(d, dir * da);
            arc += R * da;
            samples.push({p: {...p}, t: {...d}, s: arc});
        }
    }
    return samples;
};

/** 沿路径按等弧长取点 */
const placeAlongPath = (samples: Sample[], count: number, spacing: number) => {
    const out: { p: Vec2; t: Vec2 }[] = [];
    let idx = 0;
    for (let i = 0; i < count; i++) {
        const target = i * spacing;
        while (idx < samples.length - 2 && samples[idx + 1].s < target) idx++;
        const a = samples[idx];
        const b = samples[idx + 1];
        const seg = b.s - a.s;
        const k = seg > 1e-6 ? Math.min(1, Math.max(0, (target - a.s) / seg)) : 0;
        const tx = a.t.x + (b.t.x - a.t.x) * k;
        const tz = a.t.z + (b.t.z - a.t.z) * k;
        const len = Math.hypot(tx, tz) || 1;
        out.push({
            p: {x: a.p.x + (b.p.x - a.p.x) * k, z: a.p.z + (b.p.z - a.p.z) * k},
            t: {x: tx / len, z: tz / len},
        });
    }
    return out;
};

export const domino: Lesson = {
    id: 'physics/dominoes',
    title: '多米诺骨牌',
    description: dominoDescription,
    create(container) {
        // ---- 先算布局（纯数学，不依赖物理世界），场地尺寸由布局反推 ----
        // 让路径总弧长恰好等于骨牌铺满所需长度，最后一张正好落在路径终点
        const totalArc = (COUNT - 1) * SPACING;
        const turnArc = (ROWS - 1) * Math.PI * TURN_R;
        const rowLen = Math.max((totalArc - turnArc) / ROWS, SPACING); // 每行直线段长度

        const raw = placeAlongPath(sampleSerpentine(ROWS, rowLen, TURN_R), COUNT, SPACING);

        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
        for (const it of raw) {
            minX = Math.min(minX, it.p.x);
            maxX = Math.max(maxX, it.p.x);
            minZ = Math.min(minZ, it.p.z);
            maxZ = Math.max(maxZ, it.p.z);
        }
        // 平移到原点居中
        const cx = (minX + maxX) / 2;
        const cz = (minZ + maxZ) / 2;
        const pad = Math.max(DOMINO_W, DOMINO_T) / 2 + 0.1;
        // 地面尺寸（矩形）：由骨牌包围盒 + 内边距反推
        const floorX = Math.ceil(maxX - minX + pad * 2 + MARGIN * 2);
        const floorZ = Math.ceil(maxZ - minZ + pad * 2 + MARGIN * 2);

        // 每张骨牌：位置、朝向四元数、世界空间的倒塌方向
        const layout = raw.map((it) => {
            // 让骨牌局部 +X（厚度方向 = 倒塌方向）对齐路径切线 (tx, tz)。
            // 绕 Y 轴转 φ 时 (1,0,0) → (cosφ, 0, -sinφ)，故 φ = atan2(-tz, tx)。
            const phi = Math.atan2(-it.t.z, it.t.x);
            return {
                pos: new THREE.Vector3(it.p.x - cx, DOMINO_H / 2, it.p.z - cz),
                quat: {x: 0, y: Math.sin(phi / 2), z: 0, w: Math.cos(phi / 2)},
                forward: new THREE.Vector3(it.t.x, 0, it.t.z),
            };
        });

        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
        camera.position.set(0, Math.max(floorX, floorZ) * 0.95, Math.max(floorX, floorZ) * 1.25);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 0.3, 0);

        // 光照
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        ctx.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1.8);
        dir.position.set(6, 10, 4);
        ctx.scene.add(dir);
        // 主平行光跟随相机，避免旋转后看到背光暗面
        const syncLightToCamera = () => {
            const dirVec = new THREE.Vector3();
            camera.getWorldDirection(dirVec);
            dir.position.copy(camera.position).addScaledVector(dirVec, -10);
            dir.target.position.copy(camera.position).addScaledVector(dirVec, 10);
            dir.target.updateMatrixWorld();
        };
        syncLightToCamera();

        // 容器（地面 + 四面墙）网格，仅用于显示
        const wallH = 1.2;
        const wallT = 0.3;
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.9});
        const wallMat = new THREE.MeshStandardMaterial({color: 0x2b3a52, roughness: 0.9});

        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorX, 0.5, floorZ), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        // 四面墙：沿 ±X / ±Z 固定在地面边缘（±X 侧多出 wallT 以填满角落）
        const wallDefs: { pos: [number, number, number]; size: [number, number, number] }[] = [
            {pos: [floorX / 2, wallH / 2, 0], size: [wallT, wallH, floorZ + wallT]},
            {pos: [-floorX / 2, wallH / 2, 0], size: [wallT, wallH, floorZ + wallT]},
            {pos: [0, wallH / 2, floorZ / 2], size: [floorX, wallH, wallT]},
            {pos: [0, wallH / 2, -floorZ / 2], size: [floorX, wallH, wallT]},
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

        // 骨牌记录：刚体、网格、初始位姿（用于重置）、倒塌方向
        type Domino = {
            body: RAPIER.RigidBody;
            mesh: THREE.Mesh;
            initPos: { x: number; y: number; z: number };
            initQuat: { x: number; y: number; z: number; w: number };
            forward: THREE.Vector3;
        };
        const dominoes: Domino[] = [];

        axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0.05;
        ctx.scene.add(axes);

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const R = await import('@dimforge/rapier3d-compat');

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 地面：固定刚体
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorX / 2, 0.25, floorZ / 2).setRestitution(0.1).setFriction(0.8),
                groundBody,
            );
            // 四面墙：固定刚体
            for (const {pos, size} of wallDefs) {
                const wallBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(pos[0], pos[1], pos[2]));
                w.createCollider(
                    R.ColliderDesc.cuboid(size[0] / 2, size[1] / 2, size[2] / 2).setRestitution(0.1).setFriction(0.8),
                    wallBody,
                );
            }

            const colors = [0xff5d5d, 0xffb84d, 0xffe65d, 0x5dff8f, 0x5dc8ff, 0xb45dff, 0xff5dd6, 0x5dffd6];
            const geo = new THREE.BoxGeometry(DOMINO_T, DOMINO_H, DOMINO_W);

            const spawn = () => {
                for (let i = 0; i < layout.length; i++) {
                    const {pos, quat, forward} = layout[i];
                    const mat = new THREE.MeshStandardMaterial({
                        color: colors[i % colors.length],
                        roughness: 0.4,
                        metalness: 0.1,
                    });
                    const mesh = new THREE.Mesh(geo.clone(), mat);
                    mesh.position.copy(pos);
                    mesh.quaternion.set(quat.x, quat.y, quat.z, quat.w);
                    ctx.scene.add(mesh);

                    const body = w.createRigidBody(
                        R.RigidBodyDesc.dynamic()
                            .setTranslation(pos.x, pos.y, pos.z)
                            .setRotation(quat)
                            .setAngularDamping(0.05)
                            .setLinearDamping(0.05),
                    );
                    // 骨牌：低弹性 + 较高摩擦，倒下后不弹跳，倒塌连贯
                    const collider = R.ColliderDesc.cuboid(DOMINO_T / 2, DOMINO_H / 2, DOMINO_W / 2)
                        .setRestitution(0.02)
                        .setFriction(0.7);
                    w.createCollider(collider, body);

                    dominoes.push({
                        body,
                        mesh,
                        initPos: {x: pos.x, y: pos.y, z: pos.z},
                        initQuat: {...quat},
                        forward: forward.clone(),
                    });
                }
            };

            // 重置：恢复初始位姿与朝向，并清零速度
            const resetDominoes = () => {
                for (const d of dominoes) {
                    d.body.setTranslation(d.initPos, true);
                    d.body.setRotation(d.initQuat, true);
                    d.body.setLinvel({x: 0, y: 0, z: 0}, true);
                    d.body.setAngvel({x: 0, y: 0, z: 0}, true);
                    d.mesh.position.set(d.initPos.x, d.initPos.y, d.initPos.z);
                    d.mesh.quaternion.set(d.initQuat.x, d.initQuat.y, d.initQuat.z, d.initQuat.w);
                }
            };

            // 开始：在第 0 张骨牌的质心上方沿其朝向施加一次冲量，产生翻转力矩把它推倒
            const startChain = () => {
                const first = dominoes[0];
                if (!first) return;
                const speed = 1.5;                 // 期望获得的质心速度 (m/s)
                const m = first.body.mass();       // 冲量 = 质量 × 速度变化，使力度不随骨牌尺寸漂移
                const t = first.body.translation();
                first.body.applyImpulseAtPoint(
                    {x: first.forward.x * m * speed, y: 0, z: first.forward.z * m * speed},
                    {x: t.x, y: t.y + DOMINO_H * 0.35, z: t.z}, // 作用点在质心上方，形成翻倒力矩
                    true,
                );
            };

            spawn();

            paramPanel = createParamPanel({
                container,
                resettable: false,
                controls: [
                    {
                        type: 'group',
                        label: '摆放参数',
                        children: [
                            {type: 'readonly', key: 'count', label: '骨牌数', value: COUNT},
                            {type: 'readonly', key: 'rows', label: '行数', value: ROWS},
                            {type: 'readonly', key: 'spacing', label: '间距', value: SPACING},
                            {type: 'readonly', key: 'turnR', label: '弯道半径', value: TURN_R},
                        ],
                    },
                ],
                defaults: {count: COUNT, rows: ROWS, spacing: SPACING, turnR: TURN_R},
            });

            // 底部按钮组：开始 / 重置
            paramPanel.addControlGroup({
                title: '',
                items: [
                    {
                        label: '开始',
                        active: () => false,
                        onClick: () => startChain(),
                        color: 'var(--pp-primary)',
                        activeColor: 'var(--pp-primary)',
                    },
                    {
                        label: '重置',
                        active: () => false,
                        onClick: () => resetDominoes(),
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
                for (const d of dominoes) {
                    const t = d.body.translation();
                    const r = d.body.rotation();
                    d.mesh.position.set(t.x, t.y, t.z);
                    d.mesh.quaternion.set(r.x, r.y, r.z, r.w);
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
            for (const d of dominoes) {
                ctx.scene.remove(d.mesh);
                d.mesh.geometry.dispose();
                (d.mesh.material as THREE.Material).dispose();
            }
            dominoes.length = 0;
            for (const m of [floorMesh, ...wallMeshes]) {
                ctx.scene.remove(m);
                m.geometry.dispose();
                (m.material as THREE.Material).dispose();
            }
        });
    },
};
