import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../paramPanel';

export const hemisphereLightHelper: Lesson = {
    id: 'hemisphere-light-helper',
    title: 'HemisphereLightHelper 半球光辅助线',
    description: `
    <h2>HemisphereLight 半球光</h2>
    <p><code>HemisphereLight</code> 模拟<b>天空与地面</b>对物体的环境反射：光来自无限远的半球，没有方向、没有衰减。物体顶部偏向 <code>skyColor</code>（天空色），底部偏向 <code>groundColor</code>（地面色），常用于营造自然的户外光照氛围。</p>
    <pre><code>new THREE.HemisphereLight(skyColor, groundColor, intensity)</code></pre>
    <h2>HemisphereLightHelper 辅助线</h2>
    <p><code>HemisphereLightHelper</code> 用<b>上半球为天空色、下半球为地面色</b>的线框球体直观展示半球光的效果范围与配色：</p>
    <pre><code>const helper = new THREE.HemisphereLightHelper(light, sphereSize, color?)
scene.add(helper)</code></pre>
    <p>注意：半球光没有位置方向，<code>light.position</code> 只决定 <b>Helper 球体</b>显示在哪，不影响光照效果。切换下方颜色并拖动「高度 Y」，即可同时观察光照变化与 Helper 的显示。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0d1b2a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5, 4, 7);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        // 地面
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.9}),
        );
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);

        // 若干材质各异的物体，便于观察上下半球的颜色倾向（全部离开地面一定距离）
        const meshes = [
            {
                geo: new THREE.SphereGeometry(0.9, 48, 32),
                mat: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.2, metalness: 0.1}),
                pos: new THREE.Vector3(-2.2, 1.4, 0.8)
            },
            {
                geo: new THREE.BoxGeometry(1.5, 1.5, 1.5),
                mat: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.6}),
                pos: new THREE.Vector3(0, 1.25, -1)
            },
            {
                geo: new THREE.CylinderGeometry(0.6, 0.6, 2.2, 32),
                mat: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.35, metalness: 0.4}),
                pos: new THREE.Vector3(2.4, 1.6, 1)
            },
            {
                geo: new THREE.TorusKnotGeometry(0.55, 0.2, 100, 16),
                mat: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.3, metalness: 0.5}),
                pos: new THREE.Vector3(-1.2, 1.3, -1.6)
            },
        ];
        meshes.forEach(({geo, mat, pos}) => {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            ctx.scene.add(mesh);
        });

        // 半球光：天空色 / 地面色 / 强度
        const hemi = new THREE.HemisphereLight(0x87ceeb, 0x8b5e34, 1.2);
        hemi.position.set(0, 4, 0);
        ctx.scene.add(hemi);

        // 辅助线：上半球天空色、下半球地面色的线框球
        const helper = new THREE.HemisphereLightHelper(hemi, 1);
        ctx.scene.add(helper);

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'skyColor',
                    label: '天空色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0x87ceeb,
                    desc: '物体顶部（法线朝上）偏斜的颜色'
                },
                {
                    key: 'groundColor',
                    label: '地面色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0x8b5e34,
                    desc: '物体底部（法线朝下）偏斜的颜色'
                },
                {
                    key: 'intensity',
                    label: '强度',
                    type: 'range',
                    min: 0,
                    max: 3,
                    step: 0.05,
                    value: 1.2,
                    precision: 2,
                    desc: '半球光整体亮度'
                },
                {
                    key: 'posY',
                    label: '辅助线高度 Y',
                    type: 'range',
                    min: -3,
                    max: 10,
                    step: 0.1,
                    value: 4,
                    precision: 1,
                    desc: 'Helper 球心位置（不影响光照，仅影响辅助线显示）'
                },
                {
                    key: 'showHelper',
                    label: '显示辅助线',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '切换线框球的显示/隐藏'
                },
            ],
            defaults: {skyColor: 0x87ceeb, groundColor: 0x8b5e34, intensity: 1.2, posY: 4, showHelper: 1},
            onChange(key, value) {
                switch (key) {
                    case 'skyColor':
                        hemi.color.setHex(value);
                        break;
                    case 'groundColor':
                        hemi.groundColor.setHex(value);
                        break;
                    case 'intensity':
                        hemi.intensity = value;
                        break;
                    case 'posY':
                        hemi.position.y = value;
                        helper.update();
                        break;
                    case 'showHelper':
                        helper.visible = value >= 0.5;
                        break;
                }
                // 颜色变化后同步辅助线配色
                if (key === 'skyColor' || key === 'groundColor') helper.update();
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
            meshes.forEach(({geo, mat}) => {
                geo.dispose();
                mat.dispose();
            });
            panel.remove();
        });
    },
};
