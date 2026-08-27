import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {DragControls} from 'three/examples/jsm/controls/DragControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;
import {createParamPanel} from '../../utils/paramPanel.ts';

export const spotLight: Lesson = {
    id: 'lights/spot-light',
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
        setSceneBackground(ctx, 0x0d1b2a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 7, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // 地板
        const floorMat = new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.9, side: THREE.DoubleSide});
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
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
        const meshes: THREE.Mesh[] = [];
        const SPACING = 3.2;
        shapes.forEach(({geo, mat, h}, i) => {
            const mesh = new THREE.Mesh(geo, mat);
            const row = Math.floor(i / 3);
            const col = i % 3;
            mesh.position.set((col - 1) * SPACING, h + 0.1, (row - 1) * SPACING);
            ctx.scene.add(mesh);
            meshes.push(mesh);
        });

        // 比较暗的环境光：照亮背光面，同时保留聚光灯的明暗对比
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 1));

        const spot = new THREE.SpotLight(0xffffff, 120);
        spot.position.set(0, 6, 0); // 聚光灯竖直向上移动，悬于原点上方
        spot.angle = Math.PI / 8;
        spot.penumbra = 0.35;
        const target = new THREE.Object3D();
        target.position.set(3, 0, 2);
        ctx.scene.add(target);
        spot.target = target;
        ctx.scene.add(spot);
        const spotHelper = new THREE.SpotLightHelper(spot);
        ctx.scene.add(spotHelper);

        // 可拖拽的光源小球：拖动它即可在空间中移动聚光灯位置（保留 SpotLightHelper）
        const lightBall = new THREE.Mesh(
            new THREE.SphereGeometry(0.12, 24, 24),
            new THREE.MeshBasicMaterial({color: 0xffffff}),
        );
        lightBall.position.copy(spot.position);
        ctx.scene.add(lightBall);

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '光照强度 intensity',
                    min: 0,
                    max: 300,
                    step: 5,
                    value: 120,
                    desc: '聚光灯强度（candela，物理单位）',
                    precision: 0
                },
                {
                    key: 'angle',
                    label: '光锥半角 angle',
                    min: 5,
                    max: 60,
                    step: 1,
                    value: 22.5,
                    desc: '控制光斑大小（angle = π/8 约 22.5°）',
                    precision: 1
                },
                {
                    key: 'penumbra',
                    label: '边缘柔化 penumbra',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: 0.35,
                    desc: '0 = 硬边缘，1 = 完全模糊',
                    precision: 2
                },
                {
                    key: 'distance',
                    label: '照射距离 distance',
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
                    value: 0xffffff,
                    desc: '光的颜色'
                },
                {
                    key: 'posX',
                    label: '位置 X',
                    min: -6,
                    max: 6,
                    step: 0.1,
                    value: 0,
                    desc: '聚光灯在 X 方向的位置',
                    precision: 1
                },
                {
                    key: 'posY',
                    label: '位置 Y',
                    min: 0,
                    max: 12,
                    step: 0.1,
                    value: 6,
                    desc: '聚光灯高度（悬于场景上方）',
                    precision: 1
                },
                {
                    key: 'posZ',
                    label: '位置 Z',
                    min: -6,
                    max: 6,
                    step: 0.1,
                    value: 0,
                    desc: '聚光灯在 Z 方向的位置',
                    precision: 1
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
                {
                    key: 'targetY',
                    label: '目标 Y',
                    min: 0,
                    max: 5.5,
                    step: 0.1,
                    value: 0,
                    desc: '控制光锥俯仰角：0 = 垂直向下，越大越接近水平（超过光源高度会朝上照射，无意义）',
                    precision: 1
                },
                {
                    key: 'targetZ',
                    label: '目标 Z',
                    min: -6,
                    max: 6,
                    step: 0.1,
                    value: 0,
                    desc: '照射目标在 Z 方向的位置',
                    precision: 1
                },
                {
                    key: 'showHelper',
                    label: '显示 SpotLightHelper',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '是否显示半透明的聚光灯锥体辅助线'
                },
                {
                    key: 'showBall',
                    label: '显示光源小球',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '是否显示可拖拽的光源小球'
                },
            ],
            defaults: {
                intensity: 120,
                angle: 22.5,
                penumbra: 0.35,
                distance: 0,
                color: 0xffffff,
                posX: 0,
                posY: 6,
                posZ: 0,
                targetX: 3,
                targetY: 0,
                targetZ: 2,
                showHelper: 1,
                showBall: 1
            },
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
                    case 'posX':
                        spot.position.x = value;
                        lightBall.position.x = value;
                        spotHelper.update();
                        break;
                    case 'posY':
                        spot.position.y = value;
                        lightBall.position.y = value;
                        spotHelper.update();
                        break;
                    case 'posZ':
                        spot.position.z = value;
                        lightBall.position.z = value;
                        spotHelper.update();
                        break;
                    case 'targetX':
                        target.position.x = value;
                        spotHelper.update();
                        break;
                    case 'targetY':
                        target.position.y = value;
                        spotHelper.update();
                        break;
                    case 'targetZ':
                        target.position.z = value;
                        spotHelper.update();
                        break;
                    case 'showHelper':
                        spotHelper.visible = value >= 0.5;
                        break;
                    case 'showBall':
                        lightBall.visible = value >= 0.5;
                        break;
                }
            },
        });

        // 点击地板任意位置 → 聚光灯照向该位置（拖动小球、拖动视角时跳过）
        let isDragging = false;
        let pointerDownPos: { x: number; y: number } | null = null;
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const onPointerDown = (e: PointerEvent) => {
            pointerDownPos = {x: e.clientX, y: e.clientY};
        };
        const onClick = (e: MouseEvent) => {
            if (isDragging) return;
            // 按下与松开位置相差超过阈值 → 视为拖动视角，不触发瞄准
            if (pointerDownPos) {
                const dx = e.clientX - pointerDownPos.x;
                const dy = e.clientY - pointerDownPos.y;
                if (dx * dx + dy * dy > 4) return; // 2px 阈值
            }
            const rect = ctx.renderer.domElement.getBoundingClientRect();
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointer, camera);
            const hit = raycaster.intersectObject(floor, false)[0];
            if (!hit) return;
            // 聚光灯照向地板上的被点击位置
            target.position.copy(hit.point);
            spotHelper.update();
            // 同步参数面板的 X/Y/Z 滑块显示
            panel.setDisplay('targetX', target.position.x);
            panel.setDisplay('targetY', target.position.y);
            panel.setDisplay('targetZ', target.position.z);
        };
        ctx.renderer.domElement.addEventListener('pointerdown', onPointerDown);
        ctx.renderer.domElement.addEventListener('click', onClick);

        // 鼠标拖动光源小球 → 移动聚光灯位置（拖动时暂停相机旋转，避免冲突）
        const dragControls = new DragControls([lightBall], camera, ctx.renderer.domElement);
        dragControls.addEventListener('dragstart', () => {
            isDragging = true;
            controls.enabled = false;
        });
        dragControls.addEventListener('drag', () => {
            // 限制在 12×12 地板范围内，且不低于地面
            lightBall.position.x = THREE.MathUtils.clamp(lightBall.position.x, -6, 6);
            lightBall.position.y = Math.max(lightBall.position.y, 0.1);
            lightBall.position.z = THREE.MathUtils.clamp(lightBall.position.z, -6, 6);
            spot.position.copy(lightBall.position);
            spotHelper.update();
            panel.setDisplay('posX', lightBall.position.x);
            panel.setDisplay('posY', lightBall.position.y);
            panel.setDisplay('posZ', lightBall.position.z);
        });
        dragControls.addEventListener('dragend', () => {
            isDragging = false;
            controls.enabled = true;
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            spotHelper.update();
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            dragControls.dispose();
            ctx.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            ctx.renderer.domElement.removeEventListener('click', onClick);
            spotHelper.dispose();
            lightBall.geometry.dispose();
            (lightBall.material as THREE.Material).dispose();
            meshes.forEach((m) => {
                m.geometry.dispose();
                (m.material as THREE.Material).dispose();
            });
            floor.geometry.dispose();
            floorMat.dispose();
            panel.remove();
        });
    },
};
