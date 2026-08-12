import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const tetrahedronDescription = `
  <h2>TetrahedronGeometry 四面体</h2>
  <p>正四面体：由 4 个正三角形面组成，是五种柏拉图立体中面数最少的一个，外形像金字塔，也是最简单的凸多面体。</p>
  <pre><code>new THREE.TetrahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 4 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>TetrahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个三角形细分，逐渐趋近球体。</p>
`;

export const tetrahedronGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/polyhedron/tetrahedron-geometry',
  title: 'TetrahedronGeometry 四面体',
  description: tetrahedronDescription,
  createGeometry: (p) =>
    new THREE.TetrahedronGeometry(p.radius, p.detail),
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
