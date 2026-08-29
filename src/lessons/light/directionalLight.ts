import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_SLATE} from '../helper';

import {createParamPanel} from '../../utils/paramPanel.ts';
import {getDefaultIntensity, getIntensity, setIntensity} from '../../utils/lightIntensityStore.ts';

export const directionalLight: Lesson = {
    id: 'lights/directional-light',
    title: 'DirectionalLight 平行光',
    description: `
    <h2>DirectionalLight 平行光</h2>
    <p>平行光模拟<b>太阳光</b>：光线来自无限远处、彼此平行，只有<b>方向</b>而没有位置衰减。无论物体距离多远，受光强度都一样。</p>
    <pre><code>const light = new THREE.DirectionalLight(0xffffff, 1);
light.position.set(3, 5, 2); // 照射方向 = position → target（默认原点）
scene.add(light);</code></pre>
    <h3>方向决定明暗</h3>
    <p>光的方向由 <code>light.position</code> 指向 <code>light.target</code>（默认原点）决定。拖动面板中的「方位角 / 仰角」，观察各物体受光面与背光面如何随方向变化。</p>
    <h3>产生阴影</h3>
    <p>平行光是产生阴影的主力光源。开启「投射阴影」后，物体在地面投下清晰的影子：</p>
    <pre><code>light.castShadow = true;
light.shadow.mapSize.set(1024, 1024);
renderer.shadowMap.enabled = true;</code></pre>
    <p>注意：只有设置了 <code>castShadow</code> 的物体才能投影，只有设置了 <code>receiveShadow</code> 的物体才会接收阴影。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_SLATE);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 7, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // 地面：接收阴影（尺寸与颜色和 ambient-light 一致）
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

        // 微弱环境光，避免背光面完全漆黑
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.12));

        // 平行光：方向 = position → target（默认原点）。
        // 初始强度取自集中配置 DEFAULT_INTENSITY，运行时强度按光源独立保存，与其他光源互不影响
        const INITIAL_INTENSITY = getDefaultIntensity(directionalLight.id);
        const intensity = getIntensity(directionalLight.id);
        const dirLight = new THREE.DirectionalLight(0xffffff, intensity);
        ctx.scene.add(dirLight);

        const helper = new THREE.DirectionalLightHelper(dirLight, 2, 0xfacc15);
        ctx.scene.add(helper);

        // 通过方位角 / 仰角控制光的方向
        const DIST = 8;
        const state = {azimuth: 45, elevation: 40};
        const applyDirection = () => {
            const a = THREE.MathUtils.degToRad(state.azimuth);
            const e = THREE.MathUtils.degToRad(state.elevation);
            dirLight.position.set(
                Math.sin(a) * Math.cos(e) * DIST,
                Math.sin(e) * DIST,
                Math.cos(a) * Math.cos(e) * DIST,
            );
            helper.update();
        };
        applyDirection();

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '光照强度',
                    min: 0,
                    max: 10,
                    step: 0.05,
                    value: intensity,
                    desc: '平行光强度，可超过 1 来提高亮度',
                    precision: 2
                },
                {
                    key: 'azimuth',
                    label: '方位角（°）',
                    min: -180,
                    max: 180,
                    step: 1,
                    value: 45,
                    desc: '光线在地平面上的朝向',
                    precision: 0
                },
                {
                    key: 'elevation',
                    label: '仰角（°）',
                    min: 5,
                    max: 85,
                    step: 1,
                    value: 40,
                    desc: '光线与地面的夹角，越接近 90° 影子越短',
                    precision: 0
                },
                {
                    key: 'showHelper',
                    label: '显示 DirectionalLightHelper',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '黄色箭头标示平行光的照射方向'
                },
            ],
            defaults: {intensity: INITIAL_INTENSITY, azimuth: 45, elevation: 40, showHelper: 1},
            onChange: (key, value) => {
                if (key === 'intensity') {
                    dirLight.intensity = value;
                    setIntensity(directionalLight.id, value);
                } else if (key === 'azimuth') {
                    state.azimuth = value;
                    applyDirection();
                } else if (key === 'elevation') {
                    state.elevation = value;
                    applyDirection();
                } else if (key === 'showHelper') {
                    helper.visible = value >= 0.5;
                }
            },
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

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
            shapes.forEach(({geo, mat}) => {
                geo.dispose();
                mat.dispose();
            });
            panel.remove();
        });
    },
};
