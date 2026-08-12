import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const orbitControls: Lesson = {
  id: 'controls/orbit-controls',
  title: 'OrbitControls 轨道控制器',
  description: `
    <h2>让用户与场景交互</h2>
    <p><code>OrbitControls</code> 是 Three.js 官方提供的相机控制器，支持<b>旋转、缩放、平移</b>。前面的课程已经在悄悄使用它了：</p>
    <pre><code>import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;   // 开启惯性阻尼
controls.dampingFactor = 0.05;

// 动画循环中必须调用：
controls.update();</code></pre>
    <h3>操作方式</h3>
    <ul>
      <li><b>左键拖动</b>：环绕旋转</li>
      <li><b>滚轮</b>：拉近拉远</li>
      <li><b>右键拖动</b>：平移视角</li>
    </ul>
    <h3>常用配置</h3>
    <pre><code>controls.minDistance = 3;          // 最近距离
controls.maxDistance = 15;         // 最远距离
controls.maxPolarAngle = Math.PI / 2.1; // 限制不能翻到地面下
controls.autoRotate = true;        // 自动旋转展示</code></pre>
    <p>试试在画布中操作：本例开启了自动旋转与距离/角度限制。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(4, 3, 6);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(12, 12, 0x475569, 0x1e293b));
    const knot = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1, 0.32, 160, 24),
      new THREE.MeshStandardMaterial({ color: 0xc084fc, metalness: 0.5, roughness: 0.25 }),
    );
    knot.position.y = 1.6;
    ctx.scene.add(knot);

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.35));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(4, 6, 3);
    ctx.scene.add(dirLight);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.maxPolarAngle = Math.PI / 2.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.2;
    controls.target.set(0, 1.5, 0);

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
    });
  },
};
