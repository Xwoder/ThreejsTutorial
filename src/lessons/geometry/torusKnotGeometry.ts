import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

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
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`;

export const torusKnotGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/torus-knot-geometry',
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
  viewTabs: true,
});
