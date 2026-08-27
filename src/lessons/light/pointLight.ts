import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {DragControls} from 'three/examples/jsm/controls/DragControls.js';
import type {Lesson} from '../types';
import {setSceneBackground, createContext, makeCleanup} from '../helper';
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
    <p>白色小球即光源本体，<b>直接用鼠标拖动小球</b>即可在空间中移动光源位置。拖动「强度 / 衰减距离」观察光斑范围变化，或把「强度」调大让整片地面都亮起来。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, 0x0d1b2a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 7, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // 地板
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.9, side: THREE.DoubleSide}),
        );
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);

        // 与 ambient-light 一致：9 个不同形状 / 颜色的物体，按 3×3 网格排列
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
        const SPACING = 3.2;
        shapes.forEach(({geo, mat, h}, i) => {
            const mesh = new THREE.Mesh(geo, mat);
            const row = Math.floor(i / 3);
            const col = i % 3;
            mesh.position.set((col - 1) * SPACING, h + 0.1, (row - 1) * SPACING);
            ctx.scene.add(mesh);
        });

        // 微弱环境光，避免完全漆黑
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.08));

        const point = new THREE.PointLight(0xffffff, 30, 20);
        point.position.set(0, 4, 0);
        ctx.scene.add(point);

        // 可拖拽的光源小球：拖动它即可在空间中移动光源位置
        const lightBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 24, 24),
            new THREE.MeshBasicMaterial({color: 0xffffff}),
        );
        lightBall.position.copy(point.position);
        ctx.scene.add(lightBall);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '光照强度 intensity',
                    min: 0,
                    max: 100,
                    step: 1,
                    value: 30,
                    desc: '点光源强度（candela，物理单位）',
                    precision: 0
                },
                {
                    key: 'distance',
                    label: '衰减距离 distance',
                    min: 0,
                    max: 30,
                    step: 0.5,
                    value: 20,
                    desc: '光的照射半径，0 表示无限远',
                    precision: 1
                },
                {
                    key: 'color',
                    label: '颜色 color',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0xffffff,
                    desc: '光的颜色'
                },
                {
                    key: 'posX',
                    label: '位置 X position.x',
                    min: -5.5,
                    max: 5.5,
                    step: 0.1,
                    value: 0,
                    desc: '光源的 X 坐标',
                    precision: 1
                },
                {
                    key: 'posY',
                    label: '位置 Y position.y',
                    min: 0.1,
                    max: 6,
                    step: 0.1,
                    value: 4,
                    desc: '光源的 Y 坐标（高度）',
                    precision: 1
                },
                {
                    key: 'posZ',
                    label: '位置 Z position.z',
                    min: -5.5,
                    max: 5.5,
                    step: 0.1,
                    value: 0,
                    desc: '光源的 Z 坐标',
                    precision: 1
                },
                {
                    key: 'showHelper',
                    label: '显示光源小球',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '是否显示可拖拽的光源小球'
                },
            ],
            defaults: {intensity: 30, distance: 20, color: 0xffffff, posX: 0, posY: 4, posZ: 0, showHelper: 1},
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
                    case 'posX':
                        point.position.x = value;
                        lightBall.position.x = value;
                        break;
                    case 'posY':
                        point.position.y = value;
                        lightBall.position.y = value;
                        break;
                    case 'posZ':
                        point.position.z = value;
                        lightBall.position.z = value;
                        break;
                    case 'showHelper':
                        lightBall.visible = value >= 0.5;
                        break;
                }
            },
        });

        // 鼠标拖动光源小球 → 移动光源位置（拖动时暂停相机旋转，避免冲突）
        const dragControls = new DragControls([lightBall], camera, ctx.renderer.domElement);
        dragControls.addEventListener('dragstart', () => {
            controls.enabled = false;
        });
        dragControls.addEventListener('drag', () => {
            // 限制在 12×12 地板范围内，且不低于地面
            lightBall.position.x = THREE.MathUtils.clamp(lightBall.position.x, -5.5, 5.5);
            lightBall.position.y = Math.max(lightBall.position.y, 0.1);
            lightBall.position.z = THREE.MathUtils.clamp(lightBall.position.z, -5.5, 5.5);
            point.position.copy(lightBall.position);
            panel.setDisplay('posX', lightBall.position.x);
            panel.setDisplay('posY', lightBall.position.y);
            panel.setDisplay('posZ', lightBall.position.z);
        });
        dragControls.addEventListener('dragend', () => {
            controls.enabled = true;
        });

        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            dragControls.dispose();
            lightBall.geometry.dispose();
            (lightBall.material as THREE.Material).dispose();
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
