import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const dodecahedronDescription = `
  <h2>DodecahedronGeometry 十二面体</h2>
  <p>正十二面体：由 12 个正五边形面组成，是五种柏拉图立体之一，默认中心在原点。</p>
  <pre><code>new THREE.DodecahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 12 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>DodecahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个面细分，逐渐趋近球体。</p>
`;

export const dodecahedronGeometry: Lesson = makeGeometryLesson({
  id: 'dodecahedron-geometry',
  title: 'DodecahedronGeometry 十二面体',
  description: dodecahedronDescription,
  createGeometry: (p) =>
    new THREE.DodecahedronGeometry(p.radius, p.detail),
  params: {
    radius: 1.5,
    detail: 0,
  },
  controls: [
    { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1.5, desc: '外接球半径', precision: 1 },
    { key: 'detail', label: 'detail', min: 0, max: 4, step: 1, value: 0, desc: '细分级别（越大越平滑，趋近球体）', precision: 0 },
  ],
  cameraPos: [0, 0, 5],
});
