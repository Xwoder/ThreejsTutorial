import * as THREE from 'three';
import { MapControls } from 'three/examples/jsm/controls/MapControls.js';
import type { Lesson } from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;

export const mapControls: Lesson = {
  id: 'controls/map-controls',
  title: 'MapControls 地图控制器',
  description: `
    <h2>像地图软件一样浏览场景</h2>
    <p><code>MapControls</code> 继承自 <code>OrbitControls</code>，唯一的区别在于<b>平移方式</b>：OrbitControls 的右键平移是沿相机视角移动，而 MapControls 的平移被约束在<b>屏幕平面</b>内，就像拖拽一张地图，非常适合俯视浏览地面/城市/地形：</p>
    <pre><code>import { MapControls } from 'three/examples/jsm/controls/MapControls.js';

const controls = new MapControls(camera, renderer.domElement);
controls.enableDamping = true;   // 惯性阻尼
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2.05; // 不允许翻到地面以下

// 动画循环中必须调用：
controls.update();</code></pre>
    <h3>操作方式</h3>
    <ul>
      <li><b>左键拖动</b>：在地面平移（像拖地图）</li>
      <li><b>滚轮</b>：缩放（拉远拉近）</li>
      <li><b>右键拖动</b>：环绕旋转视角</li>
    </ul>
    <h3>常用配置</h3>
    <pre><code>controls.screenSpacePanning = false; // MapControls 固定为 false（地面平移）
controls.minDistance = 3;            // 最近距离
controls.maxDistance = 40;           // 最远距离
controls.maxPolarAngle = Math.PI / 2;// 限制不能翻到地面下</code></pre>
    <p>本例搭建了一个俯视小城：用左键像拖地图一样浏览，滚轮缩放，右键旋转俯仰观察建筑。</p>
  `,
  create(container) {
    const ctx = createContext(container);
      setSceneBackground(ctx, 0x0b1220);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 200);
    camera.position.set(0, 14, 18);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    // 地面
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.95 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ctx.scene.add(ground);

    ctx.scene.add(new THREE.GridHelper(60, 30, 0x334155, 0x1e293b));

    // 用一排排"建筑"模拟城市，方便演示地图平移
    const buildingMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.2, roughness: 0.6 });
    const accentMat = new THREE.MeshStandardMaterial({ color: 0xf472b6, metalness: 0.2, roughness: 0.6 });
    for (let x = -4; x <= 4; x++) {
      for (let z = -4; z <= 4; z++) {
        const h = 1 + Math.random() * 4;
        const box = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, h, 1.6),
          (x + z) % 5 === 0 ? accentMat : buildingMat,
        );
        box.position.set(x * 3, h / 2, z * 3);
        ctx.scene.add(box);
      }
    }

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 18, 8);
    ctx.scene.add(dirLight);

    const controls = new MapControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 3;
    controls.maxDistance = 50;
    controls.maxPolarAngle = Math.PI / 2;
    controls.target.set(0, 0, 0);

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
    });
  },
};
