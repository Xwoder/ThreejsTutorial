import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const planeDescription = `
  <h2>PlaneGeometry 平面</h2>
  <p>XY 平面上的一个矩形网格，默认朝向 +Z，是地面、墙壁、水面等最常见的基础面片。它可被细分成多段，便于做顶点动画/布料/波浪。</p>
  <pre><code>new THREE.PlaneGeometry(
  width,          // 宽
  height,         // 高
  widthSegments,  // 宽方向分段
  heightSegments  // 高方向分段
)</code></pre>
  <p>本例使用 <code>PlaneGeometry(4, 4, 1, 1)</code>。加大 <code>widthSegments</code> / <code>heightSegments</code> 可得到更细的网格（配合顶点位移可做波浪）。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code>）、<b>框线</b>（<code>WireframeGeometry</code>）。平面是矩形网格，所有三角面共面、夹角为 0，因此 <code>EdgesGeometry</code> 默认阈值下<strong>不会画出任何棱线</strong>；而 <code>WireframeGeometry</code> 会把全部三角边画出，正好看清平面由两个大三角拼成——把 <code>widthSegments</code> / <code>heightSegments</code> 调大，网格细分一目了然。</p>
`;

export const planeGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/plane-geometry',
  title: 'PlaneGeometry 平面',
  description: planeDescription,
  createGeometry: (p) =>
    new THREE.PlaneGeometry(
      p.width,
      p.height,
      p.widthSegments,
      p.heightSegments,
    ),
  params: {
    width: 4,
    height: 4,
    widthSegments: 1,
    heightSegments: 1,
  },
  controls: [
    { key: 'width', label: 'width', min: 0.5, max: 8, step: 0.1, value: 4, desc: '平面宽度', precision: 1 },
    { key: 'height', label: 'height', min: 0.5, max: 8, step: 0.1, value: 4, desc: '平面高度', precision: 1 },
    { key: 'widthSegments', label: 'widthSegments', min: 1, max: 64, step: 1, value: 1, desc: '宽方向分段（细分网格）', precision: 0 },
    { key: 'heightSegments', label: 'heightSegments', min: 1, max: 64, step: 1, value: 1, desc: '高方向分段（细分网格）', precision: 0 },
  ],
  cameraPos: [0, 0, 6],
  side: THREE.DoubleSide,
  viewTabs: true,
});
