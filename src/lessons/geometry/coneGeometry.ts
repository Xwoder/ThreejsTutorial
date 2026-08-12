import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

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

export const coneGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/cone-geometry',
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
});
