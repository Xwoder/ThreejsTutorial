import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK} from '../helper';


type ViewMode = 'geometry' | 'edges' | 'wireframe';

export const customGeometry: Lesson = {
  id: 'geometry/custom-geometry',
  title: '自定义几何体',
  description: `
    <h2>BufferGeometry</h2>
    <p>当内置几何体无法满足需求时，可以用 <code>BufferGeometry</code> 手动指定顶点来构建任意形状。</p>
    <h3>核心概念</h3>
    <ul>
      <li><b>position 属性</b>：每 3 个数字表示一个顶点的 x/y/z</li>
      <li><b>index</b>：用顶点索引描述哪些顶点组成三角形</li>
      <li><b>法线</b>：可用 <code>computeVertexNormals()</code> 自动计算</li>
      <li><b>缠绕顺序</b>：三角形顶点的排列顺序决定法线朝向，排反了面会“黑掉”</li>
    </ul>
    <pre><code>// 切面钻石：底部尖点 + 腰部 8 点 + 顶部 8 点 + 顶部尖点
const positions = new Float32Array([
  0, -1.6, 0,            // 0   底部尖点
  // 1~8 腰部一圈（y = 0，半径 1）
  1, 0, 0, 0.7, 0, 0.7, 0, 0, 1, -0.7, 0, 0.7,
  -1, 0, 0, -0.7, 0, -0.7, 0, 0, -1, 0.7, 0, -0.7,
  // 9~16 顶部一圈（y = 0.9，半径 0.55，错位 22.5°）
  0.55, 0.9, 0, 0.39, 0.9, 0.39, 0, 0.9, 0.55,
  -0.39, 0.9, 0.39, -0.55, 0.9, 0, -0.39, 0.9, -0.39,
  0, 0.9, -0.55, 0.39, 0.9, -0.39,
  0, 1.8, 0,             // 17  顶部尖点
]);
geometry.setAttribute('position',
  new THREE.BufferAttribute(positions, 3));

// 底部锥 8 面 + 腰部 16 面 + 顶部锥 8 面 = 32 面
const faces: number[] = [];
const at = (i: number) => new THREE.Vector3(
  positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
const addFace = (a: number, b: number, c: number) => {
  const pa = at(a), pb = at(b), pc = at(c);
  const normal = pb.clone().sub(pa).cross(pc.clone().sub(pa));
  const center = pa.clone().add(pb).add(pc).divideScalar(3);
  if (normal.dot(center) &lt; 0) [b, c] = [c, b]; // 法线朝外
  faces.push(a, b, c);
};
for (let i = 0; i &lt; 8; i++) {
  const j = (i + 1) % 8;
  addFace(0, 1 + i, 1 + j);      // 底部锥
  addFace(1 + i, 1 + j, 9 + i);  // 腰部下
  addFace(1 + j, 9 + j, 9 + i);  // 腰部上
  addFace(17, 9 + i, 9 + j);     // 顶部锥
}
geometry.setIndex(faces);
geometry.computeVertexNormals();</code></pre>
    <p>画布中是一颗手工构建的<b>切面钻石</b>：18 个顶点、32 个三角形，使用标准材质 + 灯光渲染，验证法线与缠绕顺序计算正确。</p>
    <p>左上角提供 3 个选项卡：<b>几何体</b>（标准材质渲染）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。钻石的每个切面都是平面、相邻面有明显夹角，两种线框模式能清楚看到 32 个三角面的划分。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    setSceneBackground(ctx, BG_DARK);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(3.2, 2.6, 3.8);
    camera.lookAt(0, 0.8, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const buildGeometry = () => {
      const geometry = new THREE.BufferGeometry();
      const positions: number[] = [];
      const add = (x: number, y: number, z: number) => positions.push(x, y, z);

      // 底部尖点
      add(0, -1.6, 0);
      // 腰部一圈 8 点（y = 0，半径 1）
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        add(Math.cos(a), 0, Math.sin(a));
      }
      // 顶部一圈 8 点（y = 0.9，半径 0.55，错位 22.5°）
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
        add(Math.cos(a) * 0.55, 0.9, Math.sin(a) * 0.55);
      }
      // 顶部尖点
      add(0, 1.8, 0);

      geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

      // 底部锥 8 面 + 腰部 16 面 + 顶部锥 8 面 = 32 个三角形
      const faces: number[] = [];
      const at = (i: number) =>
          new THREE.Vector3(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
      const addFace = (a: number, b: number, c: number) => {
        const pa = at(a), pb = at(b), pc = at(c);
        const normal = pb.clone().sub(pa).cross(pc.clone().sub(pa));
        const center = pa.clone().add(pb).add(pc).divideScalar(3);
        // 法线应指向物体外侧，指向内部则交换两个顶点（翻转缠绕顺序）
        if (normal.dot(center) < 0) [b, c] = [c, b];
        faces.push(a, b, c);
      };
      for (let i = 0; i < 8; i++) {
        const j = (i + 1) % 8;
        addFace(0, 1 + i, 1 + j);      // 底部锥
        addFace(1 + i, 1 + j, 9 + i);  // 腰部下
        addFace(1 + j, 9 + j, 9 + i);  // 腰部上
        addFace(17, 9 + i, 9 + j);     // 顶部锥
      }
      geometry.setIndex(faces);
      geometry.computeVertexNormals();
      return geometry;
    };

    const solidMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.3,
      roughness: 0.15,
      flatShading: true,
    });
    const surfaceMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.3,
      roughness: 0.15,
      flatShading: true,
      transparent: true,
      opacity: 0.2,
    });
    const edgeMat = new THREE.LineBasicMaterial({color: 0xffffff});
    const wireMat = new THREE.LineBasicMaterial({color: 0x33e0ff});

    const group = new THREE.Group();
    ctx.scene.add(group);

    let mode: ViewMode = 'geometry';
    const rebuild = () => {
      group.traverse((o) => {
        const mesh = o as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
      });
      group.clear();

      if (mode === 'geometry') {
        group.add(new THREE.Mesh(buildGeometry(), solidMat));
        return;
      }
      const surface = new THREE.Mesh(buildGeometry(), surfaceMat);
      const source = surface.geometry;
      const lines =
          mode === 'edges'
              ? new THREE.LineSegments(new THREE.EdgesGeometry(source), edgeMat)
              : new THREE.LineSegments(new THREE.WireframeGeometry(source), wireMat);
      group.add(surface, lines);
    };
    rebuild();

    // 左上角选项卡：几何体 / 边缘 / 框线
    const tabs = document.createElement('div');
    tabs.className = 'view-tabs';
    const tabDefs: { mode: ViewMode; label: string }[] = [
      {mode: 'geometry', label: '几何体'},
      {mode: 'edges', label: '边缘'},
      {mode: 'wireframe', label: '框线'},
    ];
    const tabBtns: HTMLButtonElement[] = [];
    tabDefs.forEach((def) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = def.label;
      btn.addEventListener('click', () => {
        mode = def.mode;
        tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
        rebuild();
      });
      tabs.appendChild(btn);
      tabBtns.push(btn);
    });
    tabBtns[0].classList.add('active');
    container.appendChild(tabs);

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
      group.rotation.y += 0.008;
      controls.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      solidMat.dispose();
      surfaceMat.dispose();
      edgeMat.dispose();
      wireMat.dispose();
      tabs.remove();
    });
  },
};
