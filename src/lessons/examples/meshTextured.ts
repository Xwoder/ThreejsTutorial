import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

import modelUrl from '../../assets/mesh_textured_moved_nn_smooth_moved.fbx?url';

export const meshTextured: Lesson = {
  id: 'example-mesh-textured-fbx',
  title: '带贴图网格模型 (FBX)',
  description: `
    <h2>加载 FBX 模型</h2>
    <p>本示例加载一个 <code>.fbx</code> 格式的 3D 模型文件，展示如何使用 <b>FBXLoader</b> 把外部模型导入场景。FBX 是工业界常用的 3D 交换格式，常带有骨骼、动画与贴图。</p>
    <pre><code>import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
const loader = new FBXLoader();
loader.load(url, (object) => {
  scene.add(object);
});</code></pre>
    <ul>
      <li><code>FBXLoader</code> 来自 <code>three/examples/jsm/loaders/FBXLoader.js</code></li>
      <li>加载完成后得到的是 <code>Group</code> 根节点，直接加入场景即可</li>
      <li>FBX 常使用 Y 轴向上、单位尺度不固定，用 <code>Box3</code> 计算包围盒自动居中、缩放并接地</li>
      <li>模型自带的贴图通常由加载器自动跟随读取</li>
    </ul>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(6, 3, 6);

    ctx.scene.add(new THREE.GridHelper(20, 20, 0x475569, 0x1e293b));
    const ambient = new THREE.AmbientLight(0xffffff, 1.0);
    ctx.scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 3);
    dir.position.set(5, 10, 7);
    ctx.scene.add(dir);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    const loader = new FBXLoader();
    const loadingTip = document.createElement('div');
    loadingTip.textContent = '模型加载中…';
    loadingTip.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;';
    container.appendChild(loadingTip);

    loader.load(
      modelUrl,
      (object) => {
        const box = new THREE.Box3().setFromObject(object);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // 居中并缩放，使最长边约为 8 个单位
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 8 / maxDim;
        object.scale.setScalar(scale);
        object.position.sub(center.multiplyScalar(scale));
        object.position.y += (size.y * scale) / 2;
        ctx.scene.add(object);
        loadingTip.remove();
      },
      undefined,
      (err) => {
        loadingTip.textContent = '模型加载失败';
        console.error('FBX 加载失败', err);
      },
    );

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
      loadingTip.remove();
    });
  },
};
