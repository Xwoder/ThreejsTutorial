import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import {createContext, makeCleanup} from '../helper';
import {AxesWithLabels} from '../../utils/AxesWithLabels.ts';
import {createParamPanel, type ParamSlider} from '../../utils/paramPanel.ts';

const DEFAULT_VIEW = 4.5;
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 100;

export const orthographicCamera: Lesson = {
    id: 'camera/orthographic-camera',
  title: 'OrthographicCamera 正交相机',
  description: `
    <h2>OrthographicCamera</h2>
    <p>正交相机没有透视效果：<b>无论远近，物体大小一致</b>。常用于 2D 游戏、CAD、建筑图纸。</p>
    <pre><code>new THREE.OrthographicCamera(left, right, top, bottom, near, far)</code></pre>
    <p>它用一个<b>长方体视锥</b>（而非金字塔形）来决定可见范围：</p>
    <pre><code>const d = 5;
const camera = new THREE.OrthographicCamera(
  -d * aspect, d * aspect, d, -d, 0.1, 100
);</code></pre>
    <h3>动手试试</h3>
    <p>画布右上角的参数面板可以实时调整 <b>viewSize、aspect、near、far</b>。注意观察：viewSize 越小，画面"放大"看到的场景范围越小；near/far 决定哪些物体会被裁剪。修改任何相机参数后都需调用：</p>
    <pre><code>camera.updateProjectionMatrix();</code></pre>
    <h3>对比观察</h3>
    <p>画布中的场景与"透视相机"一节相同：一排立方体由近及远排列。旋转视角观察——<b>所有立方体在屏幕上大小相同</b>，这就是正交投影的特征。</p>
    <h3>使用场景</h3>
    <ul>
      <li>2D 界面、地图、棋盘类游戏</li>
      <li>需要精确尺寸对齐的工程可视化</li>
    </ul>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    let currentView = DEFAULT_VIEW;
    const camera = new THREE.OrthographicCamera(-DEFAULT_VIEW, DEFAULT_VIEW, DEFAULT_VIEW, -DEFAULT_VIEW, DEFAULT_NEAR, DEFAULT_FAR);
    camera.position.set(6, 5, 8);
    camera.lookAt(0, 0, 0);

    let lockAspect = true;
    const applyFrustum = () => {
      const { width, height } = ctx.getSize();
      const aspect = width / height;
      const d = currentView;
      if (lockAspect) {
        camera.left = -d * aspect;
        camera.right = d * aspect;
      } else {
        camera.left = -d;
        camera.right = d;
      }
      camera.top = d;
      camera.bottom = -d;
      camera.updateProjectionMatrix();
    };
    applyFrustum();

    ctx.onResize((w, h) => {
      applyFrustum();
      if (lockAspect) panel.setDisplay('aspect', w / h);
    });

    ctx.scene.add(new THREE.GridHelper(12, 12, 0x475569, 0x1e293b));
    // 在世界原点显示 X(红) / Y(绿) / Z(蓝) 坐标轴及文字标签
      ctx.scene.add(new AxesWithLabels(6));
    const material = new THREE.MeshNormalMaterial();
    // 围绕原点、10×10 规格、间距 5 单位的立方体阵列（透视 vs 正交对比）
    const GRID = 10;
    const SPACING = 5;
    for (let ix = 0; ix < GRID; ix++) {
      for (let iz = 0; iz < GRID; iz++) {
        const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        box.position.set(
          (ix - (GRID - 1) / 2) * SPACING,
          0.5,
          (iz - (GRID - 1) / 2) * SPACING,
        );
        ctx.scene.add(box);
      }
    }

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    // 本页面自行定义并控制相机参数
    const paramControls: ParamSlider[] = [
      { key: 'viewSize', label: 'viewSize', min: 1, max: 15, step: 0.1, value: DEFAULT_VIEW, desc: '视锥半高（值越小越放大）', precision: 2 },
      { key: 'aspect', label: 'aspect', min: 0.2, max: 4, step: 0.01, value: 1, desc: '画布宽高比', precision: 2, disabled: true },
      { key: 'near', label: 'near', min: 0.1, max: 10, step: 0.1, value: DEFAULT_NEAR, desc: '近裁剪面，小于此距离的物体不渲染', precision: 2 },
      { key: 'far', label: 'far', min: 1, max: 200, step: 1, value: DEFAULT_FAR, desc: '远裁剪面，大于此距离的物体不渲染', precision: 2 },
    ];

    const aspectCheckboxLabel = document.createElement('label');
    aspectCheckboxLabel.className = 'camera-control-checkbox';
    aspectCheckboxLabel.innerHTML = `<input type="checkbox" checked><span>锁定 aspect 随画布变化</span>`;

    const panel = createParamPanel({
      container,
      controls: paramControls,
      defaults: { viewSize: DEFAULT_VIEW, aspect: 1, near: DEFAULT_NEAR, far: DEFAULT_FAR },
      footer: aspectCheckboxLabel,
      onChange: (key, value) => {
        if (key === 'viewSize') {
          currentView = value;
          applyFrustum();
        } else if (key === 'near') {
          camera.near = value;
          camera.updateProjectionMatrix();
        } else if (key === 'far') {
          camera.far = value;
          camera.updateProjectionMatrix();
        }
      },
      onReset: () => {
        currentView = DEFAULT_VIEW;
        camera.near = DEFAULT_NEAR;
        camera.far = DEFAULT_FAR;
        lockAspect = true;
        aspectCheckbox.checked = true;
        panel.getInput('aspect')!.disabled = true;
        applyFrustum();
        const { width, height } = ctx.getSize();
        panel.setDisplay('aspect', width / height);
        panel.setDisplay('viewSize', currentView);
        panel.setDisplay('near', camera.near);
        panel.setDisplay('far', camera.far);
      },
    });

    const aspectCheckbox = aspectCheckboxLabel.querySelector<HTMLInputElement>('input')!;
    aspectCheckbox.addEventListener('change', () => {
      lockAspect = aspectCheckbox.checked;
      panel.getInput('aspect')!.disabled = lockAspect;
      if (lockAspect) {
        const { width, height } = ctx.getSize();
        panel.setDisplay('aspect', width / height);
      }
      applyFrustum();
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
      panel.remove();
    });
  },
};
