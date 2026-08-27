import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Lesson } from '../types';
import {createContext, loadTexture, makeCleanup, setSceneBackground, BG_SKY} from '../helper';


import heightMapUrl from '../../assets/HeightMap/Mountain Range 8k Height Map/Mountain Range Height Map PNG.png?url';
import diffuseMapUrl from '../../assets/HeightMap/Mountain Range 8k Height Map/Mountain Range Diffuse PNG.png?url';

export const mountainRangeTerrain: Lesson = {
  id: 'examples/example-mountain-range-heightmap',
  title: '山脉高度图地形',
  description: `
    <h2>使用 8K Height Map 构建巍峨山脉</h2>
    <p>本示例使用一张 <b>8192×8192 16 位灰度图</b> 作为<strong>位移贴图（displacementMap）</strong>，在细分的平面上"雕刻"出连绵起伏的山脉地形，并叠加漫反射贴图还原地表颜色。同时将高度图复用为 <strong>bumpMap</strong>，在不增加纹理开销的情况下补充微观凹凸细节。</p>
    <h3>核心概念</h3>
    <ul>
      <li><b>displacementMap</b>：根据灰度值沿法线方向移动顶点。顶点越密（细分越高），地形越精细。8K 分辨率提供了极为丰富的细节。</li>
      <li><b>displacementScale</b>：位移幅度。山脉场景使用较大的缩放值（140），营造高耸的视觉效果。</li>
      <li><b>bumpMap</b>：复用高度图做凹凸贴图，仅影响光照计算（不移动顶点），以极低开销补充微观细节。</li>
      <li><b>map</b>：漫反射贴图，为地形表面提供真实的颜色（雪顶、岩石、植被等）。</li>
    </ul>
    <h3>本例配置</h3>
    <pre><code>const geo = new THREE.PlaneGeometry(200, 200, 512, 512);
const mat = new THREE.MeshStandardMaterial({
  map: diffuseTexture,
  displacementMap: heightTexture,
  displacementScale: 140,
  bumpMap: heightTexture,
  bumpScale: 0.8,
  roughness: 0.85,
  metalness: 0.02,
});</code></pre>
    <h3>技术要点</h3>
    <ul>
      <li>平面细分为 <b>512×512 段</b>（共 262,144 个顶点），使 8K 高度图的细节得以充分展现。</li>
      <li>8K 高度图 PNG 约 ~8MB，漫反射 PNG 约 ~30MB，初始加载需要数秒。</li>
      <li>高度图设置为 <code>NoColorSpace</code>（线性数据空间），漫反射设置为 <code>SRGBColorSpace</code>。</li>
      <li>场景模拟晴朗山区的光照：暖色主光模拟阳光 + 冷色环境光模拟天空散射 + 半球光补暗部。</li>
    </ul>
    <p>用鼠标拖动环绕观察，滚轮缩放。</p>
  `,
  create(container) {
    const ctx = createContext(container);
      setSceneBackground(ctx, BG_SKY); // 天蓝色背景，模拟晴空

    // 课程切换后置为 true：此后加载完成的贴图会被立即释放，而非应用到已销毁的材质
    let disposed = false;
    const alive = () => !disposed;

    // 环境贴图：为 PBR 材质提供基于图像的照明
    const pmrem = new THREE.PMREMGenerator(ctx.renderer);
    ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 5000);
    camera.position.set(100, 90, 100);

    // 模拟晴朗山区的光照
    // 暖色阳光（主光），模拟低角度日照
    const sun = new THREE.DirectionalLight(0xffeedd, 2.5);
    sun.position.set(120, 150, 80);
    ctx.scene.add(sun);

    // 填充光：冷色调，模拟天空散射光
    const fill = new THREE.DirectionalLight(0xaaccff, 0.8);
    fill.position.set(-60, 80, -40);
    ctx.scene.add(fill);

    // 半球光：天空冷色 + 地面暖色反射
    const hemi = new THREE.HemisphereLight(0xb1e1ff, 0x5b4a3a, 0.7);
    ctx.scene.add(hemi);

    // 地面网格参考：边长与地形平面(200×200)保持一致
    ctx.scene.add(new THREE.GridHelper(200, 40, 0x556677, 0x334455));

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // 限制相机不要钻到地下
    controls.minDistance = 5;
    controls.maxDistance = 500;
    controls.target.set(0, 55, 0); // 对准地形中部（高度 0~140 的中点附近），构图居中

    // 加载提示
    const loadingTip = document.createElement('div');
    loadingTip.textContent = '8K 山脉高度图加载中…';
    loadingTip.style.cssText =
      'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;background:rgba(0,0,0,0.4);padding:10px 16px;border-radius:6px;';
    container.appendChild(loadingTip);

    const tex: { height?: THREE.Texture; diffuse?: THREE.Texture } = {};
    let built = false;

    const tryBuildTerrain = () => {
      if (built || !tex.height || !tex.diffuse) return;

      // 512×512 分段以匹配 8K 高度图的细节密度
      const geo = new THREE.PlaneGeometry(200, 200, 512, 512);
      const mat = new THREE.MeshStandardMaterial({
        map: tex.diffuse,
        // 位移贴图：真正移动顶点生成山脉地形
        displacementMap: tex.height,
        displacementScale: 200, // 增大位移幅度，使山峰更高耸
        // 凹凸贴图：复用高度图，低开销补充微观凹凸细节
        bumpMap: tex.height,
        bumpScale: 0.8,
        roughness: 0.85,
        metalness: 0.02,
        side: THREE.DoubleSide, // 双面渲染，从下方仰望时底面也实心可见
      });

      const terrain = new THREE.Mesh(geo, mat);
      terrain.rotation.x = -Math.PI / 2; // 将平面从 XY 旋转到 XZ 地面
      terrain.position.y = 0; // 地形基面与参考网格(y=0)齐平，山脉从地面拔起
      ctx.scene.add(terrain);

      built = true;
      loadingTip.remove();
    };

    // 高度图：线性数据空间（高度数据，非颜色）
    loadTexture(
      heightMapUrl,
      (t) => {
        tex.height = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('Mountain Range Heightmap 加载失败', e);
        loadingTip.textContent = '高度图加载失败，请检查网络';
      },
        {colorSpace: THREE.NoColorSpace, alive},
    );

    // 漫反射贴图：sRGB 颜色空间
    loadTexture(
      diffuseMapUrl,
      (t) => {
        tex.diffuse = t;
        tryBuildTerrain();
      },
      (e) => {
        console.error('Mountain Range Diffuse 加载失败', e);
      },
        {colorSpace: THREE.SRGBColorSpace, flipY: true, alive},
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
      disposed = true;
      cancelAnimationFrame(raf);
      controls.dispose();
      pmrem.dispose();
      loadingTip.remove();
      tex.height?.dispose();
      tex.diffuse?.dispose();
    });
  },
};
