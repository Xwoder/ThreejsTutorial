import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup, createAxesWithLabels } from '../helper';
import { createParamPanel, type ParamSlider } from '../paramPanel';

const DEFAULT_FOV = 75;
const DEFAULT_NEAR = 0.1;
const DEFAULT_FAR = 2000;

export const perspectiveCamera: Lesson = {
  id: 'perspective-camera',
  title: 'PerspectiveCamera 透视相机',
  description: `
    <h2>PerspectiveCamera</h2>
    <p>透视相机模拟人眼的成像方式：<b>近大远小</b>。这是最常用的相机。</p>
    <pre><code>new THREE.PerspectiveCamera(fov, aspect, near, far)</code></pre>
    <ul>
      <li><b>fov</b>：视场角（度），越大视野越广、透视变形越明显</li>
      <li><b>aspect</b>：画布宽高比，通常设为 <code>width / height</code></li>
      <li><b>near / far</b>：近/远裁剪面，超出范围的物体不渲染</li>
    </ul>
    <h3>动手试试</h3>
    <p>画布右上角的参数面板可以实时调整 <b>fov、aspect、near、far</b>。注意观察：fov 变大时，同样的立方体看起来"变小且空间更深"；near/far 决定哪些物体会被裁剪。</p>
    <p>修改任何相机参数后都需要调用：</p>
    <pre><code>camera.updateProjectionMatrix();</code></pre>
    <p>用鼠标拖动可以环绕观察场景。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(DEFAULT_FOV, 1, DEFAULT_NEAR, DEFAULT_FAR);
    camera.position.set(0, 2, 6);

    let lockAspect = true;
    ctx.onResize((w, h) => {
      if (lockAspect) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        panel.setDisplay('aspect', camera.aspect);
      }
    });

    ctx.scene.add(new THREE.GridHelper(12, 12, 0x475569, 0x1e293b));
    // 在世界原点显示 X(红) / Y(绿) / Z(蓝) 坐标轴及文字标签
    ctx.scene.add(createAxesWithLabels(6));
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
      { key: 'fov', label: 'fov', min: 20, max: 120, step: 1, value: DEFAULT_FOV, desc: '垂直视场角，越大视野越广', precision: 2 },
      { key: 'aspect', label: 'aspect', min: 0.2, max: 4, step: 0.01, value: 1, desc: '画布宽高比', precision: 2, disabled: true },
      { key: 'near', label: 'near', min: 0.1, max: 10, step: 0.1, value: DEFAULT_NEAR, desc: '近裁剪面，小于此距离的物体不渲染', precision: 2 },
      { key: 'far', label: 'far', min: 1, max: 2000, step: 1, value: DEFAULT_FAR, desc: '远裁剪面，大于此距离的物体不渲染', precision: 2 },
    ];

    const aspectCheckboxLabel = document.createElement('label');
    aspectCheckboxLabel.className = 'camera-control-checkbox';
    aspectCheckboxLabel.innerHTML = `<input type="checkbox" checked><span>锁定 aspect 随画布变化</span>`;

    const panel = createParamPanel({
      container,
      controls: paramControls,
      defaults: { fov: DEFAULT_FOV, aspect: 1, near: DEFAULT_NEAR, far: DEFAULT_FAR },
      footer: aspectCheckboxLabel,
      onChange: (key, value) => {
        if (key === 'fov') camera.fov = value;
        else if (key === 'aspect') camera.aspect = value;
        else if (key === 'near') camera.near = value;
        else if (key === 'far') camera.far = value;
        camera.updateProjectionMatrix();
      },
      onReset: () => {
        camera.fov = DEFAULT_FOV;
        camera.near = DEFAULT_NEAR;
        camera.far = DEFAULT_FAR;
        lockAspect = true;
        aspectCheckbox.checked = true;
        panel.getInput('aspect')!.disabled = true;
        const { width, height } = ctx.getSize();
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        panel.setDisplay('fov', camera.fov);
        panel.setDisplay('aspect', camera.aspect);
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
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        panel.setDisplay('aspect', camera.aspect);
      }
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
