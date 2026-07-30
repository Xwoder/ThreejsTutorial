import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const icosahedronDescription = `
  <h2>IcosahedronGeometry 二十面体</h2>
  <p>正二十面体：由 20 个正三角形面组成，是五种柏拉图立体之一，也是地球仪/足球（截角二十面体）的近似基础。</p>
  <pre><code>new THREE.IcosahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 20 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>IcosahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个三角形细分，逐渐趋近球体。</p>
`;

export const icosahedronGeometry: Lesson = makeGeometryLesson({
  id: 'icosahedron-geometry',
  title: 'IcosahedronGeometry 二十面体',
  description: icosahedronDescription,
  createGeometry: (p) =>
    new THREE.IcosahedronGeometry(p.radius, p.detail),
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
