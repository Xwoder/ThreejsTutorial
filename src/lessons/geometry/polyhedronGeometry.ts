import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const polyhedronDescription = `
  <h2>PolyhedronGeometry 多面体</h2>
  <p>最通用的多面体基类：你直接给定顶点数组与三角形面索引，它把每个面投影到半径为 <code>radius</code> 的球面并生成网格。四面体、八面体等都是它的特例。</p>
  <pre><code>new THREE.PolyhedronGeometry(
  vertices,  // 扁平顶点数组 [x,y,z, x,y,z, ...]
  indices,   // 扁平面索引，每 3 个一组构成一个三角形
  radius,    // 外接球半径
  detail     // 细分级别（细分后再投影到球面）
)</code></pre>
  <p>本例用 4 个顶点定义一颗正四面体演示。<code>PolyhedronGeometry</code> 是其余柏拉图立体的底层实现，掌握它就能拼出任意凸多面体。</p>
`;

// 正四面体的 4 个顶点与 4 个三角面
const tetrahedronVertices = [
  1, 1, 1,
  1, -1, -1,
  -1, 1, -1,
  -1, -1, 1,
];
const tetrahedronIndices = [
  0, 1, 2,
  0, 3, 1,
  0, 2, 3,
  1, 3, 2,
];

export const polyhedronGeometry: Lesson = makeGeometryLesson({
  id: 'polyhedron-geometry',
  title: 'PolyhedronGeometry 多面体',
  description: polyhedronDescription,
  createGeometry: (p) =>
    new THREE.PolyhedronGeometry(
      tetrahedronVertices,
      tetrahedronIndices,
      p.radius,
      p.detail,
    ),
  params: {
    radius: 1.5,
    detail: 0,
  },
  controls: [
    { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1.5, desc: '外接球半径', precision: 1 },
    { key: 'detail', label: 'detail', min: 0, max: 4, step: 1, value: 0, desc: '细分级别（细分后投影到球面）', precision: 0 },
  ],
  cameraPos: [0, 0, 5],
});
