import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

/** 控制面板中「标题 + 一组按钮」的配置项 */
export interface ControlPanelButtonOptions {
  /** 分组标题，例如「模式」「坐标空间」 */
  title: string;
  /** 按钮定义 */
  items: ControlPanelButtonItem[];
}

/** 单个按钮的定义 */
export interface ControlPanelButtonItem {
  /** 按钮文字 */
  label: string;
  /** 点击回调 */
  onClick: () => void;
  /** 是否处于选中（高亮）状态 */
  active: () => boolean;
}

/**
 * 创建一个「标题 + 一组按钮」的控制面板分组。
 * 返回分组 DOM 元素和用于刷新高亮状态的 sync 方法。
 */
function createControlPanelGroup(options: ControlPanelButtonOptions): {
  el: HTMLDivElement;
  sync: () => void;
} {
  const group = document.createElement('div');

  const title = document.createElement('div');
  title.className = 'transform-space-title';
  title.textContent = options.title;
  group.appendChild(title);

  const row = document.createElement('div');
  row.className = 'transform-space-buttons';

  const buttons = options.items.map((item) => {
    const btn = document.createElement('button');
    btn.textContent = item.label;
    btn.addEventListener('click', item.onClick);
    row.appendChild(btn);
    return btn;
  });
  group.appendChild(row);

  const sync = () => {
    buttons.forEach((btn, i) => {
      btn.classList.toggle('active', options.items[i].active());
    });
  };

  return { el: group, sync };
}

export const transformControls: Lesson = {
  id: 'transform-controls',
  title: 'TransformControls 变换控制器',
  description: `
    <h2>可视化编辑物体的位置 / 旋转 / 缩放</h2>
    <p><code>TransformControls</code> 是一个<b>变换辅助控件</b>，它会为选中的物体叠加一个可交互的操纵手柄（gizmo），让你用鼠标直接编辑物体的位置、旋转或缩放。它与相机控制器不同，操作的是<b>物体自身的变换矩阵</b>：</p>
    <pre><code>import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';

const control = new TransformControls(camera, renderer.domElement);
control.attach(object);   // 绑定到要编辑的物体
// three r169+：TransformControls 不再是 Object3D，
// 必须把它内部的 helper 加入场景，手柄才会显示
scene.add(control.getHelper());

// 切换变换模式
control.setMode('translate' | 'rotate' | 'scale');
control.setSpace('world'   | 'local');  // 世界坐标 / 本地坐标</code></pre>
    <h3>事件与协作</h3>
    <ul>
      <li><b>dragging-changed</b>：开始/结束拖动手柄时触发，通常用它<b>临时禁用 OrbitControls</b> 避免视角抖动</li>
      <li><b>objectChange</b>：被编辑物体的变换发生变化时触发</li>
      <li><code>control.showX / showY / showZ</code>：单独显示/隐藏某个坐标轴手柄</li>
      <li><code>control.size</code>：手柄大小；<code>control.translationSnap</code> 等可设置吸附步长</li>
    </ul>
    <h3>操作方式</h3>
    <ul>
      <li><b>左键拖动手柄</b>：按当前模式移动 / 旋转 / 缩放物体</li>
      <li><b>点击不同彩色立方体</b>：把变换手柄切换到该物体</li>
      <li><b>键盘 W / E / R</b>：在 平移 / 旋转 / 缩放 之间切换</li>
      <li><b>按住空白处拖拽</b>：旋转相机视角查看效果</li>
    </ul>
    <p>点击场景里的彩色立方体选中它，然后拖动手柄编辑变换；用 W / E / R 切换模式。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0f172a);

    const { width, height } = ctx.getSize();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(6, 5, 8);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(14, 14, 0x475569, 0x1e293b));
    ctx.scene.add(new THREE.AxesHelper(4));

    const colors = [0xc084fc, 0x22c55e, 0x38bdf8, 0xf59e0b, 0xef4444];
    const targets: THREE.Mesh[] = [];
    const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    colors.forEach((color, i) => {
      const mesh = new THREE.Mesh(
        boxGeo,
        new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 }),
      );
      const angle = (i / colors.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 3.5, 0.6, Math.sin(angle) * 3.5);
      ctx.scene.add(mesh);
      targets.push(mesh);
    });

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 8, 4);
    ctx.scene.add(dirLight);

    const orbit = new OrbitControls(camera, ctx.renderer.domElement);
    orbit.enableDamping = true;
    orbit.target.set(0, 0.6, 0);

    const transform = new TransformControls(camera, ctx.renderer.domElement);
    transform.setMode('translate');
    transform.attach(targets[0]);
    // three r169+ 起 TransformControls 不再是 Object3D，
    // 必须把它内部的 helper 加入场景，否则手柄不会被渲染也无法交互
    ctx.scene.add(transform.getHelper());

    // 拖动变换手柄时禁用相机控制，避免冲突
    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
    });

    // 点击切换选中的物体（仅在未操作变换手柄时生效）
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const onClick = (e: PointerEvent) => {
      // 正在拖动手柄时不切换，避免与 TransformControls 冲突
      if (transform.dragging) return;
      const rect = ctx.renderer.domElement.getBoundingClientRect();
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(targets, false)[0];
      if (hit) transform.attach(hit.object);
    };
    ctx.renderer.domElement.addEventListener('pointerdown', onClick);

    // 键盘切换变换模式
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') transform.setMode('translate');
      else if (e.key === 'e' || e.key === 'E') transform.setMode('rotate');
      else if (e.key === 'r' || e.key === 'R') transform.setMode('scale');
      else return;
      syncModeButtons();
    };
    window.addEventListener('keydown', onKey);

    // 右上角面板：总标题 → 虚线分隔符 → 模式 → 坐标空间
    const panel = document.createElement('div');
    panel.className = 'transform-space-panel';

    // 总标题
    const panelHeading = document.createElement('div');
    panelHeading.className = 'transform-panel-heading';
    panelHeading.textContent = '控制面板';
    panel.appendChild(panelHeading);

    // 虚线分隔符
    const divider = document.createElement('div');
    divider.className = 'transform-panel-divider';
    panel.appendChild(divider);

    // 变换模式分组（平移 / 旋转 / 缩放），与键盘 W/E/R 联动
    const modeGroup = createControlPanelGroup({
      title: '模式',
      items: [
        { label: '平移', onClick: () => transform.setMode('translate'), active: () => transform.mode === 'translate' },
        { label: '旋转', onClick: () => transform.setMode('rotate'), active: () => transform.mode === 'rotate' },
        { label: '缩放', onClick: () => transform.setMode('scale'), active: () => transform.mode === 'scale' },
      ],
    });
    panel.appendChild(modeGroup.el);

    // 坐标空间分组（World / Local）
    const spaceGroup = createControlPanelGroup({
      title: '坐标空间',
      items: [
        { label: 'World', onClick: () => transform.setSpace('world'), active: () => transform.space === 'world' },
        { label: 'Local', onClick: () => transform.setSpace('local'), active: () => transform.space === 'local' },
      ],
    });
    panel.appendChild(spaceGroup.el);
    container.appendChild(panel);

    const syncModeButtons = () => modeGroup.sync();
    const syncSpaceButtons = () => spaceGroup.sync();
    syncSpaceButtons();
    syncModeButtons();

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      orbit.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      ctx.renderer.domElement.removeEventListener('pointerdown', onClick);
      panel.remove();
      transform.detach();
      transform.dispose();
      orbit.dispose();
    });
  },
};
