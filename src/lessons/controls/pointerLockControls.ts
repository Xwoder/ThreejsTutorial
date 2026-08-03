import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const pointerLockControls: Lesson = {
  id: 'pointer-lock-controls',
  title: 'PointerLockControls 指针锁定控制器',
  description: `
    <h2>沉浸式第一人称（FPS 风格）</h2>
    <p><code>PointerLockControls</code> 通过<b>指针锁定 API</b>隐藏鼠标光标并捕获鼠标移动，实现真正的 FPS 视角控制。点击画布进入锁定，再次按 <b>Esc</b> 退出：</p>
    <pre><code>import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const controls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.addEventListener('click', () => controls.lock());

// 用速度向量手动移动相机：
controls.moveRight(-velocity.x * delta);
controls.moveForward(-velocity.z * delta);</code></pre>
    <h3>操作方式</h3>
    <ul>
      <li><b>点击画布</b>：进入指针锁定状态</li>
      <li><b>W / A / S / D</b> 或 <b>方向键</b>：前后左右移动</li>
      <li><b>鼠标移动</b>：转向（锁定后生效）</li>
      <li><b>Esc</b>：退出指针锁定状态</li>
    </ul>
    <h3>常用配置</h3>
    <pre><code>controls.isLocked;                 // 当前是否处于锁定状态
controls.addEventListener('lock', () => {});
controls.addEventListener('unlock', () => {});</code></pre>
    <p>点击画布开始走动：本例用 PointerLockControls 在场地里漫游，含简单的边界限制。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0a0f1c);
    ctx.scene.fog = new THREE.FogExp2(0x0a0f1c, 0.006);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    camera.position.set(0, 1.7, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const grid = new THREE.GridHelper(200, 100, 0x475569, 0x1e293b);
    ctx.scene.add(grid);

    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.2, roughness: 0.6 });
    for (let i = 0; i < 80; i++) {
      const box = new THREE.Mesh(boxGeo, boxMat);
      box.position.set(
        (Math.random() - 0.5) * 90,
        1 + Math.random() * 3,
        -4 - Math.random() * 70,
      );
      ctx.scene.add(box);
    }

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(20, 30, 10);
    ctx.scene.add(dirLight);

    const controls = new PointerLockControls(camera, ctx.renderer.domElement);

    const tip = document.createElement('div');
    tip.textContent = '点击画布进入第一人称（Esc 退出）';
    tip.style.cssText = `
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      padding: 10px 16px; border-radius: 8px; background: rgba(15,23,42,.8);
      color: #e2e8f0; font: 14px sans-serif; pointer-events: none; user-select: none;
    `;
    container.appendChild(tip);

    const onClick = () => controls.lock();
    ctx.renderer.domElement.addEventListener('click', onClick);
    const onLock = () => (tip.style.display = 'none');
    const onUnlock = () => (tip.style.display = '');
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    const keys = { forward: false, backward: false, left: false, right: false };
    const onKeyDown = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.forward = true; break;
        case 'KeyS': case 'ArrowDown': keys.backward = true; break;
        case 'KeyA': case 'ArrowLeft': keys.left = true; break;
        case 'KeyD': case 'ArrowRight': keys.right = true; break;
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyW': case 'ArrowUp': keys.forward = false; break;
        case 'KeyS': case 'ArrowDown': keys.backward = false; break;
        case 'KeyA': case 'ArrowLeft': keys.left = false; break;
        case 'KeyD': case 'ArrowRight': keys.right = false; break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const velocity = new THREE.Vector3();
    const direction = new THREE.Vector3();
    const clock = new THREE.Clock();
    const BOUND = 95;

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const delta = Math.min(clock.getDelta(), 0.1);

      velocity.x -= velocity.x * 8 * delta;
      velocity.z -= velocity.z * 8 * delta;

      direction.z = Number(keys.forward) - Number(keys.backward);
      direction.x = Number(keys.right) - Number(keys.left);
      direction.normalize();

      if (keys.forward || keys.backward) velocity.z -= direction.z * 40 * delta;
      if (keys.left || keys.right) velocity.x -= direction.x * 40 * delta;

      controls.moveRight(-velocity.x * delta);
      controls.moveForward(-velocity.z * delta);

      camera.position.x = THREE.MathUtils.clamp(camera.position.x, -BOUND, BOUND);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z, -BOUND, BOUND);
      camera.position.y = 1.7;

      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      ctx.renderer.domElement.removeEventListener('click', onClick);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      tip.remove();
      controls.dispose();
    });
  },
};
