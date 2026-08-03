import * as THREE from 'three';
import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const flyControls: Lesson = {
  id: 'fly-controls',
  title: 'FlyControls 飞行控制器',
  description: `
    <h2>像开飞机一样在场景中飞行</h2>
    <p><code>FlyControls</code> 模拟飞行器操控，相机可<b>前后推进、左右平移、俯仰与滚转</b>，没有重力与"上方向"约束，适合第一人称漫游或大场景探索：</p>
    <pre><code>import { FlyControls } from 'three/examples/jsm/controls/FlyControls.js';

const controls = new FlyControls(camera, renderer.domElement);
controls.movementSpeed = 10;     // 移动速度
controls.rollSpeed = Math.PI / 6; // 滚转速度
controls.dragToLook = true;      // 仅按住鼠标时转向

// 动画循环中必须调用：
controls.update(delta);</code></pre>
    <h3>操作方式</h3>
    <ul>
      <li><b>W / S</b>：前进 / 后退</li>
      <li><b>A / D</b>：左移 / 右移</li>
      <li><b>R / F</b>：上升 / 下降</li>
      <li><b>方向键 / 鼠标拖动</b>：俯仰与偏航（dragToLook 下需按住左键）</li>
      <li><b>Q / E</b>：滚转</li>
    </ul>
    <h3>常用配置</h3>
    <pre><code>controls.autoForward = false;    // 是否自动前进
controls.dragToLook = true;      // 拖拽时才转向，否则持续跟随鼠标</code></pre>
    <p>试试在画布中操作：按住左键拖动转向，用 WASD 自由飞行穿过网格空间。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0b1120);
    ctx.scene.fog = new THREE.FogExp2(0x0b1120, 0.02);

    const camera = new THREE.PerspectiveCamera(70, 1, 0.1, 1000);
    camera.position.set(0, 2, 8);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const grid = new THREE.GridHelper(200, 100, 0x475569, 0x1e293b);
    ctx.scene.add(grid);

    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, metalness: 0.2, roughness: 0.6 });
    for (let i = 0; i < 40; i++) {
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(
        (Math.random() - 0.5) * 80,
        Math.random() * 10,
        (Math.random() - 0.5) * 80,
      );
      ctx.scene.add(box);
    }

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    ctx.scene.add(dirLight);

    const controls = new FlyControls(camera, ctx.renderer.domElement);
    controls.movementSpeed = 12;
    controls.rollSpeed = Math.PI / 6;
    controls.autoForward = false;
    controls.dragToLook = true;

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      controls.update(delta);
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
    });
  },
};
