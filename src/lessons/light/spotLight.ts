import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../paramPanel';

export const spotLight: Lesson = {
    id: 'spot-light',
    title: 'SpotLight 聚光灯',
    description: `
    <h2>SpotLight 聚光灯</h2>
    <p>聚光灯像<b>手电筒 / 舞台灯</b>：从一个点向某个方向发射锥形光束，光照只覆盖锥体内部：</p>
    <pre><code>const spot = new THREE.SpotLight(0x7dd3fc, 80);
spot.position.set(0, 5, 0);
spot.angle = Math.PI / 8;   // 光锥半角
spot.penumbra = 0.3;        // 边缘柔化 0~1
spot.target = someObject;   // 照射目标
scene.add(spot);
scene.add(spot.target);     // target 也需加入场景</code></pre>
    <h3>常用属性</h3>
    <ul>
      <li><code>angle</code> 光锥半角（弧度），决定光斑大小</li>
      <li><code>penumbra</code> 边缘柔化程度，0 = 硬边，1 = 全模糊</li>
      <li><code>distance</code> 照射距离，0 表示无限远</li>
      <li><code>target</code> 照射目标，改变目标即可改变照射方向</li>
    </ul>
    <h3>观察要点</h3>
    <p>半透明锥体是 <code>SpotLightHelper</code>，标示光源位置与照射范围。拖动「光锥半角 / 边缘柔化」，观察光斑大小与边缘虚实的实时变化。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0b1120);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 3.5, 7);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const material = new THREE.MeshStandardMaterial({color: 0x94a3b8, roughness: 0.5});
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), material);
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);
        for (let i = 0; i < 4; i++) {
            const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
            box.position.set((i - 1.5) * 2, 0.4, (i % 2) * 2 - 1);
            ctx.scene.add(box);
        }

        // 微弱环境光，避免完全漆黑
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.08));

        const spot = new THREE.SpotLight(0x7dd3fc, 120);
        spot.position.set(3, 5, 0);
        spot.angle = Math.PI / 8;
        spot.penumbra = 0.35;
        const target = new THREE.Object3D();
        target.position.set(3, 0, 0);
        ctx.scene.add(target);
        spot.target = target;
        ctx.scene.add(spot);
        ctx.scene.add(new THREE.SpotLightHelper(spot));

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '光照强度',
                    min: 0,
                    max: 300,
                    step: 5,
                    value: 120,
                    desc: '聚光灯强度（candela，物理单位）',
                    precision: 0
                },
                {
                    key: 'angle',
                    label: '光锥半角（°）',
                    min: 5,
                    max: 60,
                    step: 1,
                    value: 22.5,
                    desc: '控制光斑大小（angle = π/8 约 22.5°）',
                    precision: 1
                },
                {
                    key: 'penumbra',
                    label: '边缘柔化',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: 0.35,
                    desc: '0 = 硬边缘，1 = 完全模糊',
                    precision: 2
                },
                {
                    key: 'distance',
                    label: '照射距离',
                    min: 0,
                    max: 30,
                    step: 0.5,
                    value: 0,
                    desc: '光照最远距离，0 表示无限远',
                    precision: 1
                },
                {
                    key: 'color',
                    label: '颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0x7dd3fc,
                    desc: '光的颜色'
                },
                {
                    key: 'targetX',
                    label: '目标 X',
                    min: -6,
                    max: 6,
                    step: 0.1,
                    value: 3,
                    desc: '照射目标在 X 方向的位置',
                    precision: 1
                },
            ],
            defaults: {intensity: 120, angle: 22.5, penumbra: 0.35, distance: 0, color: 0x7dd3fc, targetX: 3},
            onChange: (key, value) => {
                switch (key) {
                    case 'intensity':
                        spot.intensity = value;
                        break;
                    case 'angle':
                        spot.angle = THREE.MathUtils.degToRad(value);
                        break;
                    case 'penumbra':
                        spot.penumbra = value;
                        break;
                    case 'distance':
                        spot.distance = value;
                        break;
                    case 'color':
                        spot.color.setHex(value);
                        break;
                    case 'targetX':
                        target.position.x = value;
                        break;
                }
            },
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            panel.remove();
        });
    },
};
