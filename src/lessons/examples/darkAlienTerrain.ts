import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Lesson } from '../types';
import { createContext, loadTexture, makeCleanup } from '../helper';

import heightMapUrl from '../../assets/model/height/Dark_Alien_Landscape_Height_Map/Height Map.png?url';
import diffuseMapUrl from '../../assets/model/height/Dark_Alien_Landscape_Height_Map/Diffuse Map.png?url';

export const darkAlienTerrain: Lesson = {
  id: 'example-dark-alien-heightmap',
  title: '暗色外星地形（高度图）',
  description: `
    <h2>使用 Height Map 构建暗色外星地貌</h2>
    <p>本示例使用一张 <b>2048×2048 16 位灰度图</b> 作为<strong>位移贴图（displacementMap）</strong>，叠加同一份灰度贴图作为 <strong>bumpMap</strong>（无需法线贴图也能模拟细微凹凸），再搭配一张 <strong>Diffuse Map</strong> 上色，复刻一种"低对比、暗黑、未来感"的异星地表。</p>
    <h3>与峡谷示例的关键差异</h3>
    <ul>
      <li>高度图分辨率较小（2048×2048 vs 4096×4096），但位移效果依然细腻。</li>
      <li><b>同时把同一张高度图作为 bumpMap 复用</b>——用一张图同时承担"宏观起伏"和"微观凹凸"，省去法线贴图。</li>
      <li><b>bumpMap vs normalMap</b>：bumpMap 只用高度通道（每像素 1 个值），开销极低；normalMap 用三通道编码空间方向，更细致但纹理体积大。两者各有所长。</li>
      <li>本例刻意压低整体光照强度（高 <code>roughness</code>），让暗部也能看清岩石纹理，呼应"外星"的低光氛围。</li>
    </ul>
    <h3>本例配置</h3>
    <pre><code>const geo = new THREE.PlaneGeometry(150, 150, 256, 256);
const mat = new THREE.MeshStandardMaterial({
  map: diffuseTexture,
  bumpMap: heightTexture,       // 同时复用做凹凸
  bumpScale: 0.6,
  displacementMap: heightTexture,
  displacementScale: 30,
  roughness: 0.95,              // 暗色岩石的高粗糙度
  metalness: 0.05,
});</code></pre>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
    <p><i>提示：本例仅使用 2 张 PNG（高度图约 3MB，漫反射约 21MB），构建完成后即可平滑交互。</i></p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x05080f);

    // 环境贴图：让 PBR 材质在金属/粗糙度上有可读的高光变化
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
    camera.position.set(60, 50, 60);

    // 冷色环境光 + 微微偏紫的月光，呈现"异星深夜"质感
    const moon = new THREE.DirectionalLight(0xcfd9ff, 1.4);
    moon.position.set(-50, 90, -30);
    ctx.scene.add(moon);

    const fill = new THREE.DirectionalLight(0x9070ff, 0.5);
    fill.position.set(40, 60, 30);
    ctx.scene.add(fill);

    const hemi = new THREE.HemisphereLight(0x6a78a8, 0x1a0f30, 0.55);
    ctx.scene.add(hemi);

    // 星空背景：粒子星点
    const starCount = 1500;
    const starPos = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const r = 800;
      const u = Math.random(), v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPos[i * 3 + 1] = r * Math.cos(phi);
      starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    const starMat = new THREE.PointsMaterial({
      color: 0xbfcfff,
      size: 1.6,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
    });
    ctx.scene.add(new THREE.Points(starGeo, starMat));

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.04;
    controls.minDistance = 5;
    controls.maxDistance = 400;
    controls.target.set(0, 5, 0);

    // 加载提示
    const loadingTip = document.createElement('div');
    loadingTip.textContent = '地形加载中…';
    loadingTip.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;background:rgba(0,0,0,0.45);padding:10px 16px;border-radius:6px;';
    container.appendChild(loadingTip);

    const tex: { height?: THREE.Texture; diffuse?: THREE.Texture } = {};
    let built = false;

    const tryBuildTerrain = () => {
      if (built || !tex.height || !tex.diffuse) return;

      const geo = new THREE.PlaneGeometry(150, 150, 256, 256);
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        // 复用 heightMap 做微观凹凸（无需 NormalMap）
        bumpMap: tex.height,
        bumpScale: 0.6,
        displacementMap: tex.height,
        displacementScale: 30,
        roughness: 0.95,
        metalness: 0.05,
      });

      const terrain = new THREE.Mesh(geo, mat);
      terrain.rotation.x = -Math.PI / 2;
      terrain.position.y = -8;
      ctx.scene.add(terrain);

      // 水面：在最低处铺一层半透明"水"
      const water = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 150),
        new THREE.MeshPhysicalMaterial({
          color: 0x223046,
          roughness: 0.15,
          metalness: 0,
          transmission: 0.55,
          thickness: 1.2,
          ior: 1.33,
          transparent: true,
          opacity: 0.85,
        }),
      );
      water.rotation.x = -Math.PI / 2;
      water.position.y = -22; // 在地形最低点以下
      ctx.scene.add(water);

      built = true;
      loadingTip.remove();
    };

    // 高度图：数据空间（同时做 displacementMap 和 bumpMap）
    loadTexture(
      heightMapUrl,
      (t) => {
        tex.height = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('Heightmap 加载失败', e);
        loadingTip.textContent = '高度图加载失败，请检查网络';
      },
      { colorSpace: THREE.NoColorSpace },
    );

    // 漫反射：sRGB
    loadTexture(
      diffuseMapUrl,
      (t) => {
        tex.diffuse = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('Diffuse 加载失败', e);
      },
      { colorSpace: THREE.SRGBColorSpace, flipY: true },
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
      starGeo.dispose();
      starMat.dispose();
      loadingTip.remove();
      tex.height?.dispose();
      tex.diffuse?.dispose();
    });
  },
};
