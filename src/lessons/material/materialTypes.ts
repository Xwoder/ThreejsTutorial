import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const materialTypes: Lesson = {
  id: 'material-types',
  title: '常用材质对比',
  description: `
    <h2>Material</h2>
    <p>材质决定物体表面如何渲染。Three.js 提供了多种材质，它们对<b>光照</b>的反应各不相同：</p>
    <ul>
      <li><b>MeshBasicMaterial</b>：不受光照影响，纯色显示。适合线框、调试、不需要真实感的场景。</li>
      <li><b>MeshNormalMaterial</b>：把法线方向映射为颜色，常用于调试几何体。</li>
      <li><b>MeshStandardMaterial</b>：基于物理的 PBR 材质，有金属度（metalness）和粗糙度（roughness），效果最真实。</li>
      <li><b>MeshPhongMaterial</b>：经典高光材质，有 shininess 参数。</li>
    </ul>
    <pre><code>new THREE.MeshStandardMaterial({
  color: 0x60a5fa,
  metalness: 0.6,  // 0 = 非金属, 1 = 纯金属
  roughness: 0.2,  // 0 = 镜面光滑, 1 = 完全粗糙
})</code></pre>
    <h3>对比观察</h3>
    <p>画布中四个球体分别使用上述四种材质，场景里有灯光。注意 <b>Basic</b> 不受光、<b>Standard</b> 有细腻的高光过渡。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1.5, 6);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const materials = [
      new THREE.MeshBasicMaterial({ color: 0x60a5fa }),
      new THREE.MeshNormalMaterial(),
      new THREE.MeshStandardMaterial({ color: 0x60a5fa, metalness: 0.6, roughness: 0.2 }),
      new THREE.MeshPhongMaterial({ color: 0x60a5fa, shininess: 80 }),
    ];
    const meshes: THREE.Mesh[] = [];
    materials.forEach((mat, i) => {
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 24), mat);
      mesh.position.set((i - 1.5) * 2.1, 0, 0);
      meshes.push(mesh);
      ctx.scene.add(mesh);
    });

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(3, 5, 4);
    ctx.scene.add(dirLight);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      meshes.forEach((m) => (m.rotation.y += 0.01));
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
