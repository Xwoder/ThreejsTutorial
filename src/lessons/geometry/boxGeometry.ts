import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type {ParamSlider} from '../../utils/paramPanel.ts';
import type { Lesson } from '../types';

const boxDescription = `
  <h2>BoxGeometry 立方体</h2>
  <p>最简单的几何体，由 6 个矩形面围成一个长方体。</p>
  <pre><code>new THREE.BoxGeometry(
  width,            // 宽（X 方向）
  height,           // 高（Y 方向）
  depth,            // 深（Z 方向）
  widthSegments,    // 宽方向分段（默认 1）
  heightSegments,   // 高方向分段（默认 1）
  depthSegments     // 深方向分段（默认 1）
)</code></pre>
  <p>本例默认创建一个正方体。分段数大于 1 时，可在顶点级别做变形（如波浪起伏）。</p>
  <p>颜色由 <b>MeshNormalMaterial</b> 根据法线方向着色，便于观察每个面的朝向。拖动鼠标可环绕查看。</p>
  <p>右上角提供 3 个选项卡切换同一几何体的不同表现方式：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`;

/** 视图模式：原始几何体 / EdgesGeometry 边缘 / WireframeGeometry 框线 */
type ViewMode = 'geometry' | 'edges' | 'wireframe';

export const boxGeometry: Lesson = {
  id: 'geometry/box-geometry',
  title: 'BoxGeometry 立方体',
  description: boxDescription,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1.6, 5);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const orbit = new OrbitControls(camera, ctx.renderer.domElement);
    orbit.enableDamping = true;

    const params: Record<string, number> = {
      width: 1.6,
      height: 1.6,
      depth: 1.6,
      widthSegments: 1,
      heightSegments: 1,
      depthSegments: 1,
    };
    let mode: ViewMode = 'geometry';

    const solidMat = new THREE.MeshNormalMaterial();
    const surfaceMat = new THREE.MeshNormalMaterial({transparent: true, opacity: 0.2});
    const edgeMat = new THREE.LineBasicMaterial({color: 0xffffff});
    const wireMat = new THREE.LineBasicMaterial({color: 0x33e0ff});

    const group = new THREE.Group();
    ctx.scene.add(group);

    const buildBox = () =>
        new THREE.BoxGeometry(
            params.width,
            params.height,
            params.depth,
            params.widthSegments,
            params.heightSegments,
            params.depthSegments,
        );

    const rebuild = () => {
      group.traverse((o) => {
        const obj = o as THREE.Mesh;
        if (obj.geometry) obj.geometry.dispose();
      });
      group.clear();

      if (mode === 'geometry') {
        group.add(new THREE.Mesh(buildBox(), solidMat));
        return;
      }
      const surface = new THREE.Mesh(buildBox(), surfaceMat);
      const source = surface.geometry;
      const lines =
          mode === 'edges'
              ? new THREE.LineSegments(new THREE.EdgesGeometry(source), edgeMat)
              : new THREE.LineSegments(new THREE.WireframeGeometry(source), wireMat);
      group.add(surface, lines);
    };
    rebuild();

    // 右上角选项卡：几何体 / 边缘 / 框线
    const tabs = document.createElement('div');
    tabs.className = 'view-tabs';
    const tabDefs: { mode: ViewMode; label: string }[] = [
      {mode: 'geometry', label: '几何体'},
      {mode: 'edges', label: '边缘'},
      {mode: 'wireframe', label: '框线'},
    ];
    const tabBtns: HTMLButtonElement[] = [];
    tabDefs.forEach((def) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = def.label;
      btn.addEventListener('click', () => {
        mode = def.mode;
        tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
        rebuild();
      });
      tabs.appendChild(btn);
      tabBtns.push(btn);
    });
    tabBtns[0].classList.add('active');
    container.appendChild(tabs);

    const controls: ParamSlider[] = [
      {
        key: 'width',
        label: 'width',
        min: 0.2,
        max: 3,
        step: 0.1,
        value: 1.6,
        desc: '立方体在 X 方向的尺寸',
        precision: 1
      },
      {
        key: 'height',
        label: 'height',
        min: 0.2,
        max: 3,
        step: 0.1,
        value: 1.6,
        desc: '立方体在 Y 方向的尺寸',
        precision: 1
      },
      {
        key: 'depth',
        label: 'depth',
        min: 0.2,
        max: 3,
        step: 0.1,
        value: 1.6,
        desc: '立方体在 Z 方向的尺寸',
        precision: 1
      },
      {
        key: 'widthSegments',
        label: 'widthSegments',
        min: 1,
        max: 10,
        step: 1,
        value: 1,
        desc: 'X 方向细分数，越大顶点越密',
        precision: 0
      },
      {
        key: 'heightSegments',
        label: 'heightSegments',
        min: 1,
        max: 10,
        step: 1,
        value: 1,
        desc: 'Y 方向细分数',
        precision: 0
      },
      {
        key: 'depthSegments',
        label: 'depthSegments',
        min: 1,
        max: 10,
        step: 1,
        value: 1,
        desc: 'Z 方向细分数',
        precision: 0
      },
    ];

    const panel = createParamPanel({
      container,
      controls,
      defaults: {...params},
      onChange: (key, value) => {
        params[key] = value;
        rebuild();
      },
    });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      group.rotation.y += 0.006;
      orbit.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      orbit.dispose();
      tabs.remove();
      panel.remove();
    });
  },
};
