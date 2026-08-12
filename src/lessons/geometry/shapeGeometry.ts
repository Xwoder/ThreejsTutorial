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
`;

/** 生成心形轮廓（中心大致在原点） */
function heartShape(): THREE.Shape {
  const s = new THREE.Shape();
  const x = 0;
  const y = 0;
  s.moveTo(x, y + 0.5);
  s.bezierCurveTo(x, y + 0.5, x - 0.5, y + 0.9, x - 0.5, y + 0.4);
  s.bezierCurveTo(x - 0.5, y, x - 0.25, y, x, y - 0.3);
  s.bezierCurveTo(x + 0.25, y, x + 0.5, y, x + 0.5, y + 0.4);
  s.bezierCurveTo(x + 0.5, y + 0.9, x, y + 0.5, x, y + 0.5);
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
  // 心形整体偏上，抬高相机目标
  cameraPos: [0, 0.2, 5],
});
