import * as THREE from 'three';
import type { Lesson } from '../types';
import { makeGeometryLesson } from './geometryLesson';

const latheDescription = `
  <h2>LatheGeometry 车削体</h2>
  <p>把一条二维轮廓线（<code>Vector2</code> 点列，x 为半径、y 为高度）绕 Y 轴旋转一周，生成花瓶、杯子、碗等回转体。</p>
  <pre><code>new THREE.LatheGeometry(
  points,     // 轮廓点列 Vector2[]
  segments,   // 旋转方向分段
  phiStart,   // 起始角度
  phiLength   // 扫过角度（2π 为完整回转体）
)</code></pre>
  <p>本例用一段花瓶轮廓演示。缩小 <code>phiLength</code> 可得到只转半圈、未闭合的回转面。</p>
`;

/** 生成花瓶轮廓：x 为半径，y 为高度；scale 整体缩放宽度 */
function vaseProfile(scale: number): THREE.Vector2[] {
  const raw: [number, number][] = [
    [0.0, 0.0],
    [1.0, 0.0],
    [1.0, 0.2],
    [0.6, 0.6],
    [0.9, 1.2],
    [0.5, 1.8],
    [0.6, 2.2],
    [0.5, 2.2],
  ];
  return raw.map(([x, y]) => new THREE.Vector2(x * scale, y));
}

export const latheGeometry: Lesson = makeGeometryLesson({
  id: 'lathe-geometry',
  title: 'LatheGeometry 车削体',
  description: latheDescription,
  createGeometry: (p) =>
    new THREE.LatheGeometry(
      vaseProfile(p.scale),
      p.segments,
      0,
      p.phiLength,
    ),
  params: {
    scale: 1,
    segments: 64,
    phiLength: Math.PI * 2,
  },
  controls: [
    { key: 'scale', label: 'scale', min: 0.3, max: 1.5, step: 0.05, value: 1, desc: '轮廓整体宽度缩放', precision: 2 },
    { key: 'segments', label: 'segments', min: 3, max: 128, step: 1, value: 64, desc: '旋转方向分段，越大越圆滑', precision: 0 },
    { key: 'phiLength', label: 'phiLength', min: 0.1, max: Math.PI * 2, step: 0.01, value: Math.PI * 2, desc: '扫过角度（2π 为完整回转体，调小未闭合）', precision: 2 },
  ],
  cameraPos: [0, 1, 6],
});
