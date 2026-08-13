import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const ambientLight: Lesson = {
    id: 'lights/ambient-light',
    title: 'AmbientLight 环境光',
    description: `
    <h2>AmbientLight 环境光</h2>
    <p><code>AmbientLight</code> <b>均匀地照亮所有物体</b>：没有方向、没有位置、不产生阴影、不随距离衰减。它模拟光线在空气中经过无数漫反射后的"背景亮度"，常用于避免画面出现纯黑区域：</p>
    <pre><code>new THREE.AmbientLight(0xffffff, 0.5)</code></pre>
    <h3>特点</h3>
    <ul>
      <li>物体每个面的亮度一样，<b>看不出立体感</b>（没有明暗对比）</li>
      <li>位置改变不影响效果，<code>light.position</code> 无意义</li>
      <li>通常与平行光 / 点光等<b>方向光配合</b>使用作为"保底光"</li>
    </ul>
    <h3>动手试试</h3>
    <p>拖动「强度」观察画面整体明暗变化；切换「颜色」看整体色调；勾选「添加平行光」对比——有方向光时立体感立刻显现，这就是环境光与方向光的分工。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0d1b2a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 7, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        // 地板
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.9}),
        );
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);

        // 9 个不同形状 / 颜色的物体，按 3×3 网格排列
        const shapes = [
            {
                geo: new THREE.SphereGeometry(0.9, 48, 32),
                mat: new THREE.MeshStandardMaterial({color: 0x60a5fa, roughness: 0.3}),
                h: 0.9
            },
            {
                geo: new THREE.BoxGeometry(1.5, 1.5, 1.5),
                mat: new THREE.MeshStandardMaterial({color: 0xfbbf24, roughness: 0.5}),
                h: 0.75
            },
            {
                geo: new THREE.CylinderGeometry(0.6, 0.6, 2.2, 32),
                mat: new THREE.MeshStandardMaterial({color: 0x34d399, roughness: 0.4, metalness: 0.2}),
                h: 1.1
            },
            {
                geo: new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16),
                mat: new THREE.MeshStandardMaterial({color: 0xfb7185, roughness: 0.5}),
                h: 1.2
            },
            {
                geo: new THREE.TorusGeometry(0.7, 0.28, 32, 64),
                mat: new THREE.MeshStandardMaterial({color: 0xa78bfa, roughness: 0.4}),
                h: 1.3
            },
            {
                geo: new THREE.ConeGeometry(0.8, 1.8, 32),
                mat: new THREE.MeshStandardMaterial({color: 0xfbbf24, roughness: 0.5}),
                h: 0.9
            },
            {
                geo: new THREE.DodecahedronGeometry(0.9),
                mat: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.6}),
                h: 1.0
            },
            {
                geo: new THREE.OctahedronGeometry(0.9),
                mat: new THREE.MeshStandardMaterial({color: 0xfb923c, roughness: 0.5}),
                h: 0.9
            },
            {
                geo: new THREE.IcosahedronGeometry(0.9),
                mat: new THREE.MeshStandardMaterial({color: 0x2dd4bf, roughness: 0.4}),
                h: 0.9
            },
        ];
        const meshes: THREE.Mesh[] = [];
        const SPACING = 3.2;
        shapes.forEach(({geo, mat, h}, i) => {
            const mesh = new THREE.Mesh(geo, mat);
            const row = Math.floor(i / 3);
            const col = i % 3;
            mesh.position.set((col - 1) * SPACING, h, (row - 1) * SPACING);
            ctx.scene.add(mesh);
            meshes.push(mesh);
        });

        // 环境光：均匀照亮所有物体
        const ambient = new THREE.AmbientLight(0xffffff, 2.5);
        ctx.scene.add(ambient);

        // 可选的方向光，用于对比（默认关闭）
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(3, 5, 2);
        dirLight.visible = false;
        ctx.scene.add(dirLight);

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '强度',
                    type: 'range',
                    min: 0,
                    max: 5,
                    step: 0.05,
                    value: 2.5,
                    precision: 2,
                    desc: '环境光整体亮度，调为 0 时画面全黑'
                },
                {
                    key: 'color',
                    label: '颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0xffffff,
                    desc: '环境光的颜色，整体给画面染色'
                },
                {
                    key: 'addDir',
                    label: '添加平行光对比',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 0,
                    desc: '开灯后物体出现明暗面，直观对比环境光与方向光的区别'
                },
            ],
            defaults: {intensity: 2.5, color: 0xffffff, addDir: 0},
            onChange(key, value) {
                switch (key) {
                    case 'intensity':
                        ambient.intensity = value;
                        break;
                    case 'color':
                        ambient.color.setHex(value);
                        break;
                    case 'addDir':
                        dirLight.visible = value >= 0.5;
                        break;
                }
            },
        });

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
            floor.geometry.dispose();
            (floor.material as THREE.Material).dispose();
            shapes.forEach(({geo, mat}) => {
                geo.dispose();
                mat.dispose();
            });
            panel.remove();
        });
    },
};
