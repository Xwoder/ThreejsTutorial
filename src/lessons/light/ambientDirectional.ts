import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const ambientDirectional: Lesson = {
  id: 'ambient-directional',
  title: '环境光与平行光',
  description: `
    <h2>AmbientLight 环境光</h2>
    <p>环境光<b>均匀地照亮所有物体</b>，没有方向、不产生阴影。它模拟光线在空气中漫反射后的基础亮度，通常作为"保底光"避免画面出现纯黑区域：</p>
    <pre><code>scene.add(new THREE.AmbientLight(0xffffff, 0.4));</code></pre>
    <h2>DirectionalLight 平行光</h2>
    <p>平行光模拟<b>太阳光</b>：光线来自无限远处、彼此平行，有明确的方向，是产生阴影的主力光源：</p>
    <pre><code>const light = new THREE.DirectionalLight(0xffffff, 1.2);
light.position.set(3, 5, 2); // 方向 = position → target(默认原点)
scene.add(light);</code></pre>
    <h3>动手试试</h3>
    <p>画布下方有两个滑块，分别调节环境光和平行光的<b>强度</b>：</p>
    <ul>
      <li>只开环境光：物体通体发亮、没有立体感</li>
      <li>只开平行光：明暗对比强烈、背光面全黑</li>
      <li>两者结合：既有立体感又保留暗部细节</li>
    </ul>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 2, 5.5);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const material = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.4 });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1, 48, 24), material);
    sphere.position.y = 1;
    ctx.scene.add(sphere);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), material.clone());
    floor.rotation.x = -Math.PI / 2;
    ctx.scene.add(floor);

    const ambient = new THREE.AmbientLight(0xffffff, 0.4);
    ctx.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 2);
    ctx.scene.add(dirLight);
    ctx.scene.add(new THREE.DirectionalLightHelper(dirLight, 0.6, 0xfacc15));

    const bar = document.createElement('div');
    bar.className = 'demo-toolbar';
    bar.innerHTML = `
      <label>环境光 <span id="av">0.4</span></label>
      <input id="ai" type="range" min="0" max="2" step="0.05" value="0.4">
      <label>平行光 <span id="dv">1.2</span></label>
      <input id="di" type="range" min="0" max="3" step="0.05" value="1.2">`;
    container.appendChild(bar);
    const bind = (id: string, label: string, cb: (v: number) => void) => {
      const input = bar.querySelector<HTMLInputElement>(id)!;
      const span = bar.querySelector(label)!;
      input.addEventListener('input', () => {
        cb(Number(input.value));
        span.textContent = input.value;
      });
    };
    bind('#ai', '#av', (v) => (ambient.intensity = v));
    bind('#di', '#dv', (v) => (dirLight.intensity = v));

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

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
