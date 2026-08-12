import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

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
        ctx.scene.background = new THREE.Color(0x0b1120);
        ctx.renderer.shadowMap.enabled = true;
        ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(6, 4, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // 地面：接收阴影
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(14, 14),
            new THREE.MeshStandardMaterial({color: 0x1e293b, roughness: 0.9}),
        );
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        ctx.scene.add(floor);

        // 若干几何体：投射阴影
        const meshes = [
            {
                geo: new THREE.SphereGeometry(1, 48, 24),
                mat: new THREE.MeshStandardMaterial({color: 0x7dd3fc, roughness: 0.35}),
                pos: new THREE.Vector3(-3, 1.05, 1),
            },
            {
                geo: new THREE.BoxGeometry(1.6, 1.6, 1.6),
                mat: new THREE.MeshStandardMaterial({color: 0xfbbf24, roughness: 0.5}),
                pos: new THREE.Vector3(0, 0.85, -1.5),
            },
            {
                geo: new THREE.CylinderGeometry(0.7, 0.7, 2, 32),
                mat: new THREE.MeshStandardMaterial({color: 0xa78bfa, roughness: 0.4}),
                pos: new THREE.Vector3(3, 1.05, 1),
            },
            {
                geo: new THREE.TorusKnotGeometry(0.6, 0.22, 100, 16),
                mat: new THREE.MeshStandardMaterial({color: 0xfb7185, roughness: 0.6}),
                pos: new THREE.Vector3(-1.5, 1.3, 2.2),
            },
        ];
        meshes.forEach(({geo, mat, pos}) => {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            mesh.castShadow = true;
            ctx.scene.add(mesh);
        });

        // 微弱环境光，避免背光面完全漆黑
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.12));

        // 平行光：方向 = position → target（默认原点）
        const dirLight = new THREE.DirectionalLight(0xffffff, 5);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(1024, 1024);
        dirLight.shadow.camera.left = -7;
        dirLight.shadow.camera.right = 7;
        dirLight.shadow.camera.top = 7;
        dirLight.shadow.camera.bottom = -7;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 30;
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
                    value: 5,
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
                    key: 'castShadow',
                    label: '投射阴影',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '开启后物体在地面投射清晰的阴影'
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
            defaults: {intensity: 5, azimuth: 45, elevation: 40, castShadow: 1, showHelper: 1},
            onChange: (key, value) => {
                if (key === 'intensity') {
                    dirLight.intensity = value;
                } else if (key === 'azimuth') {
                    state.azimuth = value;
                    applyDirection();
                } else if (key === 'elevation') {
                    state.elevation = value;
                    applyDirection();
                } else if (key === 'castShadow') {
                    dirLight.castShadow = value >= 0.5;
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
            panel.remove();
        });
    },
};
