import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const ringDescription = `
  <h2>RingGeometry 圆环</h2>
  <p>XY 平面上的环形平面（圆孔圆盘），默认朝向 +Z，常用于光环、表盘、瞄准圈等。</p>
  <pre><code>new THREE.RingGeometry(
  innerRadius,    // 内半径（孔）
  outerRadius,    // 外半径
  thetaSegments,  // 圆周分段
  phiSegments,    // 径向分段
  thetaStart,     // 起始角度
  thetaLength     // 扫过角度（2π 为整环）
)</code></pre>
  <p>本例使用 <code>RingGeometry(1, 2, 32)</code>。缩小 <code>thetaLength</code> 可得到一段圆弧环；加大 <code>phiSegments</code> 可让内外边缘更区分。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code>）、<b>框线</b>（<code>WireframeGeometry</code>）。环面是平面，所有三角面共面、夹角为 0，因此 <code>EdgesGeometry</code> 默认阈值下<strong>不会画出任何棱线</strong>；而 <code>WireframeGeometry</code> 会把全部三角边画出，正好看清环形网格的内外圈细分结构。</p>
`;

export const ringGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/ring-geometry',
  title: 'RingGeometry 圆环',
  description: ringDescription,
  createGeometry: (p) =>
    new THREE.RingGeometry(
      p.innerRadius,
      p.outerRadius,
      p.thetaSegments,
      p.phiSegments,
      0,
      p.thetaLength,
    ),
  params: {
    innerRadius: 1,
    outerRadius: 2,
    thetaSegments: 32,
    phiSegments: 1,
    thetaLength: Math.PI * 2,
  },
  controls: [
    { key: 'innerRadius', label: 'innerRadius', min: 0.1, max: 2, step: 0.1, value: 1, desc: '内半径（孔的大小）', precision: 1 },
    { key: 'outerRadius', label: 'outerRadius', min: 1, max: 3, step: 0.1, value: 2, desc: '外半径', precision: 1 },
    { key: 'thetaSegments', label: 'thetaSegments', min: 3, max: 128, step: 1, value: 32, desc: '圆周分段', precision: 0 },
    { key: 'phiSegments', label: 'phiSegments', min: 1, max: 16, step: 1, value: 1, desc: '径向分段', precision: 0 },
    { key: 'thetaLength', label: 'thetaLength', min: 0.1, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '扫过角度（2π 为整环，调小成弧段）', precision: 2 },
  ],
  cameraPos: [0, 0, 5],
  side: THREE.DoubleSide,
  viewTabs: true,
});
