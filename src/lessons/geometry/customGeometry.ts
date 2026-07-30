import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const customGeometry: Lesson = {
  id: 'custom-geometry',
  title: '自定义几何体',
  description: `
    <h2>BufferGeometry</h2>
    <p>当内置几何体无法满足需求时，可以用 <code>BufferGeometry</code> 手动指定顶点来构建任意形状。</p>
    <h3>核心概念</h3>
    <ul>
      <li><b>position 属性</b>：每 3 个数字表示一个顶点的 x/y/z</li>
      <li><b>index</b>：用顶点索引描述哪些顶点组成三角形</li>
      <li><b>法线</b>：可用 <code>computeVertexNormals()</code> 自动计算</li>
    </ul>
    <pre><code>const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  -1, 0,  1,   1, 0,  1,   1, 0, -1,  -1, 0, -1, // 底面 4 点
   0, 2,  0,                                     // 顶点
]);
geometry.setAttribute('position',
  new THREE.BufferAttribute(vertices, 3));
geometry.setIndex([
  0, 1, 4,  1, 2, 4,  2, 3, 4,  3, 0, 4, // 4 个侧面
  0, 3, 2,  0, 2, 1,                     // 底面
]);
geometry.computeVertexNormals();</code></pre>
    <p>画布中是一座手工构建的<b>四棱锥</b>，使用标准材质 + 灯光渲染，验证法线计算正确。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(3, 2.5, 4);
    camera.lookAt(0, 0.8, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array([
      -1, 0, 1, 1, 0, 1, 1, 0, -1, -1, 0, -1,
      0, 2, 0,
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setIndex([
      0, 1, 4, 1, 2, 4, 2, 3, 4, 3, 0, 4,
      0, 3, 2, 0, 2, 1,
    ]);
    geometry.computeVertexNormals();

    const pyramid = new THREE.Mesh(
      geometry,
      new THREE.MeshStandardMaterial({ color: 0xf59e0b, flatShading: true }),
    );
    ctx.scene.add(pyramid);

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 2);
    ctx.scene.add(dirLight);
    ctx.scene.add(new THREE.GridHelper(8, 8, 0x475569, 0x1e293b));

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      pyramid.rotation.y += 0.008;
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
