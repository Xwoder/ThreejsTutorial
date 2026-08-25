import * as THREE from 'three';
import type {Lesson} from '../types';
import {makeGeometryLesson} from './geometryLesson';

/** 单个柏拉图立体（四面体/八面体/十二面体/二十面体）的差异描述 */
interface PolyhedronDef {
    id: string;
    title: string;
    /** THREE 几何构造器 */
    ctor: (radius: number, detail: number) => THREE.BufferGeometry;
    /** 描述文案（含面数、形状说明） */
    description: string;
}

/**
 * 五种柏拉图立体里被做成独立课时的四个（四面体/八面体/十二面体/二十面体）。
 * 它们构造签名完全一致——(radius, detail)，仅几何体类与文案不同，
 * 因此用一个数据表 + 工厂生成，避免四份逐字重复的代码。
 */
const polyhedronDefs: PolyhedronDef[] = [
    {
        id: 'geometry/polyhedron/tetrahedron-geometry',
        title: 'TetrahedronGeometry 四面体',
        ctor: (r, d) => new THREE.TetrahedronGeometry(r, d),
        description: `
  <h2>TetrahedronGeometry 四面体</h2>
  <p>正四面体：由 4 个正三角形面组成，是五种柏拉图立体中面数最少的一个，外形像金字塔，也是最简单的凸多面体。</p>
  <pre><code>new THREE.TetrahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 4 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>TetrahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个三角形细分，逐渐趋近球体。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`,
    },
    {
        id: 'geometry/polyhedron/octahedron-geometry',
        title: 'OctahedronGeometry 八面体',
        ctor: (r, d) => new THREE.OctahedronGeometry(r, d),
        description: `
  <h2>OctahedronGeometry 八面体</h2>
  <p>正八面体：由 8 个正三角形面组成，是五种柏拉图立体之一，外形像两枚金字塔底面相拼，也是钻石的经典切面造型。</p>
  <pre><code>new THREE.OctahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 8 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>OctahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个三角形细分，逐渐趋近球体。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`,
    },
    {
        id: 'geometry/polyhedron/icosahedron-geometry',
        title: 'IcosahedronGeometry 二十面体',
        ctor: (r, d) => new THREE.IcosahedronGeometry(r, d),
        description: `
  <h2>IcosahedronGeometry 二十面体</h2>
  <p>正二十面体：由 20 个正三角形面组成，是五种柏拉图立体之一，也是地球仪/足球（截角二十面体）的近似基础。</p>
  <pre><code>new THREE.IcosahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 20 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>IcosahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个三角形细分，逐渐趋近球体。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`,
    },
    {
        id: 'geometry/polyhedron/dodecahedron-geometry',
        title: 'DodecahedronGeometry 十二面体',
        ctor: (r, d) => new THREE.DodecahedronGeometry(r, d),
        description: `
  <h2>DodecahedronGeometry 十二面体</h2>
  <p>正十二面体：由 12 个正五边形面组成，是五种柏拉图立体之一，默认中心在原点。</p>
  <pre><code>new THREE.DodecahedronGeometry(
  radius,  // 外接球半径
  detail   // 细分级别（0 为原始 12 面，越大越平滑）
)</code></pre>
  <p>本例使用 <code>DodecahedronGeometry(1.5, 0)</code>。提高 <code>detail</code> 会把每个面细分，逐渐趋近球体。</p>
  <p>左上角提供 3 个选项卡：<b>几何体</b>（原始面片）、<b>边缘</b>（<code>EdgesGeometry</code> 提取硬边棱线）、<b>框线</b>（<code>WireframeGeometry</code> 画出全部三角棱）。</p>
`,
    },
];

/** 由数据表生成单个柏拉图立体的 Lesson */
function makePolyhedronLesson(def: PolyhedronDef): Lesson {
    return makeGeometryLesson({
        id: def.id,
        title: def.title,
        description: def.description,
        createGeometry: (p) => def.ctor(p.radius, p.detail),
        params: {radius: 1.5, detail: 0},
        controls: [
            {key: 'radius', label: 'radius', min: 0.2, max: 3, step: 0.1, value: 1.5, desc: '外接球半径', precision: 1},
            {
                key: 'detail',
                label: 'detail',
                min: 0,
                max: 4,
                step: 1,
                value: 0,
                desc: '细分级别（越大越平滑，趋近球体）',
                precision: 0
            },
        ],
        cameraPos: [0, 0, 5],
        viewTabs: true,
    });
}

const tetrahedronGeometry = makePolyhedronLesson(polyhedronDefs[0]);
const octahedronGeometry = makePolyhedronLesson(polyhedronDefs[1]);
const icosahedronGeometry = makePolyhedronLesson(polyhedronDefs[2]);
const dodecahedronGeometry = makePolyhedronLesson(polyhedronDefs[3]);

export {
    tetrahedronGeometry,
    octahedronGeometry,
    icosahedronGeometry,
    dodecahedronGeometry,
};
