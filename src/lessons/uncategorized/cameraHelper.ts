import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const cameraHelper: Lesson = {
    id: 'camera-helper',
    title: 'CameraHelper 相机视锥体',
    description: `
    <h2>CameraHelper 相机辅助</h2>
    <p><code>CameraHelper</code> 用彩色线框可视化相机的<b>视锥体（Frustum）</b>，即相机能「看见」的空间范围，包含<b>近平面</b>、<b>远平面</b>及连接它们的棱，非常适合调试相机参数。</p>
    <pre><code>const helper = new THREE.CameraHelper(camera);
scene.add(helper);</code></pre>
    <h3>工作原理</h3>
    <ul>
      <li><code>FOV</code> 决定视锥体张角大小，<code>near</code> / <code>far</code> 决定近、远平面的距离。</li>
      <li>修改相机参数后，需先调用 <code>camera.updateProjectionMatrix()</code>，再调用 <code>helper.update()</code> 刷新视锥体。</li>
      <li><code>helper.setColors()</code> 可自定义视锥体、锥体、上方向等各部分的线框颜色。</li>
    </ul>
    <p>拖动右侧的 FOV / near / far 滑块，可实时观察视锥体形状变化。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 3.2, 6.5);
        camera.lookAt(2.2, 3, 3.5);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(2.2, 3, 3.5);

        ctx.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x1e293b));

        // 被调试的相机：它的视锥体将由 CameraHelper 可视化
        const targetCamera = new THREE.PerspectiveCamera(30, 1, 0.5, 10);
        targetCamera.position.set(3, 2.5, 5);
        targetCamera.lookAt(0, 1, 0);
        ctx.scene.add(targetCamera); // 挂到场景中，helper 才能拿到正确的世界矩阵

        const helper = new THREE.CameraHelper(targetCamera);
        helper.setColors(
            new THREE.Color(0x60a5fa), // frustum 视锥体
            new THREE.Color(0xfbbf24), // cone 锥体
            new THREE.Color(0x4ade80), // up 上方向
            new THREE.Color(0xf472b6), // target 目标方向
            new THREE.Color(0xffffff), // cross 十字
        );
        ctx.scene.add(helper);

        // 视锥体内的演示物体
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(1, 1, 1),
            new THREE.MeshNormalMaterial(),
        );
        box.position.set(0.8, 1, -0.5);
        ctx.scene.add(box);

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(0.5, 32, 32),
            new THREE.MeshNormalMaterial(),
        );
        sphere.position.set(-1, 0.6, 1.2);
        ctx.scene.add(sphere);

        // 参数状态
        const state = {
            fov: 30,
            near: 0.5,
            far: 10,
            showHelper: 1,
        };

        const applyCamera = () => {
            targetCamera.fov = state.fov;
            targetCamera.near = state.near;
            targetCamera.far = state.far;
            targetCamera.updateProjectionMatrix();
            helper.update();
            helper.visible = state.showHelper >= 0.5;
        };
        applyCamera();

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'fov',
                    label: 'FOV 视野角度',
                    type: 'range',
                    min: 20,
                    max: 120,
                    step: 1,
                    value: state.fov,
                    precision: 0,
                    desc: '垂直视野角度，越大视锥体张角越大',
                },
                {
                    key: 'near',
                    label: '近平面 near',
                    type: 'range',
                    min: 0.1,
                    max: 10,
                    step: 0.1,
                    value: state.near,
                    precision: 1,
                    desc: '近裁剪平面距离（需小于 far）',
                },
                {
                    key: 'far',
                    label: '远平面 far',
                    type: 'range',
                    min: 5,
                    max: 50,
                    step: 0.5,
                    value: state.far,
                    precision: 1,
                    desc: '远裁剪平面距离（需大于 near）',
                },
                {
                    key: 'showHelper',
                    label: '显示视锥体',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showHelper,
                    desc: '是否显示 CameraHelper 视锥体线框',
                },
            ],
            defaults: {
                fov: 30,
                near: 0.5,
                far: 10,
                showHelper: 1,
            },
            onChange(key, value) {
                if (key === 'near') {
                    // 保证 near 始终小于 far
                    state.near = Math.min(value, state.far - 0.1);
                    if (state.near !== value) panel.setDisplay('near', state.near);
                } else if (key === 'far') {
                    // 保证 far 始终大于 near
                    state.far = Math.max(value, state.near + 0.1);
                    if (state.far !== value) panel.setDisplay('far', state.far);
                } else if (key === 'fov') {
                    state.fov = value;
                } else if (key === 'showHelper') {
                    state.showHelper = value;
                }
                applyCamera();
            },
        });

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧参数实时改变视锥体';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

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
            targetCamera.remove();
            helper.dispose();
            box.geometry.dispose();
            (box.material as THREE.Material).dispose();
            sphere.geometry.dispose();
            (sphere.material as THREE.Material).dispose();
            panel.remove();
            tip.remove();
        });
    },
};
