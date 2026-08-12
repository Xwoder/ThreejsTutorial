import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const boxDescription = `
  <h2>BoxGeometry 立方体</h2>
  <p>最简单的几何体，由 6 个矩形面围成一个长方体。</p>
  <pre><code>new THREE.BoxGeometry(
  width,            // 宽（X 方向）
  height,           // 高（Y 方向）
  depth,            // 深（Z 方向）
  widthSegments,    // 宽方向分段（默认 1）
  heightSegments,   // 高方向分段（默认 1）
  depthSegments     // 深方向分段（默认 1）
)</code></pre>
  <p>本例默认创建一个正方体。分段数大于 1 时，可在顶点级别做变形（如波浪起伏）。</p>
  <p>颜色由 <b>MeshNormalMaterial</b> 根据法线方向着色，便于观察每个面的朝向。拖动鼠标可环绕查看。</p>
`;

export const boxGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/box-geometry',
  title: 'BoxGeometry 立方体',
  description: boxDescription,
  createGeometry: (p) =>
    new THREE.BoxGeometry(
      p.width,
      p.height,
      p.depth,
      p.widthSegments,
      p.heightSegments,
      p.depthSegments,
    ),
  params: {
    width: 1.6,
    height: 1.6,
    depth: 1.6,
    widthSegments: 1,
    heightSegments: 1,
    depthSegments: 1,
  },
  controls: [
    { key: 'width', label: 'width', min: 0.2, max: 3, step: 0.1, value: 1.6, desc: '立方体在 X 方向的尺寸', precision: 1 },
    { key: 'height', label: 'height', min: 0.2, max: 3, step: 0.1, value: 1.6, desc: '立方体在 Y 方向的尺寸', precision: 1 },
    { key: 'depth', label: 'depth', min: 0.2, max: 3, step: 0.1, value: 1.6, desc: '立方体在 Z 方向的尺寸', precision: 1 },
    { key: 'widthSegments', label: 'widthSegments', min: 1, max: 10, step: 1, value: 1, desc: 'X 方向细分数，越大顶点越密', precision: 0 },
    { key: 'heightSegments', label: 'heightSegments', min: 1, max: 10, step: 1, value: 1, desc: 'Y 方向细分数', precision: 0 },
    { key: 'depthSegments', label: 'depthSegments', min: 1, max: 10, step: 1, value: 1, desc: 'Z 方向细分数', precision: 0 },
  ],
  cameraPos: [0, 1.6, 5],
});
