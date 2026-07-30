import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

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

export const cylinderGeometry: Lesson = makeGeometryLesson({
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
});
