import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createContext, makeCleanup } from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type { Lesson } from '../types';

/** 源几何体类型 */
type ShapeType = 'sphere' | 'cylinder' | 'torusKnot';

const shapeMeta: Record<ShapeType, {
  label: string;
  /** WireframeGeometry 构造签名（用于说明栏展示） */
  signature: string;
  /** 该源几何体的构建参数说明 */
  note: string;
}> = {
  sphere: {
    label: 'SphereGeometry',
    signature: 'new THREE.SphereGeometry(radius, widthSeg, heightSeg)',
    note: '球面由大量三角面逼近，WireframeGeometry 画出每一根三角棱，呈现均匀的经纬网格状线框，能看到完整的细分结构。',
  },
  cylinder: {
    label: 'CylinderGeometry',
    signature: 'new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSeg)',
    note: '侧面被竖切成若干三角条，WireframeGeometry 画出全部竖向棱与上下底面的三角分割线，呈现完整的筒状网格。',
  },
  torusKnot: {
    label: 'TorusKnotGeometry',
    signature: 'new THREE.TorusKnotGeometry(radius, tube, tubularSeg, radialSeg)',
    note: '环面纽结曲面细分很密，WireframeGeometry 画出所有三角棱，呈现致密的网格线框，完整展示曲面走向。',
  },
};

function buildSource(type: ShapeType): THREE.BufferGeometry {
  const seg = 24;
  const size = 1.4;
  switch (type) {
    case 'sphere':
      return new THREE.SphereGeometry(size, seg, seg);
    case 'cylinder':
      return new THREE.CylinderGeometry(size, size, size * 2, seg);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(size * 0.7, size * 0.25, seg * 2, seg / 2);
  }
}

/** 构建单个「WireframeGeometry 作用于某源几何体」的演示，返回清理函数 */
function createWireframeDemo(container: HTMLElement, type: ShapeType): () => void {
  const ctx = createContext(container);
  ctx.scene.background = new THREE.Color(0x111827);

  const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
  camera.position.set(0, 1.5, 6);
  ctx.onResize((w, h) => {
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  });

  const orbit = new OrbitControls(camera, ctx.renderer.domElement);
  orbit.enableDamping = true;

  const params = {
    showSurface: 1,
  };

  const sourceMat = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.2 });
  const wireMat = new THREE.LineBasicMaterial({ color: 0x33e0ff });

  const group = new THREE.Group();
  ctx.scene.add(group);

  const rebuild = () => {
    const nextSource = buildSource(type);
    const nextWire = new THREE.WireframeGeometry(nextSource);
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    group.clear();
    const surface = new THREE.Mesh(nextSource, sourceMat);
    const lines = new THREE.LineSegments(nextWire, wireMat);
    surface.visible = params.showSurface >= 0.5;
    group.add(surface, lines);
  };
  rebuild();

  /** 显示选项（footer）：控制是否叠加半透明表面 */
  const buildSurfaceToggle = (): HTMLElement => {
    const wrap = document.createElement('div');
    const label = document.createElement('div');
    label.className = 'shape-toggle-label';
    label.textContent = '显示选项';
    wrap.appendChild(label);

    const row = document.createElement('label');
    row.className = 'camera-control-checkbox';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = params.showSurface >= 0.5;
    cb.addEventListener('change', () => {
      params.showSurface = cb.checked ? 1 : 0;
      rebuild();
    });
    const text = document.createElement('span');
    text.textContent = '显示半透明表面';
    row.append(cb, text);
    wrap.appendChild(row);
    return wrap;
  };

  const panel = createParamPanel({
    container,
    controls: [],
    defaults: params,
    footer: buildSurfaceToggle(),
  });

  let raf = 0;
  const loop = () => {
    raf = requestAnimationFrame(loop);
    group.rotation.y += 0.006;
    orbit.update();
    ctx.renderer.render(ctx.scene, camera);
  };
  loop();

  return makeCleanup(ctx, () => {
    cancelAnimationFrame(raf);
    orbit.dispose();
    sourceMat.dispose();
    wireMat.dispose();
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    panel.remove();
  });
}

/** 生成单个源几何体的子章节课时 */
function makeShapeLesson(type: ShapeType): Lesson {
  const meta = shapeMeta[type];
  return {
    id: `geometry/wireframe-geometry/wireframe-geometry-${type}`,
    title: meta.label,
    description: `
      <h2>WireframeGeometry × ${meta.label}</h2>
      <p>下面把 <code>WireframeGeometry</code> 作用在 <code>${meta.label}</code> 上：淡色半透明面为本来的表面，青色线为完整线框（每个三角面的全部棱）。</p>
      <pre><code>${meta.signature}</code></pre>
      <pre><code>new THREE.WireframeGeometry(source)</code></pre>
      <p>${meta.note}</p>
      <p>与 <code>EdgesGeometry</code> 不同，<code>WireframeGeometry</code> 不区分硬边/软边，会把网格的每一根三角棱都画出来，因此能看到完整的细分结构。可用开关单独隐藏半透明表面，只看线框。</p>
    `,
    create: (container) => createWireframeDemo(container, type),
  };
}

const overviewDescription = `
  <h2>WireframeGeometry 线框</h2>
  <p>同样不是“从零生成”的几何体，而是<strong>包裹另一个几何体</strong>，把它的<strong>所有三角面边</strong>都抽成一份用 <code>LineSegments</code> 绘制的数据。与 <code>EdgesGeometry</code> 的区别：它不区分硬边/软边，会把网格的每一根三角棱都画出来，因此能看到完整的细分结构。</p>
  <pre><code>new THREE.WireframeGeometry(geometry)</code></pre>
  <p>下面分 3 个子章节，分别演示 <code>WireframeGeometry</code> 作用于 Sphere / Cylinder / TorusKnot 三种源几何体时的效果差异（立方体的框线效果已在 <a href="#/geometry/box-geometry">BoxGeometry 立方体</a> 的「框线」选项卡中演示）。它不像 <code>EdgesGeometry</code> 那样有阈值参数，所以无论源曲面是否平滑，全部三角棱都会被画出。</p>
`;

export const wireframeGeometry: Lesson = {
  id: 'geometry/wireframe-geometry',
  title: 'WireframeGeometry 线框',
  description: overviewDescription,
  children: [
    makeShapeLesson('sphere'),
    makeShapeLesson('cylinder'),
    makeShapeLesson('torusKnot'),
  ],
};
