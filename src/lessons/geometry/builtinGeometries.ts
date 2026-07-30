import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';
import { createParamPanel } from '../paramPanel';
import type { ParamSlider } from '../paramPanel';

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

      let panel: ReturnType<typeof createParamPanel> | null = null;
      if (controls.length) {
        panel = createParamPanel({
          container,
          controls,
          defaults: initialParams,
          onChange: (key, value) => {
            params = { ...params, [key]: value };
            const next = createGeometry(params);
            mesh.geometry = next;
            geometry.dispose();
            geometry = next;
          },
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
  <p>本例使用 <code>ConeGeometry(1, 2, 32)</code>。把 <code>openEnded</code> 调为 <code>1</code> 可得到一个无底的圆锥面（如漏斗）。</p>
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
      { key: 'width', label: 'width', min: 0.2, max: 3, step: 0.1, value: 1.6, desc: '立方体在 X 方向的尺寸', precision: 1 },
      { key: 'height', label: 'height', min: 0.2, max: 3, step: 0.1, value: 1.6, desc: '立方体在 Y 方向的尺寸', precision: 1 },
      { key: 'depth', label: 'depth', min: 0.2, max: 3, step: 0.1, value: 1.6, desc: '立方体在 Z 方向的尺寸', precision: 1 },
      { key: 'widthSegments', label: 'widthSegments', min: 1, max: 10, step: 1, value: 1, desc: 'X 方向细分数，越大顶点越密', precision: 0 },
      { key: 'heightSegments', label: 'heightSegments', min: 1, max: 10, step: 1, value: 1, desc: 'Y 方向细分数', precision: 0 },
      { key: 'depthSegments', label: 'depthSegments', min: 1, max: 10, step: 1, value: 1, desc: 'Z 方向细分数', precision: 0 },
    ],
    cameraPos: [0, 1.6, 5],
  }),
  makeGeometryLesson({
    id: 'sphere-geometry',
    title: 'SphereGeometry 球体',
    description: sphereDescription,
    createGeometry: (p) =>
      new THREE.SphereGeometry(
        p.radius,
        p.widthSegments,
        p.heightSegments,
        0,
        p.phiLength,
        0,
        p.thetaLength,
      ),
    params: {
      radius: 1,
      widthSegments: 32,
      heightSegments: 16,
      phiLength: Math.PI * 2,
      thetaLength: Math.PI,
    },
    controls: [
      { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1, desc: '球的半径', precision: 1 },
      { key: 'widthSegments', label: 'widthSegments', min: 3, max: 64, step: 1, value: 32, desc: '经度方向分段，越大越平滑', precision: 0 },
      { key: 'heightSegments', label: 'heightSegments', min: 2, max: 32, step: 1, value: 16, desc: '纬度方向分段，越大越平滑', precision: 0 },
      { key: 'phiLength', label: 'phiLength', min: 0, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '水平方向扫过角度（2π 为整球）', precision: 2 },
      { key: 'thetaLength', label: 'thetaLength', min: 0, max: Math.PI, step: 0.01, value: Math.PI, desc: '垂直方向扫过角度（π 为整球）', precision: 2 },
    ],
    cameraPos: [0, 0, 5],
  }),
  makeGeometryLesson({
    id: 'cone-geometry',
    title: 'ConeGeometry 圆锥',
    description: coneDescription,
    createGeometry: (p) =>
      new THREE.ConeGeometry(
        p.radius,
        p.height,
        p.radialSegments,
        p.heightSegments,
        p.openEnded >= 0.5,
        0,
        p.thetaLength,
      ),
    params: {
      radius: 1,
      height: 2,
      radialSegments: 32,
      heightSegments: 1,
      thetaLength: Math.PI * 2,
      openEnded: 0,
    },
    controls: [
      { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1, desc: '底面半径', precision: 1 },
      { key: 'height', label: 'height', min: 0.2, max: 4, step: 0.1, value: 2, desc: '圆锥高度', precision: 1 },
      { key: 'radialSegments', label: 'radialSegments', min: 3, max: 64, step: 1, value: 32, desc: '圆周分段，越大底面越圆', precision: 0 },
      { key: 'heightSegments', label: 'heightSegments', min: 1, max: 20, step: 1, value: 1, desc: '高度方向分段', precision: 0 },
      { key: 'thetaLength', label: 'thetaLength', min: 0.1, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '绕轴扫过角度（2π 为整圈）', precision: 2 },
      { key: 'openEnded', label: 'openEnded', min: 0, max: 1, step: 1, value: 0, desc: '是否开口（1 为无底面）', precision: 0 },
    ],
    cameraPos: [0, 0.5, 5],
  }),
  makeGeometryLesson({
    id: 'torus-geometry',
    title: 'TorusGeometry 圆环',
    description: torusDescription,
    createGeometry: (p) =>
      new THREE.TorusGeometry(
        p.radius,
        p.tube,
        p.radialSegments,
        p.tubularSegments,
        p.arc,
      ),
    params: {
      radius: 1,
      tube: 0.4,
      radialSegments: 16,
      tubularSegments: 80,
      arc: Math.PI * 2,
    },
    controls: [
      { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1, desc: '环的中心半径', precision: 1 },
      { key: 'tube', label: 'tube', min: 0.05, max: 1.5, step: 0.05, value: 0.4, desc: '管道半径', precision: 2 },
      { key: 'radialSegments', label: 'radialSegments', min: 3, max: 32, step: 1, value: 16, desc: '管道横截面分段', precision: 0 },
      { key: 'tubularSegments', label: 'tubularSegments', min: 3, max: 200, step: 1, value: 80, desc: '环向分段，越大越平滑', precision: 0 },
      { key: 'arc', label: 'arc', min: 0.1, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '环的角度范围（2π 为整圈）', precision: 2 },
    ],
    cameraPos: [0, 0, 5],
  }),
  makeGeometryLesson({
    id: 'torus-knot-geometry',
    title: 'TorusKnotGeometry 环面纽结',
    description: torusKnotDescription,
    createGeometry: (p) =>
      new THREE.TorusKnotGeometry(
        p.radius,
        p.tube,
        p.tubularSegments,
        p.radialSegments,
        p.p,
        p.q,
      ),
    params: {
      radius: 1,
      tube: 0.3,
      tubularSegments: 128,
      radialSegments: 16,
      p: 2,
      q: 3,
    },
    controls: [
      { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1, desc: '整体半径', precision: 1 },
      { key: 'tube', label: 'tube', min: 0.05, max: 1, step: 0.05, value: 0.3, desc: '管道半径', precision: 2 },
      { key: 'tubularSegments', label: 'tubularSegments', min: 3, max: 300, step: 1, value: 128, desc: '曲线分段，越大越平滑', precision: 0 },
      { key: 'radialSegments', label: 'radialSegments', min: 3, max: 32, step: 1, value: 16, desc: '管道横截面分段', precision: 0 },
      { key: 'p', label: 'p', min: 1, max: 10, step: 1, value: 2, desc: '绕主环圈数（与 q 互质更佳）', precision: 0 },
      { key: 'q', label: 'q', min: 1, max: 10, step: 1, value: 3, desc: '绕管自身圈数', precision: 0 },
    ],
    cameraPos: [0, 0, 5],
    spin: 0.8,
  }),
  makeGeometryLesson({
    id: 'cylinder-geometry',
    title: 'CylinderGeometry 圆柱',
    description: cylinderDescription,
    createGeometry: (p) =>
      new THREE.CylinderGeometry(
        p.radiusTop,
        p.radiusBottom,
        p.height,
        p.radialSegments,
        p.heightSegments,
        p.openEnded >= 0.5,
        0,
        p.thetaLength,
      ),
    params: {
      radiusTop: 1,
      radiusBottom: 1,
      height: 2,
      radialSegments: 32,
      heightSegments: 1,
      thetaLength: Math.PI * 2,
      openEnded: 0,
    },
    controls: [
      { key: 'radiusTop', label: 'radiusTop', min: 0, max: 3, step: 0.1, value: 1, desc: '顶面半径（与底面不同即成圆台）', precision: 1 },
      { key: 'radiusBottom', label: 'radiusBottom', min: 0, max: 3, step: 0.1, value: 1, desc: '底面半径', precision: 1 },
      { key: 'height', label: 'height', min: 0.2, max: 4, step: 0.1, value: 2, desc: '圆柱高度', precision: 1 },
      { key: 'radialSegments', label: 'radialSegments', min: 3, max: 64, step: 1, value: 32, desc: '圆周分段', precision: 0 },
      { key: 'heightSegments', label: 'heightSegments', min: 1, max: 20, step: 1, value: 1, desc: '高度方向分段', precision: 0 },
      { key: 'thetaLength', label: 'thetaLength', min: 0.1, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '绕轴扫过角度（2π 为整圈）', precision: 2 },
      { key: 'openEnded', label: 'openEnded', min: 0, max: 1, step: 1, value: 0, desc: '是否开口（1 为无顶底）', precision: 0 },
    ],
    cameraPos: [0, 0.5, 5],
  }),
];
