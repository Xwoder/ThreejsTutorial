import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const capsuleDescription = `
  <h2>CapsuleGeometry 胶囊体</h2>
  <p>由中间圆柱和两端半球组成，像一截被磨圆的圆柱，常用于角色/药丸等造型。</p>
  <pre><code>new THREE.CapsuleGeometry(
  radius,        // 圆柱部分半径
  length,        // 中间圆柱段长度（不含两端半球）
  capSegments,   // 两端半球分段
  radialSegments // 圆周分段
)</code></pre>
  <p>本例使用 <code>CapsuleGeometry(1, 2, 8, 32)</code>。增大 <code>radius</code> 或减小 <code>length</code> 会更接近球体。</p>
`;

export const capsuleGeometry: Lesson = makeGeometryLesson({
  id: 'capsule-geometry',
  title: 'CapsuleGeometry 胶囊体',
  description: capsuleDescription,
  createGeometry: (p) =>
    new THREE.CapsuleGeometry(
      p.radius,
      p.length,
      p.capSegments,
      p.radialSegments,
    ),
  params: {
    radius: 1,
    length: 2,
    capSegments: 8,
    radialSegments: 32,
  },
  controls: [
    { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1, desc: '圆柱部分半径', precision: 1 },
    { key: 'length', label: 'length', min: 0, max: 4, step: 0.1, value: 2, desc: '中间圆柱段长度（不含两端半球）', precision: 1 },
    { key: 'capSegments', label: 'capSegments', min: 1, max: 32, step: 1, value: 8, desc: '两端半球分段', precision: 0 },
    { key: 'radialSegments', label: 'radialSegments', min: 3, max: 64, step: 1, value: 32, desc: '圆周分段', precision: 0 },
  ],
  cameraPos: [0, 0, 6],
});
