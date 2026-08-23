import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import {createContext, makeCleanup} from '../helper';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel, type ParamSlider} from '../../utils/paramPanel.ts';

const DEFAULT_RES = 256;
const SPHERE_POS = new THREE.Vector3(0, 2, 0);

export const cubeCamera: Lesson = {
    id: 'camera/cube-camera',
  title: 'CubeCamera 立方体相机',
  description: `
    <h2>CubeCamera</h2>
    <p>CubeCamera 从一个<b>中心点</b>向 <b>上 / 下 / 左 / 右 / 前 / 后</b> 六个方向各拍一张照片，合成一张<b>立方体贴图（cubemap）</b>。它最经典的用途是<b>实时反射</b>——让物体"照出"周围的环境。</p>
    <pre><code>const rt = new THREE.WebGLCubeRenderTarget(256);
const cubeCam = new THREE.CubeCamera(0.1, 1000, rt);

// 每帧：更新到物体位置并捕获环境
sphere.visible = false;          // 先藏起被反射的物体自身
cubeCam.position.copy(sphere.position);
cubeCam.update(renderer, scene);
sphere.visible = true;

material.envMap = rt.texture;    // 用这张立方体贴图做反射
renderer.render(scene, camera);</code></pre>
    <h3>动手试试</h3>
    <p>画面中央的金属球是反射体，外层一圈彩色方块是它的"环境"。调节右上角参数：</p>
    <ul>
      <li><b>roughness</b>：0 为镜面（清晰反射），越大越像磨砂/模糊反射；</li>
      <li><b>metalness</b>：1 为纯金属（只显示反射），调小会混入物体本色；</li>
      <li><b>resolution</b>：立方体贴图分辨率，越大反射越清晰、开销越高。</li>
    </ul>
    <p>注意：包围环境的方块在缓慢旋转，所以球面上的倒影是<b>实时变化</b>的——这正是 CubeCamera 每帧重新捕获的结果。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0b1120);

    const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
    camera.position.set(0, 5, 18);

    ctx.scene.add(new THREE.GridHelper(40, 40, 0x334155, 0x1e293b));
      ctx.scene.add(new LabeledAxesHelper(6));

    // 反射球（被 CubeCamera 实时捕获为环境）
    const sphereMat = new THREE.MeshStandardMaterial({
      metalness: 1,
      roughness: 0,
      envMapIntensity: 1,
    });
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(2, 48, 48), sphereMat);
    sphere.position.copy(SPHERE_POS);
    ctx.scene.add(sphere);

    // 一圈彩色方块作为"环境"，对反射可见（使用不受灯光影响的基础材质）
    const envGroup = new THREE.Group();
    const COUNT = 14;
    const RADIUS = 9;
    for (let i = 0; i < COUNT; i++) {
      const a = (i / COUNT) * Math.PI * 2;
      const color = new THREE.Color().setHSL(i / COUNT, 0.7, 0.55);
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 4, 2.4),
        new THREE.MeshBasicMaterial({ color }),
      );
      box.position.set(Math.cos(a) * RADIUS, 2, Math.sin(a) * RADIUS);
      box.lookAt(0, 2, 0);
      envGroup.add(box);
    }
    // 几个漂浮小球，增加反射层次
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.3;
      const s = new THREE.Mesh(
        new THREE.SphereGeometry(0.8, 20, 20),
        new THREE.MeshBasicMaterial({ color: new THREE.Color().setHSL((i + 0.5) / 6, 0.8, 0.6) }),
      );
      s.position.set(Math.cos(a) * 5.5, 5 + (i % 2) * 1.5, Math.sin(a) * 5.5);
      envGroup.add(s);
    }
    ctx.scene.add(envGroup);

    // 立方体相机：6 方向捕获 → 立方体贴图
    let cubeRT: THREE.WebGLCubeRenderTarget;
    let cubeCam: THREE.CubeCamera;
    const buildTarget = (size: number) => {
      cubeRT?.dispose();
      cubeRT = new THREE.WebGLCubeRenderTarget(size, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      cubeCam = new THREE.CubeCamera(0.1, 1000, cubeRT);
      sphereMat.envMap = cubeRT.texture;
      sphereMat.needsUpdate = true;
    };
    buildTarget(DEFAULT_RES);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 2, 0);

    const paramControls: ParamSlider[] = [
      { key: 'roughness', label: 'roughness', min: 0, max: 1, step: 0.01, value: 0, desc: '表面粗糙度，0=镜面清晰，越大越模糊', precision: 2 },
      { key: 'metalness', label: 'metalness', min: 0, max: 1, step: 0.01, value: 1, desc: '金属度，1=纯反射，调小混入本色', precision: 2 },
      { key: 'resolution', label: 'resolution', min: 64, max: 512, step: 64, value: DEFAULT_RES, desc: '立方体贴图分辨率，越大越清晰、开销越高', precision: 0 },
    ];

    const panel = createParamPanel({
      container,
      controls: paramControls,
      defaults: { roughness: 0, metalness: 1, resolution: DEFAULT_RES },
      onChange: (key, value) => {
        if (key === 'roughness') sphereMat.roughness = value;
        else if (key === 'metalness') sphereMat.metalness = value;
        else if (key === 'resolution') buildTarget(value);
      },
      onReset: () => {
        sphereMat.roughness = 0;
        sphereMat.metalness = 1;
        buildTarget(DEFAULT_RES);
        panel.setDisplay('roughness', 0);
        panel.setDisplay('metalness', 1);
        panel.setDisplay('resolution', DEFAULT_RES);
      },
    });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      controls.update();

      // 让环境缓慢旋转，使反射实时变化
      envGroup.rotation.y += 0.003;

      // 用 CubeCamera 从球心捕获周围环境（先藏起球本身，避免自反射）
      sphere.visible = false;
      cubeCam.position.copy(sphere.position);
      cubeCam.update(ctx.renderer, ctx.scene);
      sphere.visible = true;

      // 主相机渲染最终画面
      ctx.renderer.setScissorTest(false);
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      cubeRT.dispose();
      panel.remove();
    });
  },
};
