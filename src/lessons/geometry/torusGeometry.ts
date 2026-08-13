import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

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
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`;

export const torusGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/torus-geometry',
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
  viewTabs: true,
});
