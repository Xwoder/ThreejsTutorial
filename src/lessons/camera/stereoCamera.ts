import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel, type ParamSlider} from '../../utils/paramPanel.ts';

/** 默认双眼间距（米），约等于真人瞳距 */
const DEFAULT_EYE_SEP = 0.064;

export const stereoCamera: Lesson = {
  id: 'camera/stereo-camera',
  title: 'StereoCamera 立体相机',
  description: `
    <h2>StereoCamera</h2>
    <p>StereoCamera 用于生成<b>立体（双目）效果</b>：它从<b>左眼</b>与<b>右眼</b>两个略有偏移的视点分别渲染场景，模拟人眼的视差，是 VR、3D 电影与红蓝眼镜的基础。</p>
    <pre><code>const stereo = new THREE.StereoCamera();
stereo.eyeSep = 0.064;     // 双眼间距（米）
stereo.update(camera);     // 根据主相机更新左右眼相机

renderer.render(scene, stereo.cameraL); // 左眼
renderer.render(scene, stereo.cameraR); // 右眼</code></pre>
    <h3>本节的呈现方式</h3>
    <p>画面被竖直分割为两半：<b>左半屏 = 左眼视角</b>，<b>右半屏 = 右眼视角</b>。用手分别遮住一只眼，或戴上头显/红蓝眼镜，就能感受到物体的立体纵深。</p>
    <h3>动手试试</h3>
    <p>调节右上角的 <b>eyeSep（双眼间距）</b>：</p>
    <ul>
      <li>设为 <b>0</b> 时，左右视图完全重合，<b>没有立体感</b>（退化为普通透视）；</li>
      <li>调大时，左右视图的<b>视差（错位）越明显</b>，立体感越强；过大则会像"斗鸡眼"一样失真。</li>
    </ul>
    <p>重点观察不同深度的物体：越靠前的物体在左右眼中的<b>位置差越大</b>，这正是我们判断远近的依据。用鼠标拖动可以从不同角度环绕观察。</p>
  `,
  create(container) {
    const ctx = createContext(container);
      setSceneBackground(ctx, 0x111827);

    // 主相机仅用于定位与环绕控制，真正的渲染交给左右眼相机
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.set(0, 4, 16);

    // 左右眼标签与中线分隔
    const makeTag = (text: string, leftPct: number) => {
      const el = document.createElement('div');
      el.textContent = text;
      el.style.cssText = `
        position: absolute; top: 14px; left: ${leftPct}%;
        transform: translateX(-50%);
        padding: 4px 12px; border-radius: 999px;
        background: rgba(15, 23, 42, 0.7);
        border: 1px solid #334155; color: #38bdf8;
        font-size: 11px; font-weight: 600; letter-spacing: 0.5px;
        pointer-events: none;
      `;
      return el;
    };
    const leftTag = makeTag('左眼 L', 25);
    const rightTag = makeTag('右眼 R', 75);
    const divider = document.createElement('div');
    divider.style.cssText = `
      position: absolute; top: 0; left: 50%; transform: translateX(-50%);
      width: 2px; height: 100%;
      background: repeating-linear-gradient(to bottom, #38bdf8 0 8px, transparent 8px 16px);
      opacity: 0.5; pointer-events: none;
    `;
    container.append(leftTag, rightTag, divider);

    ctx.scene.add(new THREE.GridHelper(40, 40, 0x475569, 0x1e293b));
    ctx.scene.add(new LabeledAxesHelper(8));

    // 多层立方体"墙"，深度越靠前高度越高，便于观察视差
    const cubeMat = new THREE.MeshNormalMaterial();
    for (let zz = -6; zz <= 6; zz += 3) {
      const depth = (zz + 6) / 12; // 0(最远) ~ 1(最近)
      for (let xx = -8; xx <= 8; xx += 2) {
        const h = 1 + depth * 3;
        const box = new THREE.Mesh(new THREE.BoxGeometry(1, h, 1), cubeMat);
        box.position.set(xx, h / 2, zz);
        ctx.scene.add(box);
      }
    }

    // 一排彩色球体（无需灯光，使用基础材质）
    const sphereColors = [0xef4444, 0x22c55e, 0xeab308, 0xa855f7, 0x06b6d4];
    sphereColors.forEach((c, i) => {
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(1, 24, 24),
        new THREE.MeshBasicMaterial({ color: c }),
      );
      s.position.set(-8 + i * 4, 1.5, 0);
      ctx.scene.add(s);
    });

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1.5, 0);

    const stereo = new THREE.StereoCamera();
    stereo.eyeSep = DEFAULT_EYE_SEP;

    const paramControls: ParamSlider[] = [
      {
        key: 'eyeSep',
        label: 'eyeSep',
        min: 0,
        max: 0.5,
        step: 0.001,
        value: DEFAULT_EYE_SEP,
        desc: '双眼间距（米），0 = 无立体感，越大视差越强',
        precision: 3,
      },
    ];

    const panel = createParamPanel({
      container,
      controls: paramControls,
      defaults: { eyeSep: DEFAULT_EYE_SEP },
      onChange: (key, value) => {
        if (key === 'eyeSep') stereo.eyeSep = value;
      },
      onReset: () => {
        stereo.eyeSep = DEFAULT_EYE_SEP;
        panel.setDisplay('eyeSep', DEFAULT_EYE_SEP);
      },
    });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();

      const { width, height } = ctx.getSize();
      const halfW = Math.floor(width / 2);
      // 每个眼睛只渲染半屏宽度，因此把相机宽高比设为半屏比例，避免图像被横向拉伸
      camera.aspect = halfW / height;
      camera.updateProjectionMatrix();
      stereo.update(camera);

      const renderer = ctx.renderer;
      renderer.setScissorTest(true);

      // 左眼 → 左半屏
      renderer.setViewport(0, 0, halfW, height);
      renderer.setScissor(0, 0, halfW, height);
      renderer.render(ctx.scene, stereo.cameraL);

      // 右眼 → 右半屏
      renderer.setViewport(halfW, 0, width - halfW, height);
      renderer.setScissor(halfW, 0, width - halfW, height);
      renderer.render(ctx.scene, stereo.cameraR);

      renderer.setScissorTest(false);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      panel.remove();
      leftTag.remove();
      rightTag.remove();
      divider.remove();
    });
  },
};
