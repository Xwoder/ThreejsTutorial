import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

const DEFAULT_FOV = 75;
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 2000;

export const perspectiveCamera: Lesson = {
  id: 'perspective-camera',
  title: 'PerspectiveCamera 透视相机',
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
    <p>画布右上角的参数面板可以实时调整 <b>fov、aspect、near、far</b>。注意观察：fov 变大时，同样的立方体看起来"变小且空间更深"；near/far 决定哪些物体会被裁剪。</p>
    <p>修改任何相机参数后都需要调用：</p>
    <pre><code>camera.updateProjectionMatrix();</code></pre>
    <p>用鼠标拖动可以环绕观察场景。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, DEFAULT_NEAR, DEFAULT_FAR);
    camera.position.set(0, 2, 6);

    let lockAspect = true;
    ctx.onResize((w, h) => {
      if (lockAspect) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        updateControlDisplay('aspect', camera.aspect);
      }
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

    // 右上角参数面板
    const panel = document.createElement('div');
    panel.className = 'camera-controls';
    panel.innerHTML = `
      <div class="camera-controls-title">参数 <span>CONTROLS</span></div>
      <div class="camera-control-row" data-key="fov">
        <div class="camera-control-header"><span>fov</span><span class="camera-control-value">${DEFAULT_FOV.toFixed(2)}</span></div>
        <input type="range" min="20" max="120" value="${DEFAULT_FOV}" step="1">
        <div class="camera-control-desc">垂直视场角，越大视野越广</div>
      </div>
      <div class="camera-control-row" data-key="aspect">
        <div class="camera-control-header"><span>aspect</span><span class="camera-control-value">1.00</span></div>
        <input type="range" min="0.2" max="4" value="1" step="0.01" disabled>
        <div class="camera-control-desc">画布宽高比</div>
      </div>
      <div class="camera-control-row" data-key="near">
        <div class="camera-control-header"><span>near</span><span class="camera-control-value">${DEFAULT_NEAR.toFixed(2)}</span></div>
        <input type="range" min="0.1" max="10" value="${DEFAULT_NEAR}" step="0.1">
        <div class="camera-control-desc">近裁剪面，小于此距离的物体不渲染</div>
      </div>
      <div class="camera-control-row" data-key="far">
        <div class="camera-control-header"><span>far</span><span class="camera-control-value">${DEFAULT_FAR.toFixed(2)}</span></div>
        <input type="range" min="1" max="2000" value="${DEFAULT_FAR}" step="1">
        <div class="camera-control-desc">远裁剪面，大于此距离的物体不渲染</div>
      </div>
      <label class="camera-control-checkbox">
        <input type="checkbox" checked>
        <span>锁定 aspect 随画布变化</span>
      </label>
      <button class="camera-control-reset">重置参数</button>
    `;
    container.appendChild(panel);

    const rows = new Map<string, { input: HTMLInputElement; value: HTMLElement }>();
    panel.querySelectorAll<HTMLElement>('.camera-control-row').forEach((row) => {
      const key = row.dataset.key!;
      rows.set(key, {
        input: row.querySelector('input')!,
        value: row.querySelector('.camera-control-value')!,
      });
    });

    function updateControlDisplay(key: string, val: number) {
      const row = rows.get(key);
      if (!row) return;
      row.input.value = String(val);
      row.value.textContent = Number(val).toFixed(2);
    }

    rows.get('fov')!.input.addEventListener('input', (e) => {
      camera.fov = Number((e.target as HTMLInputElement).value);
      camera.updateProjectionMatrix();
      updateControlDisplay('fov', camera.fov);
    });

    rows.get('aspect')!.input.addEventListener('input', (e) => {
      camera.aspect = Number((e.target as HTMLInputElement).value);
      camera.updateProjectionMatrix();
      updateControlDisplay('aspect', camera.aspect);
    });

    rows.get('near')!.input.addEventListener('input', (e) => {
      camera.near = Number((e.target as HTMLInputElement).value);
      camera.updateProjectionMatrix();
      updateControlDisplay('near', camera.near);
    });

    rows.get('far')!.input.addEventListener('input', (e) => {
      camera.far = Number((e.target as HTMLInputElement).value);
      camera.updateProjectionMatrix();
      updateControlDisplay('far', camera.far);
    });

    const aspectCheckbox = panel.querySelector<HTMLInputElement>('.camera-control-checkbox input')!;
    aspectCheckbox.addEventListener('change', () => {
      lockAspect = aspectCheckbox.checked;
      rows.get('aspect')!.input.disabled = lockAspect;
      if (lockAspect) {
        const { width, height } = ctx.getSize();
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        updateControlDisplay('aspect', camera.aspect);
      }
    });

    panel.querySelector('.camera-control-reset')!.addEventListener('click', () => {
      camera.fov = DEFAULT_FOV;
      camera.near = DEFAULT_NEAR;
      camera.far = DEFAULT_FAR;
      lockAspect = true;
      aspectCheckbox.checked = true;
      rows.get('aspect')!.input.disabled = true;
      const { width, height } = ctx.getSize();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      updateControlDisplay('fov', camera.fov);
      updateControlDisplay('aspect', camera.aspect);
      updateControlDisplay('near', camera.near);
      updateControlDisplay('far', camera.far);
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
      panel.remove();
    });
  },
};
