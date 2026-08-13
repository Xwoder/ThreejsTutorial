import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';
import {AxesWithLabels} from '../../utils/AxesWithLabels.ts';

export const animationLoop: Lesson = {
  id: 'animation/animation-loop',
  title: '动画循环与时间',
  description: `
    <h2>requestAnimationFrame</h2>
    <p>动画的本质是<b>每一帧修改属性、再重新渲染</b>。浏览器提供 <code>requestAnimationFrame</code> 在屏幕刷新前执行回调（通常 60 次/秒）：</p>
    <pre><code>function loop() {
  requestAnimationFrame(loop);
  cube.rotation.y += 0.01;
  renderer.render(scene, camera);
}
loop();</code></pre>
    <h3>为什么需要 Clock？</h3>
    <p>不同设备帧率不同（60Hz / 120Hz），每帧固定 <code>+= 0.01</code> 会让高刷屏动画变快。正确做法是<b>用经过的时间计算位置</b>：</p>
    <pre><code>const clock = new THREE.Clock();
const t = clock.getElapsedTime(); // 启动以来的秒数
cube.position.y = Math.sin(t * 2);  // 每秒 2 弧度，与帧率无关</code></pre>
    <h3>观察要点</h3>
    <p>画布中的立方体使用 <code>sin/cos</code> 做<b>浮动 + 环绕 + 自转</b>复合动画，任何设备上速度一致。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 1, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x1e293b));
    ctx.scene.add(new AxesWithLabels(3));
    const cube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x34d399, roughness: 0.3 }),
    );
    ctx.scene.add(cube);

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 5, 2);
    ctx.scene.add(dirLight);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      cube.position.set(Math.cos(t) * 2, 1 + Math.sin(t * 2) * 0.5, Math.sin(t) * 2);
      cube.rotation.x = t;
      cube.rotation.y = t * 1.5;
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
