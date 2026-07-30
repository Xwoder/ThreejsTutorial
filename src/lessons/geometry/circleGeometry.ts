import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const circleDescription = `
  <h2>CircleGeometry 圆形</h2>
  <p>在 XY 平面上的一个圆盘（扇形），由圆心和圆周上的一圈顶点组成，默认朝向 +Z。</p>
  <pre><code>new THREE.CircleGeometry(
  radius,       // 半径
  segments,     // 圆周分段（越大越接近正圆）
  thetaStart,   // 起始角度
  thetaLength   // 扫过角度（2π 为整圆）
)</code></pre>
  <p>本例使用 <code>CircleGeometry(1.5, 64)</code>。把 <code>thetaLength</code> 调小即可得到扇形（如披萨切片）。</p>
`;

export const circleGeometry: Lesson = makeGeometryLesson({
  id: 'circle-geometry',
  title: 'CircleGeometry 圆形',
  description: circleDescription,
  createGeometry: (p) =>
    new THREE.CircleGeometry(p.radius, p.segments, 0, p.thetaLength),
  params: {
    radius: 1.5,
    segments: 64,
    thetaLength: Math.PI * 2,
  },
  controls: [
    { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1.5, desc: '圆盘半径', precision: 1 },
    { key: 'segments', label: 'segments', min: 3, max: 128, step: 1, value: 64, desc: '圆周分段，越大越接近正圆', precision: 0 },
    { key: 'thetaLength', label: 'thetaLength', min: 0.1, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '扫过角度（2π 为整圆，调小成扇形）', precision: 2 },
  ],
  cameraPos: [0, 0, 5],
  side: THREE.DoubleSide,
});
