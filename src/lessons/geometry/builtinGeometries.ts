import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const builtinGeometries: Lesson = {
  id: 'builtin-geometries',
  title: '内置几何体',
  description: `
    <h2>Geometry</h2>
    <p>几何体定义物体的<b>形状</b>（顶点、边、面），材质定义<b>外观</b>。Three.js 内置了 20+ 种几何体：</p>
    <pre><code>new THREE.BoxGeometry(1, 1, 1)          // 立方体
new THREE.SphereGeometry(0.6, 32, 16)   // 球体
new THREE.CylinderGeometry(0.5, 0.5, 1) // 圆柱
new THREE.ConeGeometry(0.6, 1.2, 32)    // 圆锥
new THREE.TorusGeometry(0.5, 0.2, 16, 60) // 圆环
new THREE.TorusKnotGeometry(0.4, 0.12, 100, 16) // 环面纽结</code></pre>
    <h3>分段数（segments）</h3>
    <p>球体的 <code>32, 16</code> 参数是宽高分段数。分段越多曲面越平滑，但顶点数也越多、性能开销越大。</p>
    <p>画布中用 <b>MeshNormalMaterial</b> 展示了几种常见几何体，颜色由法线方向决定，便于观察形状。拖动鼠标可环绕查看。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 3, 8);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const material = new THREE.MeshNormalMaterial();
    const geometries = [
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.SphereGeometry(0.65, 32, 16),
      new THREE.ConeGeometry(0.6, 1.2, 32),
      new THREE.TorusGeometry(0.5, 0.22, 16, 60),
      new THREE.TorusKnotGeometry(0.38, 0.12, 100, 16),
      new THREE.CylinderGeometry(0.5, 0.5, 1.1, 32),
    ];
    const meshes: THREE.Mesh[] = [];
    geometries.forEach((geo, i) => {
      const mesh = new THREE.Mesh(geo, material);
      mesh.position.set((i % 3 - 1) * 2.4, i < 3 ? 1.4 : -0.9, 0);
      meshes.push(mesh);
      ctx.scene.add(mesh);
    });

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      meshes.forEach((m, i) => {
        m.rotation.x += 0.004 * (i % 3 + 1);
        m.rotation.y += 0.006 * (i % 3 + 1);
      });
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
