import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const orthographicCamera: Lesson = {
  id: 'orthographic-camera',
  title: '正交相机',
  description: `
    <h2>OrthographicCamera</h2>
    <p>正交相机没有透视效果：<b>无论远近，物体大小一致</b>。常用于 2D 游戏、CAD、建筑图纸。</p>
    <pre><code>new THREE.OrthographicCamera(left, right, top, bottom, near, far)</code></pre>
    <p>它用一个<b>长方体视锥</b>（而非金字塔形）来决定可见范围：</p>
    <pre><code>const d = 5;
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, 0.1, 100
);</code></pre>
    <h3>对比观察</h3>
    <p>画布中的场景与"透视相机"一节相同：一排立方体由近及远排列。旋转视角观察——<b>所有立方体在屏幕上大小相同</b>，这就是正交投影的特征。</p>
    <h3>使用场景</h3>
    <ul>
      <li>2D 界面、地图、棋盘类游戏</li>
      <li>需要精确尺寸对齐的工程可视化</li>
    </ul>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const d = 4.5;
    const camera = new THREE.OrthographicCamera(-d, d, d, -d, 0.1, 100);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 0, 0);
    ctx.onResize((w, h) => {
      const aspect = w / h;
      camera.left = -d * aspect;
      camera.right = d * aspect;
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
