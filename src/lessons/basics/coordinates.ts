import * as THREE from 'three';
import type { Lesson } from '../types';
import {createAxesWithLabels, createContext, makeCleanup} from '../helper';

export const coordinates: Lesson = {
  id: 'coordinates',
  title: '坐标系与轴向',
  description: `
    <h2>右手坐标系</h2>
    <p>Three.js 使用<b>右手坐标系</b>：</p>
    <ul>
      <li><b style="color:#f87171">X 轴（红）</b>：向右为正</li>
      <li><b style="color:#4ade80">Y 轴（绿）</b>：向上为正</li>
      <li><b style="color:#60a5fa">Z 轴（蓝）</b>：朝向屏幕外为正</li>
    </ul>
    <h3>位置、旋转、缩放</h3>
    <p>每个 <code>Object3D</code> 都有三个变换属性：</p>
    <pre><code>mesh.position.set(1, 0, 0);  // 位置
mesh.rotation.y = Math.PI / 4; // 旋转（弧度）
mesh.scale.set(2, 2, 2);       // 缩放</code></pre>
    <h3>辅助工具</h3>
    <p>画布中展示了两个常用辅助对象：</p>
    <pre><code>scene.add(new THREE.AxesHelper(2));    // 坐标轴
scene.add(new THREE.GridHelper(10, 10)); // 地面网格</code></pre>
    <p>开发时借助它们可以直观地定位物体。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(3, 2.5, 4);
    camera.lookAt(0, 0.5, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(createAxesWithLabels(2));
    ctx.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x1e293b));

    const box = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshNormalMaterial(),
    );
    box.position.set(1, 0.5, 0);
    box.rotation.y = Math.PI / 4;
    ctx.scene.add(box);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      box.rotation.y += 0.01;
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => cancelAnimationFrame(raf));
  },
};
