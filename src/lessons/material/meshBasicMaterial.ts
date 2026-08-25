import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel, type ParamSlider} from '../../utils/paramPanel.ts';

export const meshBasicMaterial: Lesson = {
  id: 'material/mesh-basic-material',
  title: 'MeshBasicMaterial 基础材质',
  description: `
    <h2>MeshBasicMaterial</h2>
    <p>最简单的材质：<b>不受任何光照影响</b>，直接把颜色画在表面。即使场景里摆满灯光，它的明暗也不会变化。</p>
    <pre><code>const material = new THREE.MeshBasicMaterial({
  color: 0x60a5fa,
});</code></pre>
    <h3>常用参数</h3>
    <ul>
      <li><b>color</b>：颜色，十六进制或 RGB</li>
      <li><b>transparent / opacity</b>：透明度。注意 opacity &lt; 1 时必须把 <code>transparent</code> 设为 true 才生效</li>
      <li><b>wireframe</b>：是否只显示三角面网格线，常用于调试几何体</li>
      <li><b>depthTest / depthWrite</b>：是否参与深度测试 / 写入深度缓冲，用于实现透明叠加等特殊效果</li>
      <li><b>side</b>：渲染哪一面（正面 / 背面 / 双面），打开线框后切换很直观</li>
    </ul>
    <h3>本例说明</h3>
    <p>橘黄色大球在前，浅绿色小球在后，两球保持一定距离。小球使用右上角面板控制的材质，尝试把 <code>opacity</code> 调低或<b>关闭 depthTest</b> 观察效果。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1.5, 6);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    // 前面的橘黄色大球：固定材质，用于遮挡
    const bigMat = new THREE.MeshBasicMaterial({color: 0xd9820f});
    const big = new THREE.Mesh(new THREE.SphereGeometry(1.4, 48, 24), bigMat);
    big.position.set(0, 0, 0.6);
    ctx.scene.add(big);

    // 后面的浅绿色小球：使用面板控制的材质，与大球保持一点距离
    const material = new THREE.MeshBasicMaterial({color: 0x86efac});

    const small = new THREE.Mesh(new THREE.SphereGeometry(0.8, 48, 24), material);
    small.position.set(1.7, 0, -1.3);
    ctx.scene.add(small);

    // 场景里有灯光，但 Basic 材质完全不受影响
    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(3, 5, 4);
    ctx.scene.add(dirLight);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    const DEF = {
      opacity: 1,
      transparent: 0,
      wireframe: 0,
      depthTest: 1,
      depthWrite: 1,
    };

    const controlsDefs: ParamSlider[] = [
      {
        key: 'opacity',
        label: 'opacity',
        min: 0,
        max: 1,
        step: 0.01,
        value: DEF.opacity,
        desc: '透明度（调低时自动开启 transparent）'
      },
      {
        key: 'transparent',
        label: 'transparent',
        type: 'checkbox',
        min: 0,
        max: 1,
        step: 1,
        value: DEF.transparent,
        desc: '开启后 opacity 才生效'
      },
      {
        key: 'wireframe',
        label: 'wireframe',
        type: 'checkbox',
        min: 0,
        max: 1,
        step: 1,
        value: DEF.wireframe,
        desc: '仅显示三角面网格线'
      },
      {
        key: 'depthTest',
        label: 'depthTest',
        type: 'checkbox',
        min: 0,
        max: 1,
        step: 1,
        value: DEF.depthTest,
        desc: '关闭后小球穿透大球显示'
      },
      {
        key: 'depthWrite',
        label: 'depthWrite',
        type: 'checkbox',
        min: 0,
        max: 1,
        step: 1,
        value: DEF.depthWrite,
        desc: '是否写入深度缓冲'
      },
    ];

    const apply = (key: string, value: number) => {
      switch (key) {
        case 'opacity':
          material.opacity = value;
          if (value < 1) material.transparent = true;
          break;
        case 'transparent':
          material.transparent = value >= 0.5;
          break;
        case 'wireframe':
          material.wireframe = value >= 0.5;
          break;
        case 'depthTest':
          material.depthTest = value >= 0.5;
          break;
        case 'depthWrite':
          material.depthWrite = value >= 0.5;
          break;
      }
    };

    const resetAll = () => {
      material.opacity = DEF.opacity;
      material.transparent = DEF.transparent >= 0.5;
      material.wireframe = DEF.wireframe >= 0.5;
      material.depthTest = DEF.depthTest >= 0.5;
      material.depthWrite = DEF.depthWrite >= 0.5;
      material.side = THREE.FrontSide;
      sideGroup.sync();
    };

    const panel = createParamPanel({
      container,
      controls: controlsDefs,
      defaults: DEF,
      onChange: apply,
      onReset: resetAll,
    });

    const sideGroup = panel.addControlGroup({
      title: 'side 渲染面',
      items: [
        {
          label: '正面',
          onClick: () => {
            material.side = THREE.FrontSide;
            sideGroup.sync();
          },
          active: () => material.side === THREE.FrontSide,
        },
        {
          label: '背面',
          onClick: () => {
            material.side = THREE.BackSide;
            sideGroup.sync();
          },
          active: () => material.side === THREE.BackSide,
        },
        {
          label: '双面',
          onClick: () => {
            material.side = THREE.DoubleSide;
            sideGroup.sync();
          },
          active: () => material.side === THREE.DoubleSide,
        },
      ],
    });
    sideGroup.sync();

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      big.rotation.y += 0.006;
      small.rotation.y -= 0.008;
      controls.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      bigMat.dispose();
      panel.remove();
    });
  },
};
