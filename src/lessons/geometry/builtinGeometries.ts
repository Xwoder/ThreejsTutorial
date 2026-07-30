import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

interface ParamSlider {
  key: string;
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
}

interface GeometryLessonOptions {
  id: string;
  title: string;
  description: string;
  createGeometry: (params: Record<string, number>) => THREE.BufferGeometry;
  params?: Record<string, number>;
  controls?: ParamSlider[];
  cameraPos?: [number, number, number];
  /** 旋转速度倍率 */
  spin?: number;
}

/** 在画布左上角构建参数调节面板，onChange 返回最新参数 */
function buildParamPanel(
  container: HTMLElement,
  controls: ParamSlider[],
  params: Record<string, number>,
  onChange: (key: string, value: number) => void,
): HTMLElement {
  const panel = document.createElement('div');
  panel.className = 'param-panel';
  panel.innerHTML = `<div class="param-panel-title">参数</div>`;

  controls.forEach((c) => {
    const row = document.createElement('div');
    row.className = 'param-row';

    const header = document.createElement('div');
    header.className = 'param-header';
    const label = document.createElement('span');
    label.textContent = c.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'param-value';
    valueEl.textContent = String(params[c.key]);
    header.append(label, valueEl);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = String(c.min);
    input.max = String(c.max);
    input.step = String(c.step);
    input.value = String(params[c.key]);
    input.addEventListener('input', () => {
      const v = Number(input.value);
      valueEl.textContent = String(v);
      onChange(c.key, v);
    });

    row.append(header, input);
    panel.appendChild(row);
  });

  container.appendChild(panel);
  return panel;
}

/** 用 MeshNormalMaterial 单独展示一种几何体，可环绕查看 */
function makeGeometryLesson(opts: GeometryLessonOptions): Lesson {
  const {
    id,
    title,
    description,
    createGeometry,
    params: initialParams = {},
    controls = [],
    cameraPos = [0, 1.5, 5],
    spin = 1,
  } = opts;

  return {
    id,
    title,
    description,
    create(container) {
      const ctx = createContext(container);
      ctx.scene.background = new THREE.Color(0x111827);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(...cameraPos);
      ctx.onResize((w, h) => {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });

      const material = new THREE.MeshNormalMaterial();
      let params = { ...initialParams };
      let geometry = createGeometry(params);
      const mesh = new THREE.Mesh(geometry, material);
      ctx.scene.add(mesh);

      const orbit = new OrbitControls(camera, ctx.renderer.domElement);
      orbit.enableDamping = true;

      let panel: HTMLElement | null = null;
      if (controls.length) {
        panel = buildParamPanel(container, controls, params, (key, value) => {
          params = { ...params, [key]: value };
          const next = createGeometry(params);
          mesh.geometry = next;
          geometry.dispose();
          geometry = next;
        });
      }

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        mesh.rotation.x += 0.004 * spin;
        mesh.rotation.y += 0.006 * spin;
        orbit.update();
        ctx.renderer.render(ctx.scene, camera);
      };
      loop();

      return makeCleanup(ctx, () => {
        cancelAnimationFrame(raf);
        orbit.dispose();
        geometry.dispose();
        material.dispose();
        panel?.remove();
      });
    },
  };
}

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
  <p>画面左上角的<b>参数面板</b>可实时调整宽、高、深及三个方向的分段数，拖动滑块即可看到几何体即时变化。</p>
  <p>颜色由 <b>MeshNormalMaterial</b> 根据法线方向着色，便于观察每个面的朝向。拖动鼠标可环绕查看。</p>
`;

const sphereDescription = `
  <h2>SphereGeometry 球体</h2>
  <p>通过经纬度（宽高分段）近似一个球面。</p>
  <pre><code>new THREE.SphereGeometry(
  radius,         // 半径
  widthSegments,  // 经度方向分段（越大越平滑）
  heightSegments, // 纬度方向分段（越大越平滑）
  phiStart, phiLength,      // 水平方向起止角
  thetaStart, thetaLength   // 垂直方向起止角
)</code></pre>
  <p>本例使用 <code>SphereGeometry(1, 32, 16)</code>。分段数直接决定曲面平滑度：分段越多越圆，但顶点数也越多。可通过 <code>phiLength</code> / <code>thetaLength</code> 截取部分球面（如半球、扇形）。</p>
`;

const coneDescription = `
  <h2>ConeGeometry 圆锥</h2>
  <p>本质上是一个顶点收拢的圆柱，由圆形底面和一个尖端组成。</p>
  <pre><code>new THREE.ConeGeometry(
  radius,        // 底面半径
  height,        // 高度
  radialSegments,// 圆周分段（越大底面越圆）
  heightSegments,// 高度方向分段
  openEnded,     // 是否开口（无底面）
  thetaStart, thetaLength
)</code></pre>
  <p>本例使用 <code>ConeGeometry(1, 2, 32)</code>。把 <code>openEnded</code> 设为 <code>true</code> 可得到一个无底的圆锥面（如漏斗）。</p>
