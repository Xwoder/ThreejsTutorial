import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const pointLight: Lesson = {
    id: 'lights/point-light',
    title: 'PointLight 点光源',
    description: `
    <h2>PointLight 点光源</h2>
    <p>点光源像一个<b>灯泡</b>：从一个点向四周均匀发光，距离越远光线越暗（按距离的平方衰减）：</p>
    <pre><code>const light = new THREE.PointLight(0xff9f43, 30, 20);
//                                         颜色   强度  衰减距离
light.position.set(0, 2, 0);</code></pre>
    <h3>构造参数</h3>
    <ul>
      <li><code>color</code> 光的颜色</li>
      <li><code>intensity</code> 光照强度（new r155 起为物理单位 candela）</li>
      <li><code>distance</code> 光照衰减距离，0 表示无限远</li>
      <li><code>decay</code> 衰减系数（默认 2，即平方反比衰减）</li>
    </ul>
    <h3>观察要点</h3>
    <p>白色小球即光源本体（也可用 <code>PointLightHelper</code> 标示）。拖动「强度 / 衰减距离」观察光斑范围变化，或把「强度」调大让整片地面都亮起来。开启「自动环绕」可看到光随位置移动。</p>
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
        const boxColors = [0x60a5fa, 0xfbbf24, 0x34d399, 0xfb7185];
        for (let i = 0; i < 4; i++) {
            const box = new THREE.Mesh(
                new THREE.BoxGeometry(0.8, 0.8, 0.8),
                new THREE.MeshStandardMaterial({color: boxColors[i], roughness: 0.5})
            );
            box.position.set((i - 1.5) * 2, 0.4, (i % 2) * 2 - 1);
            ctx.scene.add(box);
        }

        // 微弱环境光，避免完全漆黑
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.08));

        const point = new THREE.PointLight(0xffffff, 30, 20);
        point.position.set(0, 3, 0);
        ctx.scene.add(point);
        const pointHelper = new THREE.PointLightHelper(point, 0.25);
        ctx.scene.add(pointHelper);

        const state = {orbit: true, height: 3};
        const clock = new THREE.Clock();
        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const t = clock.getElapsedTime();
            if (state.orbit) {
                point.position.set(Math.cos(t) * 3, state.height, Math.sin(t) * 3);
            }
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '光照强度',
                    min: 0,
                    max: 100,
                    step: 1,
                    value: 30,
                    desc: '点光源强度（candela，物理单位）',
                    precision: 0
                },
                {
                    key: 'distance',
                    label: '衰减距离',
                    min: 0,
                    max: 30,
                    step: 0.5,
                    value: 20,
                    desc: '光的照射半径，0 表示无限远',
                    precision: 1
                },
                {
                    key: 'color',
                    label: '颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0xffffff,
                    desc: '光的颜色'
                },
                {
                    key: 'height',
                    label: '高度 Y',
                    min: 0.5,
                    max: 6,
                    step: 0.1,
                    value: 3,
                    desc: '光源距离地面的高度',
                    precision: 1
                },
                {
                    key: 'orbit',
                    label: '自动环绕',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '光源绕场景中心旋转，观察光照随位置变化'
                },
                {
                    key: 'showHelper',
                    label: '显示 PointLightHelper',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '是否显示标示光源位置的小球辅助线'
                },
            ],
            defaults: {intensity: 30, distance: 20, color: 0xffffff, height: 3, orbit: 1, showHelper: 1},
            onChange: (key, value) => {
                switch (key) {
                    case 'intensity':
                        point.intensity = value;
                        break;
                    case 'distance':
                        point.distance = value;
                        break;
                    case 'color':
                        point.color.setHex(value);
                        break;
                    case 'height':
                        state.height = value;
                        point.position.y = value;
                        break;
                    case 'orbit':
                        state.orbit = value >= 0.5;
                        break;
                    case 'showHelper':
                        pointHelper.visible = value >= 0.5;
                        break;
                }
            },
        });

        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            panel.remove();
        });
    },
};
