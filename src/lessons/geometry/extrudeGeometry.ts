import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const extrudeDescription = `
  <h2>ExtrudeGeometry 拉伸体</h2>
  <p>把一个二维 <code>Shape</code>（路径/多边形）沿 Z 轴拉伸成三维实体，可加倒角。用它能快速做出带厚度的标牌、齿轮、星形块等。</p>
  <pre><code>new THREE.ExtrudeGeometry(
  shape,  // 二维轮廓 THREE.Shape
  {
    depth,           // 拉伸厚度
    bevelEnabled,    // 是否倒角
    bevelThickness,  // 倒角厚度
    bevelSize,       // 倒角尺寸
    bevelSegments,   // 倒角细分
    curveSegments,   // 曲线分段
  }
)</code></pre>
  <p>本例用一颗五角星轮廓演示。关闭 <code>bevelEnabled</code> 得到直角边缘的扁平星块。</p>
`;

/** 生成五角星轮廓（中心在原点，外接半径 1） */
function starShape(): THREE.Shape {
  const shape = new THREE.Shape();
  const spikes = 5;
  const outer = 1;
  const inner = 0.45;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r;
    const y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export const extrudeGeometry: Lesson = makeGeometryLesson({
  id: 'geometry/extrude-geometry',
  title: 'ExtrudeGeometry 拉伸体',
  description: extrudeDescription,
  createGeometry: (p) =>
    new THREE.ExtrudeGeometry(starShape(), {
      depth: p.depth,
      bevelEnabled: p.bevelEnabled >= 0.5,
      bevelThickness: p.bevelThickness,
      bevelSize: p.bevelSize,
      bevelSegments: p.bevelSegments,
      curveSegments: p.curveSegments,
    }),
  params: {
    depth: 0.6,
    bevelEnabled: 1,
    bevelThickness: 0.1,
    bevelSize: 0.1,
    bevelSegments: 3,
    curveSegments: 12,
  },
  controls: [
    { key: 'depth', label: 'depth', min: 0.1, max: 3, step: 0.1, value: 0.6, desc: '拉伸厚度', precision: 1 },
    { key: 'bevelEnabled', label: 'bevelEnabled', type: 'checkbox', min: 0, max: 1, step: 1, value: 1, desc: '是否倒角' },
    { key: 'bevelThickness', label: 'bevelThickness', min: 0, max: 0.5, step: 0.02, value: 0.1, desc: '倒角厚度', precision: 2 },
    { key: 'bevelSize', label: 'bevelSize', min: 0, max: 0.5, step: 0.02, value: 0.1, desc: '倒角尺寸', precision: 2 },
    { key: 'bevelSegments', label: 'bevelSegments', min: 0, max: 10, step: 1, value: 3, desc: '倒角细分', precision: 0 },
    { key: 'curveSegments', label: 'curveSegments', min: 1, max: 32, step: 1, value: 12, desc: '曲线分段（影响轮廓平滑度）', precision: 0 },
  ],
  cameraPos: [0, 0, 5],
});
