import type { Lesson } from '../types';
import { dodecahedronGeometry } from './dodecahedronGeometry';
import { icosahedronGeometry } from './icosahedronGeometry';
import { octahedronGeometry } from './octahedronGeometry';
import { polyhedronGeometry } from './polyhedronGeometry';
import { tetrahedronGeometry } from './tetrahedronGeometry';

const overviewDescription = `
  <h2>多面体 Polyhedron</h2>
  <p>这一类几何体都继承自 <code>PolyhedronGeometry</code>：你给定一组顶点与面索引，它把顶点统一投影到半径为 <code>radius</code> 的球面，再生成网格。下面 5 个课时演示了最典型的几种——其中四面体、八面体、二十面体、十二面体是五种柏拉图立体中的四个（另一个立方体即 BoxGeometry），而 <code>PolyhedronGeometry</code> 正是它们的底层基类，可直接用顶点拼出任意凸多面体。</p>
  <pre><code>new THREE.PolyhedronGeometry(
  vertices,  // 扁平顶点数组 [x,y,z, ...]
  indices,   // 扁平面索引，每 3 个一组构成一个三角形
  radius,    // 外接球半径
  detail     // 细分级别（细分后投影到球面）
)</code></pre>
  <p>它们共享两个参数：<code>radius</code> 控制外接球半径，<code>detail</code> 控制细分级别——调大 <code>detail</code> 会把每个三角面继续细分并重新投影到球面，几何体逐渐趋近球体。逐个点开查看每种立体的构造与效果。</p>
`;

export const polyhedron: Lesson = {
  id: 'geometry/polyhedron',
  title: '多面体 Polyhedron',
  description: overviewDescription,
  children: [
    polyhedronGeometry,
    tetrahedronGeometry,
    octahedronGeometry,
    icosahedronGeometry,
    dodecahedronGeometry,
  ],
};
