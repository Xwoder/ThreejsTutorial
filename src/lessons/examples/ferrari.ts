import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

import modelUrl from '../../assets/model/ferrari_296_challenge_2024.glb?url';

export const ferrari: Lesson = {
    id: 'examples/example-ferrari-296-challenge-2024',
  title: '法拉利 296 Challenge (2024)',
  description: `
    <h2>加载 GLB 模型</h2>
    <p>本示例加载另一款真实 3D 模型文件（<code>.glb</code> 格式），同样使用 <b>GLTFLoader</b> 导入场景。模型来自 vecarz.com。</p>
    <pre><code>import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load(url, (gltf) => {
  scene.add(gltf.scene);
});</code></pre>
    <ul>
      <li>加载完成后通过 <code>gltf.scene</code> 拿到模型根节点</li>
      <li>用 <code>Box3</code> 计算包围盒，自动居中、缩放到合适尺寸并接地，让任意尺寸的模型都正好入镜</li>
      <li>该模型文件较大（约 100MB），加载需要一些时间，请耐心等待</li>
    </ul>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    // 环境贴图：为 PBR 材质提供基于图像的照明，让车漆/金属更亮更通透
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(6, 3, 6);

    ctx.scene.add(new THREE.GridHelper(20, 20, 0x475569, 0x1e293b));
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.0));
    const dir = new THREE.DirectionalLight(0xffffff, 3);
    dir.position.set(5, 10, 7);
    ctx.scene.add(dir);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    const loader = new GLTFLoader();
    const loadingTip = document.createElement('div');
    loadingTip.textContent = '模型加载中…（文件较大，请稍候）';
    loadingTip.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;text-align:center;';
    container.appendChild(loadingTip);

    loader.load(
      modelUrl,
      (gltf) => {
        const model = gltf.scene;
        const box = new THREE.Box3().setFromObject(model);
        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        // 居中并缩放，使最长边约为 8 个单位
        const maxDim = Math.max(size.x, size.y, size.z) || 1;
        const scale = 8 / maxDim;
        model.scale.setScalar(scale);
        model.position.sub(center.multiplyScalar(scale));
        model.position.y += (size.y * scale) / 2;
        ctx.scene.add(model);
        loadingTip.remove();
      },
      undefined,
      (err) => {
        loadingTip.textContent = '模型加载失败';
        console.error('GLB 加载失败', err);
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
      pmrem.dispose();
      loadingTip.remove();
    });
  },
};
