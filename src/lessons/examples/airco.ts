import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Lesson } from '../types';
import {createContext, disposeObject3D, makeCleanup, setSceneBackground, BG_DARK} from '../helper';

import {createParamPanel} from '../../utils/paramPanel.ts';

import modelUrl from '../../assets/model/AIRCO_DH2_v2_by_Joshua_Johanson_9iVI9GHMleJ.glb?url';

export const airco: Lesson = {
    id: 'examples/example-airco-dh2',
  title: 'AIRCO DH2 (一战双翼机)',
  description: `
    <h2>加载 GLB 模型</h2>
    <p>本示例加载一款一战时期的双翼战斗机模型（<code>.glb</code> 格式），同样使用 <b>GLTFLoader</b> 导入场景。模型作者为 Joshua Johanson。</p>
    <pre><code>import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
const loader = new GLTFLoader();
loader.load(url, (gltf) => {
  scene.add(gltf.scene);
});</code></pre>
    <ul>
      <li>加载完成后通过 <code>gltf.scene</code> 拿到模型根节点</li>
      <li>用 <code>Box3</code> 计算包围盒，自动居中、缩放到合适尺寸并接地，让任意尺寸的模型都正好入镜</li>
      <li>双翼机这类细长模型在自动居中后依然可以用轨道控制器环绕观察</li>
    </ul>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
  `,
  create(container) {
    const ctx = createContext(container);
      setSceneBackground(ctx, BG_DARK);

    // 环境贴图：为 PBR 材质提供基于图像的照明
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);
    camera.position.set(6, 3, 6);

    ctx.scene.add(new THREE.GridHelper(20, 20, 0x475569, 0x1e293b));
    // 暖黄色环境光：给整个场景（含机翼）染上一层暖色调
      const ambient = new THREE.AmbientLight(0xffd9a0, 1);
      ctx.scene.add(ambient);

      const panel = createParamPanel({
          container,
          controls: [
              {
                  key: 'ambient',
                  label: '环境光强度',
                  min: 0,
                  max: 5,
                  step: 0.1,
                  value: 1,
                  desc: '暖黄色环境光 AmbientLight',
                  precision: 2
              },
          ],
          defaults: {ambient: 1},
          onChange: (key, value) => {
              if (key === 'ambient') ambient.intensity = value;
          },
      });

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

      // 课程切换后置为 true：已下载的模型会被立即释放，而非加入已销毁的场景
      let disposed = false;

    const loader = new GLTFLoader();
    let model: THREE.Object3D | null = null;
    const loadingTip = document.createElement('div');
    loadingTip.textContent = '模型加载中…';
    loadingTip.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;';
    container.appendChild(loadingTip);

    loader.load(
      modelUrl,
      (gltf) => {
          if (disposed) {
              // 课程已切换：释放刚下载的模型资源，避免显存泄漏
              disposeObject3D(gltf.scene);
              return;
          }
        model = gltf.scene;
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
          if (disposed) return;
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
        disposed = true;
      cancelAnimationFrame(raf);
      controls.dispose();
      pmrem.dispose();
      loadingTip.remove();
        panel.remove();
    });
  },
};
