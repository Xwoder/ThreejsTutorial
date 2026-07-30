import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const tubeDescription = `
  <h2>TubeGeometry 管状</h2>
  <p>沿一条三维曲线（<code>Curve</code>）扫出一根管道，常用于飘带、管道、藤蔓、霓虹灯管等。曲线本身由若干控制点拟合而成。</p>
  <pre><code>new THREE.TubeGeometry(
  path,           // 中心曲线（如 CatmullRomCurve3）
  tubularSegments,// 沿曲线分段
  radius,         // 管半径
  radialSegments, // 管截面圆周分段
  closed          // 是否首尾闭合
)</code></pre>
  <p>本例用一条扭动的曲线演示。勾选 <code>closed</code> 可让管道首尾相连成环。</p>
`;

// 一条扭动的三维曲线
const tubePath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-2, 0, 0),
  new THREE.Vector3(-1, 1, 1),
  new THREE.Vector3(0, -1, 1),
  new THREE.Vector3(1, 1, -1),
  new THREE.Vector3(2, 0, 0),
]);

export const tubeGeometry: Lesson = makeGeometryLesson({
  id: 'tube-geometry',
  title: 'TubeGeometry 管状',
  description: tubeDescription,
  createGeometry: (p) =>
    new THREE.TubeGeometry(
      tubePath,
      p.tubularSegments,
      p.radius,
      p.radialSegments,
      p.closed >= 0.5,
    ),
  params: {
    tubularSegments: 64,
    radius: 0.3,
    radialSegments: 16,
    closed: 0,
  },
  controls: [
    { key: 'tubularSegments', label: 'tubularSegments', min: 3, max: 200, step: 1, value: 64, desc: '沿曲线分段，越大越顺滑', precision: 0 },
    { key: 'radius', label: 'radius', min: 0.05, max: 1, step: 0.05, value: 0.3, desc: '管道半径', precision: 2 },
    { key: 'radialSegments', label: 'radialSegments', min: 3, max: 32, step: 1, value: 16, desc: '管截面圆周分段', precision: 0 },
    { key: 'closed', label: 'closed', min: 0, max: 1, step: 1, value: 0, desc: '是否首尾闭合（1 为成环）', precision: 0 },
  ],
  cameraPos: [0, 0, 6],
});
