import * as THREE from 'three';
import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const trackballControls: Lesson = {
  id: 'trackball-controls',
  title: 'TrackballControls 轨迹球控制器',
  description: `
    <h2>无约束的自由旋转</h2>
    <p><code>TrackballControls</code> 与 <code>OrbitControls</code> 不同，它没有固定"上方向"的限制，可以<b>任意角度翻转</b>，像握住一个轨迹球一样拖动场景：</p>
    <pre><code>import { TrackballControls } from 'three/examples/jsm/controls/TrackballControls.js';

const controls = new TrackballControls(camera, renderer.domElement);
controls.rotateSpeed = 3.0;     // 旋转速度
controls.zoomSpeed = 1.2;       // 缩放速度
controls.panSpeed = 0.8;        // 平移速度

// 动画循环中必须调用：
controls.update();</code></pre>
    <h3>操作方式</h3>
    <ul>
      <li><b>左键拖动</b>：旋转（无上下方向限制）</li>
      <li><b>滚轮</b>：缩放</li>
      <li><b>右键拖动</b>：平移</li>
    </ul>
    <h3>常用配置</h3>
    <pre><code>controls.staticMoving = false;   // 拖动结束后是否平滑停止
controls.dynamicDampingFactor = 0.15; // 阻尼系数</code></pre>
    <p>试试在画布中拖动：本例用轨迹球自由旋转一个几何体，可任意翻转到背面。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0f172a);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(4, 3, 6);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(12, 12, 0x475569, 0x1e293b));
    const mesh = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.4, 1),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.4, roughness: 0.3, flatShading: true }),
    );
    mesh.position.y = 1.6;
    ctx.scene.add(mesh);

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.3);
    dirLight.position.set(4, 6, 3);
    ctx.scene.add(dirLight);

    const controls = new TrackballControls(camera, ctx.renderer.domElement);
    controls.rotateSpeed = 3.0;
    controls.zoomSpeed = 1.2;
    controls.panSpeed = 0.8;
    controls.staticMoving = false;
    controls.dynamicDampingFactor = 0.15;
    controls.target.set(0, 1.5, 0);

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