`;

const torusDescription = `
  <h2>TorusGeometry 圆环（甜甜圈）</h2>
  <p>一条圆形管道绕中心轴旋转一周形成的环面。</p>
  <pre><code>new THREE.TorusGeometry(
  radius,         // 环的中心半径
  tube,           // 管道半径
  radialSegments, // 管道横截面分段
  tubularSegments,// 环向分段（越大越平滑）
  arc             // 环的角度范围（默认 2π 整圈）
)</code></pre>
  <p>本例使用 <code>TorusGeometry(1, 0.4, 16, 80)</code>。<code>arc</code> 小于 <code>2π</code> 时可得到一段圆弧环。</p>
`;

const torusKnotDescription = `
  <h2>TorusKnotGeometry 环面纽结</h2>
  <p>一条管道沿着三维纽结曲线（(p, q) 环面纽结）缠绕而成，外观复杂而优美。</p>
  <pre><code>new THREE.TorusKnotGeometry(
  radius,         // 整体半径
  tube,           // 管道半径
  tubularSegments,// 曲线分段（越大越平滑）
  radialSegments, // 管道横截面分段
  p,              // 绕主环圈数
  q               // 绕管自身圈数
)</code></pre>
  <p>本例使用 <code>TorusKnotGeometry(1, 0.3, 128, 16, 2, 3)</code>。<code>p</code> 与 <code>q</code> 互质时能得到不自我交叠的纽结形态。</p>
`;

const cylinderDescription = `
  <h2>CylinderGeometry 圆柱</h2>
  <p>上下两个圆形底面 + 侧面围成的几何体，可做成圆台。</p>
  <pre><code>new THREE.CylinderGeometry(
  radiusTop,     // 顶面半径
  radiusBottom,  // 底面半径
  height,        // 高度
  radialSegments,// 圆周分段
  heightSegments,// 高度方向分段
  openEnded,     // 是否开口（无顶底）
  thetaStart, thetaLength
)</code></pre>
  <p>本例使用 <code>CylinderGeometry(1, 1, 2, 32)</code>。让 <code>radiusTop</code> 与 <code>radiusBottom</code> 不同即可得到圆台（圆锥台）。</p>
`;

export const builtinGeometries: Lesson[] = [
  makeGeometryLesson({
    id: 'box-geometry',
    title: 'BoxGeometry 立方体',
    description: boxDescription,
    createGeometry: (p) =>
      new THREE.BoxGeometry(
        p.width,
        p.height,
        p.depth,
        p.widthSegments,
        p.heightSegments,
        p.depthSegments,
      ),
    params: {
      width: 1.6,
      height: 1.6,
      depth: 1.6,
      widthSegments: 1,
      heightSegments: 1,
      depthSegments: 1,
    },
    controls: [
      { key: 'width', label: '宽度 width', min: 0.2, max: 3, step: 0.1, value: 1.6 },
      { key: 'height', label: '高度 height', min: 0.2, max: 3, step: 0.1, value: 1.6 },
      { key: 'depth', label: '深度 depth', min: 0.2, max: 3, step: 0.1, value: 1.6 },
      { key: 'widthSegments', label: '宽度分段', min: 1, max: 10, step: 1, value: 1 },
      { key: 'heightSegments', label: '高度分段', min: 1, max: 10, step: 1, value: 1 },
      { key: 'depthSegments', label: '深度分段', min: 1, max: 10, step: 1, value: 1 },
    ],
    cameraPos: [0, 1.6, 5],
  }),
  makeGeometryLesson({
    id: 'sphere-geometry',
    title: 'SphereGeometry 球体',
    description: sphereDescription,
    createGeometry: () => new THREE.SphereGeometry(1, 32, 16),
    cameraPos: [0, 0, 5],
  }),
  makeGeometryLesson({
    id: 'cone-geometry',
    title: 'ConeGeometry 圆锥',
    description: coneDescription,
    createGeometry: () => new THREE.ConeGeometry(1, 2, 32),
    cameraPos: [0, 0.5, 5],
  }),
  makeGeometryLesson({
    id: 'torus-geometry',
    title: 'TorusGeometry 圆环',
    description: torusDescription,
    createGeometry: () => new THREE.TorusGeometry(1, 0.4, 16, 80),
    cameraPos: [0, 0, 5],
  }),
  makeGeometryLesson({
    id: 'torus-knot-geometry',
    title: 'TorusKnotGeometry 环面纽结',
    description: torusKnotDescription,
    createGeometry: () => new THREE.TorusKnotGeometry(1, 0.3, 128, 16, 2, 3),
    cameraPos: [0, 0, 5],
    spin: 0.8,
  }),
  makeGeometryLesson({
    id: 'cylinder-geometry',
    title: 'CylinderGeometry 圆柱',
    description: cylinderDescription,
    createGeometry: () => new THREE.CylinderGeometry(1, 1, 2, 32),
    cameraPos: [0, 0.5, 5],
  }),
];
