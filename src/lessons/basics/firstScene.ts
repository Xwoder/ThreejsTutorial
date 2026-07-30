import * as THREE from 'three';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const firstScene: Lesson = {
  id: 'first-scene',
  title: 'Scene 场景',
  description: `
    <h2>三大核心要素</h2>
    <p>任何 Three.js 应用都离不开三个东西：<b>场景（Scene）</b>、<b>相机（Camera）</b> 和 <b>渲染器（Renderer）</b>。</p>
    <ul>
      <li><b>Scene</b>：一个容器，所有物体、灯光都要加入其中。</li>
      <li><b>Camera</b>：决定从哪个角度观察场景。</li>
      <li><b>Renderer</b>：把相机看到的画面绘制到 <code>&lt;canvas&gt;</code> 上。</li>
    </ul>
    <h3>关键代码</h3>
    <pre><code>const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000);
camera.position.z = 3;

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setSize(w, h);

// 一个立方体：几何体 + 材质 = 网格
const geometry = new THREE.BoxGeometry(1, 1, 1);
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

renderer.render(scene, camera);</code></pre>
    <p>右侧画布中的立方体正在旋转——每一帧我们修改它的 <code>rotation</code>，然后再次调用 <code>render</code>。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.z = 3;
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshNormalMaterial(),
    );
    ctx.scene.add(cube);

    const grid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    grid.position.y = -1;
    ctx.scene.add(grid);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.015;
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => cancelAnimationFrame(raf));
  },
};
