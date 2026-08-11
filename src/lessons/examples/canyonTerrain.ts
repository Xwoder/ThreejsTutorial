import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Lesson } from '../types';
import { createContext, loadTexture, makeCleanup } from '../helper';

import heightMapUrl from '../../assets/HeightMap/Canyon Height Maps/Canyon Height Map.png?url';
import diffuseMapUrl from '../../assets/HeightMap/Canyon Height Maps/Canyon Diffuse.png?url';
import normalMapUrl from '../../assets/HeightMap/Canyon Height Maps/Canyon Normal Map.png?url';

/**
 * 加载图片作为纹理，附带错误提示（在 helper.ts 中抽出了通用实现）
 */
function makeLoadingTip(text: string): HTMLDivElement {
  const tip = document.createElement('div');
  tip.textContent = text;
  tip.style.cssText =
    'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;background:rgba(0,0,0,0.4);padding:10px 16px;border-radius:6px;';
  return tip;
}

void makeLoadingTip; // 工具函数保留供将来扩展使用

export const canyonTerrain: Lesson = {
  id: 'example-canyon-heightmap',
  title: '峡谷高度图地形',
  description: `
    <h2>使用 Height Map 构建真实地形</h2>
    <p>本示例使用一张 <b>4096×4096 16 位灰度图</b> 作为<strong>位移贴图（displacementMap）</strong>，在一片细分密集的平面上"雕刻"出峡谷地形，并叠加漫反射贴图、法线贴图还原地表质感。</p>
    <h3>核心概念</h3>
    <ul>
      <li><b>displacementMap</b>：根据贴图灰度（0~1）沿法线方向真正移动顶点，是生成真实地形最直接的方式。顶点越密，地形越精细。</li>
      <li><b>displacementScale</b>：位移幅度（高度差）。值越大，地形越高耸。</li>
      <li><b>normalMap</b>：法线贴图，模拟光照下的微小凹凸细节（与 displacement 互补，开销小）。</li>
      <li><b>map</b>：漫反射贴图，决定地表颜色（沙石、苔藓等）。</li>
    </ul>
    <h3>本例配置</h3>
    <pre><code>const geo = new THREE.PlaneGeometry(200, 200, 256, 256);
const mat = new THREE.MeshStandardMaterial({
  map: diffuseTexture,
  normalMap: normalTexture,
  displacementMap: heightTexture,
  displacementScale: 100,
  normalScale: new THREE.Vector2(1, 1),
});</code></pre>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
    <p><i>提示：4K 灰度图加载体积较大（约 8MB），漫反射/法线更大，模型加载需要数秒。</i></p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x1b1f24);

    // 环境贴图：为岩石表面的 PBR 材质提供基于图像的照明
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
    camera.position.set(80, 70, 80);

    // 暖色阳光 + 冷色天空环境，模拟峡谷黄昏时分
    ctx.scene.add(new THREE.AmbientLight(0x9bb3cc, 0.4));
    const sun = new THREE.DirectionalLight(0xffd5a0, 2.2);
    sun.position.set(80, 120, 60);
    ctx.scene.add(sun);

    // 半球光：给岩石暗部补一点冷色调，更像真实户外
    const hemi = new THREE.HemisphereLight(0xa8c8ff, 0x3a2a18, 0.6);
    ctx.scene.add(hemi);

    // 地面网格（视觉参考）
    ctx.scene.add(new THREE.GridHelper(400, 40, 0x475569, 0x1e293b));

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // 限制相机不要钻到地下
    controls.minDistance = 5;
    controls.maxDistance = 400;
    controls.target.set(0, 25, 0);

    // 加载提示
    const loadingTip = document.createElement('div');
    loadingTip.textContent = '高度图加载中…';
    loadingTip.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;background:rgba(0,0,0,0.4);padding:10px 16px;border-radius:6px;';
    container.appendChild(loadingTip);

    // 纹理状态
    const tex: { height?: THREE.Texture; diffuse?: THREE.Texture; normal?: THREE.Texture } = {};

    const tryBuildTerrain = () => {
      if (!tex.height || !tex.diffuse || !tex.normal) return;

      const geo = new THREE.PlaneGeometry(200, 200, 256, 256);
      // 高度图通常表现为"白色凸起"，我们希望深色偏低 → 翻转高度图采样
      // 但 Canyon Height Map 是直接灰度表示高度（亮=高），所以直接使用即可
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        normalMap: tex.normal,
        displacementMap: tex.height,
        displacementScale: 100, // 控制高度起伏的强度
        // 让 displacement 真正生效，需要足够细分顶点
        normalScale: new THREE.Vector2(1.2, 1.2),
      });

      const terrain = new THREE.Mesh(geo, mat);
      terrain.rotation.x = -Math.PI / 2; // 把平面从 XY 旋转到 XZ 地面
      terrain.position.y = -25; // 下沉以容纳高峰，让地形起伏在视野中
      ctx.scene.add(terrain);

      // 加载完成，移除提示
      loadingTip.remove();
    };

    // 高度图：灰度、线性空间（高度数据，不是颜色）
    loadTexture(
      heightMapUrl,
      (t) => {
        // height map 用线性灰度，不应被解释为 sRGB
        t.colorSpace = THREE.NoColorSpace;
        tex.height = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('Heightmap 加载失败', e);
        loadingTip.textContent = '高度图加载失败，请检查网络';
      },
    );

    // 漫反射贴图：sRGB 颜色
    loadTexture(
      diffuseMapUrl,
      (t) => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.flipY = true;
        tex.diffuse = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('Diffuse 加载失败', e);
      },
    );

    // 法线贴图：线性空间
    loadTexture(
      normalMapUrl,
      (t) => {
        t.colorSpace = THREE.NoColorSpace;
        t.flipY = true;
        tex.normal = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('NormalMap 加载失败', e);
      },
    );

    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

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
      // 释放纹理
      tex.height?.dispose();
      tex.diffuse?.dispose();
      tex.normal?.dispose();
    });
  },
};
