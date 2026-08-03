import * as THREE from 'three';
import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';
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

export const firstPersonControls: Lesson = {
  id: 'first-person-controls',
  title: 'FirstPersonControls 第一人称漫游控制器',
  description: `
    <h2>FirstPersonControls 第一人称漫游控制器</h2>
    <p><code>FirstPersonControls</code> 提供<b>第一人称漫游</b>体验：相机可在场景中自由移动，并支持阻尼（惯性）让加减速更顺滑。它通过键鼠组合控制相机，且<b>无需点击画布锁定指针</b>，按住鼠标拖拽即可转视角：</p>
    <pre><code>import { FirstPersonControls } from 'three/examples/jsm/controls/FirstPersonControls.js';

const controls = new FirstPersonControls(camera, renderer.domElement);
controls.movementSpeed = 20;   // 移动速度
controls.lookSpeed = 0.005;    // 转视角速度
controls.dampingFactor = 0.1;  // 阻尼（惯性），越小越"重"

// 渲染循环里每帧传入时间间隔：
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  controls.update(clock.getDelta());
  renderer.render(scene, camera);
}</code></pre>
    <div class="note">与 <b>PointerLockControls</b> 不同，本控制器<b>相机随键盘自由移动</b>，鼠标<b>按住拖拽</b>才转动视角（而非指针锁定）。它基于 <code>Controls</code> 基类，需在渲染循环中每帧调用 <code>update(delta)</code>。</div>
    <h3>操作方式</h3>
    <ul>
      <li><b>W / ↑</b>：向前移动</li>
      <li><b>S / ↓</b>：向后移动</li>
      <li><b>A / ←</b>：向左平移</li>
      <li><b>D / →</b>：向右平移</li>
      <li><b>E / Q</b>：向上 / 向下平移</li>
      <li><b>按住鼠标左键拖拽</b>：前进并转动视角</li>
      <li><b>按住鼠标右键拖拽</b>：后退并转动视角</li>
    </ul>
    <h3>场景内容</h3>
    <ul>
      <li>开阔的草地场景（带网格辅助线）</li>
      <li>整个地面被 <b>木箱</b> 与 <b>树木</b>（圆柱树干 + 圆锥树冠）铺满，仅中心出生点留空</li>
      <li>左上角 HUD 显示相机坐标与移动速度</li>
    </ul>
    <h3>视觉效果</h3>
    <ul>
      <li>天空渐变背景 + 指数<b>雾效</b></li>
      <li>方向光 + 半球光 + 环境光动态照明</li>
    </ul>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.fog = new THREE.FogExp2(0x9fb4c7, 0.008);

    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const EYE = 2;
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
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x4f7942, roughness: 1 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ctx.scene.add(ground);
    ctx.scene.add(new THREE.GridHelper(600, 300, 0x2f4f2f, 0x2f4f2f));

    // ---- 光照 ----
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.55));
    const sun = new THREE.DirectionalLight(0xfff2d8, 1.4);
    sun.position.set(30, 50, 20);
    ctx.scene.add(sun);
    const hemi = new THREE.HemisphereLight(0xbfd4ff, 0x4f7942, 0.5);
    ctx.scene.add(hemi);

    // ---- 障碍物（作为观察目标，无碰撞）----
    // 木箱
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
    const boxPlacements: { x: number; z: number; s: number; ry: number }[] = [];
    const treePlacements: { x: number; z: number; ry: number }[] = [];

    // 确定性伪随机（mulberry32），保证每次刷新布局一致
    const mulberry32 = (seed: number) => {
      let a = seed;
      return () => {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    };
    const rand = mulberry32(20260803);

    // 在 600×600 地面内按网格铺满，留出中心出生空地
    const HALF = 290;
    const STEP = 26;
    const CLEAR = 14; // 相机起点(0,0)周围留空
    for (let gx = -HALF; gx <= HALF; gx += STEP) {
      for (let gz = -HALF; gz <= HALF; gz += STEP) {
        const x = gx + (rand() - 0.5) * STEP * 0.8;
        const z = gz + (rand() - 0.5) * STEP * 0.8;
        if (Math.hypot(x, z) < CLEAR) continue;
        const r = rand();
        if (r < 0.62) {
          treePlacements.push({ x, z, ry: rand() * Math.PI * 2 });
        } else if (r < 0.82) {
          boxPlacements.push({ x, z, s: 0.4 + rand() * 0.5, ry: rand() * Math.PI * 2 });
        }
      }
    }

    for (const p of boxPlacements) {
      addBox(p.x, p.s, p.z, p.s, p.ry);
    }

    // 树木（圆柱树干 + 圆锥树冠）
    const trunkGeo = new THREE.CylinderGeometry(0.4, 0.5, 4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
    const leafGeo = new THREE.ConeGeometry(2.2, 5, 10);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2f6b2f, roughness: 1 });
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

    // ---- 第一人称漫游控制器 ----
    const controls = new FirstPersonControls(camera, ctx.renderer.domElement);
    controls.movementSpeed = 10;
    controls.lookSpeed = 0.1;
    controls.dampingFactor = 0.1;
    controls.lookVertical = true;
    controls.autoForward = false;
    controls.heightSpeed = false;

    // HUD
    const hud = document.createElement('div');
    hud.style.cssText = `
      position: absolute; left: 12px; top: 12px; padding: 6px 10px;
      border-radius: 6px; background: rgba(0,0,0,.45); color: #cbd5e1;
      font: 12px monospace; pointer-events: none; user-select: none; white-space: pre;
    `;
    container.appendChild(hud);

    // 操作提示
    const tip = document.createElement('div');
    tip.innerHTML =
      'WASD/方向键移动 · E/Q 升降 · 按住<b>左键</b>前进 · 按住<b>右键</b>后退';
    tip.style.cssText = `
      position: absolute; right: 12px; bottom: 12px; padding: 6px 10px;
      border-radius: 6px; background: rgba(0,0,0,.45); color: #cbd5e1;
      font: 12px monospace; pointer-events: none; user-select: none;
    `;
    container.appendChild(tip);

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const delta = clock.getDelta();
      controls.update(delta);
      if (camera.position.y < 0.5) camera.position.y = 0.5; // 保持相机在地面之上
      const p = camera.position;
      hud.textContent = `坐标: (${p.x.toFixed(1)}, ${p.y.toFixed(1)}, ${p.z.toFixed(1)})\n速度: ${controls.movementSpeed}`;
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      hud.remove();
      tip.remove();
      controls.dispose();
    });
  },
};
