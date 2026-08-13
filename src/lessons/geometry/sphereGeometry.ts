import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const sphereDescription = `
  <h2>SphereGeometry 球体</h2>
  <p>通过经纬度（宽高分段）近似一个球面。</p>
  <pre><code>new THREE.SphereGeometry(
  radius,         // 半径
  widthSegments,  // 经度方向分段（越大越平滑）
  heightSegments, // 纬度方向分段（越大越平滑）
  phiStart, phiLength,      // 水平方向起止角
  thetaStart, thetaLength   // 垂直方向起止角
)</code></pre>
  <p>本例使用 <code>SphereGeometry(1, 32, 16)</code>。分段数直接决定曲面平滑度：分段越多越圆，但顶点数也越多。可通过 <code>phiLength</code> / <code>thetaLength</code> 截取部分球面（如半球、扇形）。</p>
  <p>右上角提供 3 个选项卡切换同一几何体的不同表现方式：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。球面相邻面夹角很小，默认阈值下 <code>EdgesGeometry</code> 几乎不画棱，而 <code>WireframeGeometry</code> 会画出所有三角棱，两者差异一目了然。</p>
`;

export const sphereGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/sphere-geometry',
  title: 'SphereGeometry 球体',
  description: sphereDescription,
  createGeometry: (p) =>
    new THREE.SphereGeometry(
      p.radius,
      p.widthSegments,
      p.heightSegments,
      0,
      p.phiLength,
      0,
      p.thetaLength,
    ),
  params: {
    radius: 1,
    widthSegments: 32,
    heightSegments: 16,
    phiLength: Math.PI * 2,
    thetaLength: Math.PI,
  },
  controls: [
    { key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1, desc: '球的半径', precision: 1 },
    { key: 'widthSegments', label: 'widthSegments', min: 3, max: 64, step: 1, value: 32, desc: '经度方向分段，越大越平滑', precision: 0 },
    { key: 'heightSegments', label: 'heightSegments', min: 2, max: 32, step: 1, value: 16, desc: '纬度方向分段，越大越平滑', precision: 0 },
    { key: 'phiLength', label: 'phiLength', min: 0, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '水平方向扫过角度（2π 为整球）', precision: 2 },
    { key: 'thetaLength', label: 'thetaLength', min: 0, max: Math.PI, step: 0.01, value: Math.PI, desc: '垂直方向扫过角度（π 为整球）', precision: 2 },
  ],
  cameraPos: [0, 0, 5],
  viewTabs: true,
});
