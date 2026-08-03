import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

/**
 * 生成一个带木纹风格的箱体贴图（程序化 Canvas 纹理，避免外部资源依赖）。
 */
function makeWoodTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#8b5a2b';
  c.fillRect(0, 0, size, size);
  for (let i = 0; i < 16; i++) {
    c.strokeStyle = `rgba(60,35,15,${0.2 + Math.random() * 0.3})`;
    c.lineWidth = 1 + Math.random() * 3;
    const y = (i / 16) * size + Math.random() * 6;
    c.beginPath();
    c.moveTo(0, y);
    c.bezierCurveTo(size * 0.33, y - 8, size * 0.66, y + 8, size, y);
    c.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

export const pointerLockControls: Lesson = {
  id: 'pointer-lock-controls',
  title: 'PointerLockControls 指针锁定控制器',
    description: `
    <h2>PointerLockControls 指针锁定控制器</h2>
    <p><code>PointerLockControls</code> 通过<b>指针锁定 API</b>隐藏鼠标光标并捕获鼠标移动，实现沉浸式的第一人称视角控制。点击画布进入锁定，再次按 <b>Esc</b> 退出：</p>
    <pre><code>import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';

const controls = new PointerLockControls(camera, renderer.domElement);
renderer.domElement.addEventListener('click', () => controls.lock());

// 监听锁定状态变化：
controls.addEventListener('lock', () => { /* 已锁定，可显示准星 */ });
controls.addEventListener('unlock', () => { /* 已退出锁定 */ });</code></pre>
    <div class="note">本例<b>相机保持静止</b>，仅用于演示 PointerLockControls 的<b>视角锁定与鼠标转向</b>能力，不包含键盘位移逻辑。你可以原地环顾四周布置好的场景。</div>
    <h3>操作方式</h3>
    <ul>
      <li><b>点击画布</b>：进入指针锁定状态，光标隐藏，鼠标被捕获</li>
      <li><b>移动鼠标</b>：转动视角，仅在指针锁定后生效</li>
      <li><b>按 Esc</b>：退出指针锁定状态</li>
    </ul>
    <h3>场景内容</h3>
    <ul>
      <li>四面<b>围墙</b>围合出一个房间，相机居中静止</li>
      <li>固定位置的 <b>6 个木箱</b>（程序化木纹贴图，体积较小，散布在四周且离视线起点较远）</li>
      <li>固定位置的 <b>25 棵树</b>（圆柱树干 + 圆锥树冠，前后两侧均有）</li>
      <li>居中<b>准星</b>、左上角 HUD 显示锁定状态、右上角提示 <code>按 ESC 键退出</code></li>
    </ul>
    <h3>视觉效果</h3>
    <ul>
      <li>天空渐变背景 + 指数<b>雾效</b></li>
      <li>方向光 + 半球光 + 环境光动态照明</li>
      <li>草地色地面 + 网格辅助线</li>
    </ul>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.fog = new THREE.FogExp2(0x9fb4c7, 0.012);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const EYE = 1.7;
    camera.position.set(0, EYE, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    // ---- 天空渐变背景 ----
    const skyCanvas = document.createElement('canvas');
    skyCanvas.width = 2;
    skyCanvas.height = 256;
    const sc = skyCanvas.getContext('2d')!;
    const grad = sc.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#2b5876');
    grad.addColorStop(0.5, '#9fb4c7');
    grad.addColorStop(1, '#e8d9b5');
    sc.fillStyle = grad;
    sc.fillRect(0, 0, 2, 256);
    const skyTex = new THREE.CanvasTexture(skyCanvas);
    skyTex.colorSpace = THREE.SRGBColorSpace;
    ctx.scene.background = skyTex;

    // ---- 地面（带网格 + 草地色）----
    const groundGeo = new THREE.PlaneGeometry(200, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4f7942, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ctx.scene.add(ground);
    ctx.scene.add(new THREE.GridHelper(200, 100, 0x2f4f2f, 0x2f4f2f));

    // ---- 光照 ----
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
    sun.position.set(30, 50, 20);
    ctx.scene.add(sun);
    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4f7942, 0.5);
    ctx.scene.add(hemi);

    // ---- 障碍物（作为观察目标，无碰撞）----
    // 木箱（含堆叠，前后两侧均有）
    const woodTex = makeWoodTexture();
    const boxGeo = new THREE.BoxGeometry(2, 2, 2);
    const boxMat = new THREE.MeshStandardMaterial({ map: woodTex, roughness: 0.8 });
    const addBox = (x: number, y: number, z: number, s: number, ry: number) => {
      const b = new THREE.Mesh(boxGeo, boxMat);
      b.scale.set(s, s, s);
      b.position.set(x, y, z);
      b.rotation.y = ry;
      ctx.scene.add(b);
    };
    // 固定位置的箱子（每次刷新一致，离视线起点稍远）
    const boxPlacements: { x: number; z: number; s: number; ry: number }[] = [
      { x: -12, z: -30, s: 0.7, ry: 0.4 },
      { x: 14, z: -22, s: 0.5, ry: 1.2 },
      { x: -8, z: 18, s: 0.6, ry: 2.1 },
      { x: 10, z: 28, s: 0.45, ry: 0.8 },
      { x: -16, z: 5, s: 0.8, ry: 1.7 },
      { x: 6, z: -40, s: 0.55, ry: 2.6 },
    ];
    for (const p of boxPlacements) {
      addBox(p.x, p.s, p.z, p.s, p.ry);
    }

    // 墙体（围出前后两段走廊，前后各一面端墙）
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.9 });
    const wallSpecs = [
      { x: -20, z: -10, w: 1, h: 4, d: 40 },
      { x: 20, z: -10, w: 1, h: 4, d: 40 },
      { x: 0, z: -50, w: 41, h: 4, d: 1 },
      { x: -20, z: 10, w: 1, h: 4, d: 30 },
      { x: 20, z: 10, w: 1, h: 4, d: 30 },
      { x: 0, z: 35, w: 41, h: 4, d: 1 },
    ];
    wallSpecs.forEach(({ x, z, w, h, d }) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), wallMat);
      m.position.set(x, h / 2, z);
      ctx.scene.add(m);
    });

    // 树木（圆柱树干 + 圆锥树冠），固定位置，前后两侧均有
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.5, 4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
    const leafGeo = new THREE.ConeGeometry(2.2, 5, 10);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b2f, roughness: 1 });
    const treePlacements: { x: number; z: number; ry: number }[] = [
      { x: -14, z: -38, ry: 0.3 },
      { x: 12, z: -44, ry: 1.1 },
      { x: -6, z: -48, ry: 2.0 },
      { x: 16, z: -32, ry: 0.7 },
      { x: -18, z: -20, ry: 1.5 },
      { x: 8, z: -14, ry: 2.4 },
      { x: -10, z: -8, ry: 0.9 },
      { x: 4, z: -28, ry: 1.8 },
      { x: -16, z: -44, ry: 0.5 },
      { x: 18, z: -48, ry: 2.2 },
      { x: -2, z: -36, ry: 1.3 },
      { x: 14, z: -18, ry: 0.6 },
      { x: -12, z: 22, ry: 1.0 },
      { x: 10, z: 30, ry: 2.1 },
      { x: -6, z: 14, ry: 0.4 },
      { x: 16, z: 18, ry: 1.6 },
      { x: -18, z: 28, ry: 0.8 },
      { x: 6, z: 12, ry: 2.5 },
      { x: -10, z: 32, ry: 1.2 },
      { x: 18, z: 8, ry: 0.3 },
      { x: -4, z: 26, ry: 1.9 },
      { x: 12, z: 22, ry: 0.7 },
      { x: -14, z: 14, ry: 1.4 },
      { x: 2, z: 32, ry: 2.3 },
      { x: 8, z: 6, ry: 1.1 },
    ];
    for (const p of treePlacements) {
      const tree = new THREE.Group();
      const trunk = new THREE.Mesh(trunkGeo, trunkMat);
      trunk.position.y = 2;
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.y = 6;
      tree.add(trunk, leaf);
      tree.position.set(p.x, 0, p.z);
      tree.rotation.y = p.ry;
      ctx.scene.add(tree);
    }

    // ---- 指针锁定控制器 ----
    const controls = new PointerLockControls(camera, ctx.renderer.domElement);

    const tip = document.createElement('div');
    tip.textContent = '点击画布';
    tip.style.cssText = `
      position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%);
      padding: 12px 18px; border-radius: 10px; background: rgba(15,23,42,.82);
      color: #e2e8f0; font: 15px sans-serif; pointer-events: none; user-select: none;
      box-shadow: 0 4px 20px rgba(0,0,0,.4);
    `;
    container.appendChild(tip);

    // 右上角固定文本标签：锁定时显示"按 ESC 键退出"
    const escHint = document.createElement('div');
    escHint.textContent = '按 ESC 键退出';
    escHint.style.cssText = `
      position: absolute; right: 12px; top: 12px; padding: 6px 10px;
      border-radius: 6px; background: rgba(0,0,0,.45); color: #cbd5e1;
      font: 12px monospace; pointer-events: none; user-select: none; display: none;
    `;
    container.appendChild(escHint);

    // 准星
    const crosshair = document.createElement('div');
    crosshair.style.cssText = `
      position: absolute; left: 50%; top: 50%; width: 6px; height: 6px;
      transform: translate(-50%, -50%); border-radius: 50%;
      background: rgba(255,255,255,.9); box-shadow: 0 0 4px rgba(0,0,0,.6);
      pointer-events: none; display: none;
    `;
    container.appendChild(crosshair);

    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = `
      position: absolute; left: 12px; top: 12px; padding: 6px 10px;
      border-radius: 6px; background: rgba(0,0,0,.45); color: #cbd5e1;
      font: 12px monospace; pointer-events: none; user-select: none;
    `;
    container.appendChild(hud);

    const onClick = () => controls.lock();
    ctx.renderer.domElement.addEventListener('click', onClick);
    const onLock = () => {
      tip.style.display = 'none';
      crosshair.style.display = '';
      escHint.style.display = '';
    };
    const onUnlock = () => {
      tip.style.display = '';
      crosshair.style.display = 'none';
      escHint.style.display = 'none';
    };
    controls.addEventListener('lock', onLock);
    controls.addEventListener('unlock', onUnlock);

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      hud.textContent = `锁定：${controls.isLocked ? '是' : '否'}`;
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      ctx.renderer.domElement.removeEventListener('click', onClick);
      controls.removeEventListener('lock', onLock);
      controls.removeEventListener('unlock', onUnlock);
      tip.remove();
      crosshair.remove();
      hud.remove();
      escHint.remove();
      controls.dispose();
    });
  },
};
