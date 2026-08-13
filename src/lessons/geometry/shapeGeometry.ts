import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const shapeDescription = `
  <h2>ShapeGeometry 形状</h2>
  <p>把一条二维 <code>Shape</code> 路径直接铺平成网格（无厚度），适合做贴花、徽标、2D 剪影。与 <code>ExtrudeGeometry</code> 的区别在于它不拉伸、永远是个平面。</p>
  <pre><code>new THREE.ShapeGeometry(
  shape,        // 二维轮廓 THREE.Shape
  curveSegments // 曲线分段（影响轮廓平滑度）
)</code></pre>
  <p>本例用一颗心形轮廓演示。加大 <code>curveSegments</code> 让曲线更圆滑。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code>）、<b>框线</b>（<code>WireframeGeometry</code>）。Shape 网格是平面，所有三角面共面、夹角为 0，因此 <code>EdgesGeometry</code> 默认阈值下<strong>不会画出任何棱线</strong>；而 <code>WireframeGeometry</code> 会把全部三角边画出，正好看清心形内部的三边剖分结构。</p>
`;

/** 生成心形轮廓（中心大致在原点） */
function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  const x = 0;
  const y = 0;
  s.moveTo(x, y + 1.25);
  s.bezierCurveTo(x, y + 1.25, x - 1.25, y + 2.25, x - 1.25, y + 1.0);
  s.bezierCurveTo(x - 1.25, y, x - 0.625, y, x, y - 0.75);
  s.bezierCurveTo(x + 0.625, y, x + 1.25, y, x + 1.25, y + 1.0);
  s.bezierCurveTo(x + 1.25, y + 2.25, x, y + 1.25, x, y + 1.25);
  return s;
}

export const shapeGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/shape-geometry',
  title: 'ShapeGeometry 形状',
  description: shapeDescription,
  createGeometry: (p) => new THREE.ShapeGeometry(heartShape(), p.curveSegments),
  params: {
    curveSegments: 12,
  },
  controls: [
    { key: 'curveSegments', label: 'curveSegments', min: 1, max: 64, step: 1, value: 12, desc: '曲线分段，越大轮廓越圆滑', precision: 0 },
  ],
  // 心形范围 y ∈ [-0.75, 2.25]，中心在 y=0.75；相机略高于中心，让心形每次进入都居中
  cameraPos: [0, 1.2, 3.5],
  target: [0, 0.75, 0],
  side: THREE.DoubleSide,
  viewTabs: true,
});
