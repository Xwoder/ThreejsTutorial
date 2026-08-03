import * as THREE from 'three';
import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const arcballControls: Lesson = {
  id: 'arcball-controls',
  title: 'ArcballControls 轨迹球控制器',
  description: `
    <h2>更自由的物体旋转</h2>
    <p><code>ArcballControls</code> 是比 <code>OrbitControls</code> 更灵活的轨道控制器，基于<b>轨迹球（Arcball）</b>原理，支持<b>绕任意轴自由旋转、平移、缩放</b>，并能<b>同时旋转多个被选中的物体</b>：</p>
    <pre><code>import { ArcballControls } from 'three/examples/jsm/controls/ArcballControls.js';

const controls = new ArcballControls(camera, renderer.domElement, scene);
controls.enableAnimations = true;   // 过渡动画
controls.enablePan = true;
controls.setGizmosVisible(false);   // 是否显示旋转辅助线</code></pre>
    <h3>操作方式</h3>
    <ul>
      <li><b>左键拖动</b>：旋转视角（可绕任意轴）</li>
      <li><b>右键拖动 / 两指</b>：平移</li>
      <li><b>滚轮 / 双指捏合</b>：缩放</li>
      <li><b>Shift + 左键拖动</b>：框选物体，之后可整体旋转选中物体</li>
    </ul>
    <h3>常用配置</h3>
    <ul>
      <li><code>controls.enableGrid = true</code>：显示地面网格</li>
      <li><code>controls.scaleFactor</code>：缩放灵敏度</li>
      <li><code>controls.dampingFactor</code>：阻尼系数</li>
    </ul>
    <p>试试在画布中拖动：按住 Shift 框选方块，再拖动即可整体旋转它们，也可以使用右上角的工具栏按钮。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0f172a);

    const { width, height } = ctx.getSize();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(6, 5, 8);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(14, 14, 0x475569, 0x1e293b));

    const colors = [0xc084fc, 0x22c55e, 0x38bdf8, 0xf59e0b, 0xef4444];
    colors.forEach((color, i) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 }),
      );
      const angle = (i / colors.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 3, 0.6, Math.sin(angle) * 3);
      ctx.scene.add(mesh);
    });

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 8, 4);
    ctx.scene.add(dirLight);

    const controls = new ArcballControls(camera, ctx.renderer.domElement, ctx.scene);
    controls.enableAnimations = true;
    controls.enablePan = true;
    controls.enableGrid = true;
    controls.setGizmosVisible(true);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
    });
  },
};
