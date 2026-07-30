import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const perspectiveCamera: Lesson = {
  id: 'perspective-camera',
  title: '透视相机',
  description: `
    <h2>PerspectiveCamera</h2>
    <p>透视相机模拟人眼的成像方式：<b>近大远小</b>。这是最常用的相机。</p>
    <pre><code>new THREE.PerspectiveCamera(fov, aspect, near, far)</code></pre>
    <ul>
      <li><b>fov</b>：视场角（度），越大视野越广、透视变形越明显</li>
      <li><b>aspect</b>：画布宽高比，通常设为 <code>width / height</code></li>
      <li><b>near / far</b>：近/远裁剪面，超出范围的物体不渲染</li>
    </ul>
    <h3>动手试试</h3>
    <p>画布下方的滑块可以实时调整 <b>fov</b>。注意观察：fov 变大时，同样的立方体看起来"变小且空间更深"。</p>
    <p>修改任何相机参数后都需要调用：</p>
    <pre><code>camera.updateProjectionMatrix();</code></pre>
    <p>用鼠标拖动可以环绕观察场景。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100);
    camera.position.set(0, 2, 6);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(12, 12, 0x475569, 0x1e293b));
    const material = new THREE.MeshNormalMaterial();
    for (let i = 0; i < 5; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
      box.position.set((i - 2) * 2.2, 0.5, (i % 2) * -3);
      ctx.scene.add(box);
    }

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    // fov 滑块
    const bar = document.createElement('div');
    bar.className = 'demo-toolbar';
    bar.innerHTML = `<label>fov: <span id="fov-val">75</span>°</label>
      <input type="range" min="20" max="120" value="75" step="1">`;
    container.appendChild(bar);
    const input = bar.querySelector('input')!;
    const label = bar.querySelector('#fov-val')!;
    input.addEventListener('input', () => {
      camera.fov = Number(input.value);
      camera.updateProjectionMatrix();
      label.textContent = input.value;
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
      bar.remove();
    });
  },
};
