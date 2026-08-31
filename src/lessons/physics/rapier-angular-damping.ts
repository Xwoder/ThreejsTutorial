import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {BG_DARK_BLUE, createContext, makeCleanup, setSceneBackground} from '../helper';

import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type RAPIER from '@dimforge/rapier3d-compat';

const angularDampingDescription = `
  <h2>角阻尼旋转</h2>
  <p>本例演示一个<b>球体在平面上绕 Y 轴旋转</b>。它带着一个<b>初始角速度</b>出发，靠地面的微小摩擦慢慢衰减，最终因<b>角阻尼（angularDamping）</b>停止转动。</p>
  <p>核心变量是<b>角阻尼</b>：它作用于旋转速度，让角速度按指数衰减（<code>ω *= (1 - damping·dt)</code> 近似）。阻尼越大，球体转得越慢、越快停下；阻尼为 0 时，在完全光滑的平面上它将<b>永远匀速旋转、永不停止</b>。</p>
  <p>面板上两个滑块分别控制：</p>
  <ul>
    <li><b>角速度</b>：球体出发时绕 Y 轴旋转的角速度大小（弧度/秒）。</li>
    <li><b>角阻尼</b>：<code>setAngularDamping()</code> 的取值，实时作用于当前球体。</li>
  </ul>
  <p>地面上画了一道<b>标记线</b>，方便肉眼观察球体的自转。地面摩擦设得很低，以突出角阻尼的作用。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 物理引擎：地面为<b>固定刚体</b>，球体为<b>动态刚体</b>，每帧 <code>world.step()</code> 后同步位姿。</p>
`;

export const angularDamping: Lesson = {
    id: 'physics/angular-damping',
    title: '角阻尼旋转',
    description: angularDampingDescription,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 10, 14);
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
        const floorSize = 20;
        const RADIUS = 1.2;       // 球半径
        const groundMat = new THREE.MeshStandardMaterial({color: 0x223044, roughness: 0.95});

        // 水平地面
        const floorMesh = new THREE.Mesh(new THREE.BoxGeometry(floorSize, 0.5, floorSize), groundMat);
        floorMesh.position.y = -0.25;
        ctx.scene.add(floorMesh);

        let raf = 0;
        let world: RAPIER.World | null = null;
        let paramPanel: ReturnType<typeof createParamPanel> | null = null;
        let axes: LabeledAxesHelper | null = null;
        let patternTexture: THREE.Texture | null = null;
        const dynamicObjs: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

        axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0.05;
        ctx.scene.add(axes);

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const R = await import('@dimforge/rapier3d-compat');

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 摩擦系数：设得很低，让「角阻尼」而非摩擦主导减速过程
            const friction = 0.05;
            // 初始角速度：绕 Y 轴旋转（滑块控制）
            let initAngVel = 8;
            // 角阻尼（滑块控制），实时作用于当前球体
            let angularDamping = 0.3;

            // 地面：固定刚体 + 立方体碰撞体
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
            w.createCollider(
                R.ColliderDesc.cuboid(floorSize / 2, 0.25, floorSize / 2)
                    .setRestitution(0.5)
                    .setFriction(friction),
                groundBody,
            );

            // 用 canvas 生成一张随机斑纹纹理，让球体自转可见
            const makePatternTexture = () => {
                const size = 256;
                const canvas = document.createElement('canvas');
                canvas.width = size;
                canvas.height = size;
                const g = canvas.getContext('2d')!;
                // 底色
                g.fillStyle = '#5dc8ff';
                g.fillRect(0, 0, size, size);
                // 随机斑块
                for (let i = 0; i < 60; i++) {
                    const x = Math.random() * size;
                    const y = Math.random() * size;
                    const r = 6 + Math.random() * 22;
                    const hue = Math.floor(Math.random() * 360);
                    g.fillStyle = `hsla(${hue}, 70%, 55%, 0.85)`;
                    g.beginPath();
                    g.arc(x, y, r, 0, Math.PI * 2);
                    g.fill();
                }
                // 随机短线条增加细节
                g.lineWidth = 3;
                for (let i = 0; i < 40; i++) {
                    const x = Math.random() * size;
                    const y = Math.random() * size;
                    const len = 10 + Math.random() * 30;
                    const ang = Math.random() * Math.PI;
                    g.strokeStyle = `hsla(${Math.floor(Math.random() * 360)}, 60%, 35%, 0.7)`;
                    g.beginPath();
                    g.moveTo(x, y);
                    g.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
                    g.stroke();
                }
                const tex = new THREE.CanvasTexture(canvas);
                tex.colorSpace = THREE.SRGBColorSpace;
                return tex;
            };
            patternTexture = makePatternTexture();

            // 球体：固定半径
            const spawn = () => {
                const geo = new THREE.SphereGeometry(RADIUS, 32, 24);
                const mat = new THREE.MeshStandardMaterial({
                    map: patternTexture,
                    roughness: 0.4,
                    metalness: 0.1,
                });
                const mesh = new THREE.Mesh(geo, mat);
                ctx.scene.add(mesh);

                // 初始姿态：无旋转；线性阻尼设为 0，避免平移干扰观察自转
                const q = {x: 0, y: 0, z: 0, w: 1};
                const body = w.createRigidBody(
                    R.RigidBodyDesc.dynamic()
                        .setTranslation(0, RADIUS, 0)
                        .setRotation(q)
                        .setLinearDamping(1.5)
                        .setAngularDamping(angularDamping),
                );
                const collider = R.ColliderDesc.ball(RADIUS)
                    .setRestitution(0.5)
                    .setFriction(friction);
                w.createCollider(collider, body);

                // 赋予绕 Y 轴的初始角速度
                body.setAngvel({x: 0, y: initAngVel, z: 0}, true);

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
                initAngVel, angularDamping,
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
                        key: 'initAngVel',
                        label: '角速度',
                        min: 0,
                        max: 20,
                        step: 0.5,
                        value: initAngVel,
                        precision: 1,
                        desc: '球体出发时绕 Y 轴的角速度大小（弧度/秒），调大转得更快',
                    },
                    {
                        type: 'range',
                        key: 'angularDamping',
                        label: '角阻尼',
                        min: 0,
                        max: 3,
                        step: 0.05,
                        value: angularDamping,
                        precision: 2,
                        desc: '旋转相关阻力：0 永远匀速旋转，越大衰减越快、越快停下',
                    },
                ],
                defaults,
                onReset: () => {
                    initAngVel = 8;
                    angularDamping = 0.3;
                    paramPanel?.setDisplay('initAngVel', initAngVel);
                    paramPanel?.setDisplay('angularDamping', angularDamping);
                    reSpawn();
                },
                onChange: (key, value) => {
                    if (key === 'initAngVel') {
                        initAngVel = value;
                        // 回到原点、以新角速度重新发射
                        reSpawn();
                    }
                    if (key === 'angularDamping') {
                        angularDamping = value;
                        // 回到原点、以新角阻尼重新发射
                        reSpawn();
                    }
                },
            });

            // 底部重放按钮：让球体重新从原点带角速度旋转
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
            if (patternTexture) {
                patternTexture.dispose();
                patternTexture = null;
            }
        });
    },
};
