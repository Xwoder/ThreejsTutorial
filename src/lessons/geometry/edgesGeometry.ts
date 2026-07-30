import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createContext, makeCleanup } from '../helper';
import { createParamPanel } from '../paramPanel';
import type { ParamSlider } from '../paramPanel';
import type { Lesson } from '../types';

/** 源几何体类型 */
type ShapeType = 'box' | 'sphere' | 'cylinder' | 'torusKnot';

const shapeMeta: Record<ShapeType, {
  label: string;
  /** EdgesGeometry 构造签名（用于说明栏展示） */
  signature: string;
  /** 该源几何体的构建参数说明 */
  note: string;
}> = {
  box: {
    label: 'BoxGeometry',
    signature: 'new THREE.BoxGeometry(width, height, depth)',
    note: '立方体六个面都是平面，相邻面几乎总是垂直，所以 EdgesGeometry 会保留全部 12 条棱——无论阈值多大。',
  },
  sphere: {
    label: 'SphereGeometry',
    signature: 'new THREE.SphereGeometry(radius, widthSeg, heightSeg)',
    note: '球面由大量三角面逼近，相邻面夹角很小，所以默认阈值下几乎不画线；调大阈值（如 30°）才会只留下轮廓大圆。',
  },
  cylinder: {
    label: 'CylinderGeometry',
    signature: 'new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radialSeg)',
    note: '侧面与上下底面之间夹角很大（硬边），必然被保留；而侧面细分三角面之间夹角很小，需调大阈值才会消失。',
  },
  torusKnot: {
    label: 'TorusKnotGeometry',
    signature: 'new THREE.TorusKnotGeometry(radius, tube, tubularSeg, radialSeg)',
    note: '环面纽结曲面平滑，三角面夹角普遍很小，默认阈值下几乎无棱；调大阈值才会抽出几条随曲面转折的硬线。',
  },
};

function buildSource(type: ShapeType): THREE.BufferGeometry {
  const seg = 24;
  const size = 1.4;
  switch (type) {
    case 'box':
      return new THREE.BoxGeometry(size * 1.4, size * 1.4, size * 1.4);
    case 'sphere':
      return new THREE.SphereGeometry(size, seg, seg);
    case 'cylinder':
      return new THREE.CylinderGeometry(size, size, size * 2, seg);
    case 'torusKnot':
      return new THREE.TorusKnotGeometry(size * 0.7, size * 0.25, seg * 2, seg / 2);
  }
}

/** 构建单个「EdgesGeometry 作用于某源几何体」的演示，返回清理函数 */
function createEdgesDemo(container: HTMLElement, type: ShapeType): () => void {
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
    thresholdAngle: 1,
    showSurface: 1,
  };

  const sourceMat = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.2 });
  const edgeMat = new THREE.LineBasicMaterial({ color: 0xffffff });

  const group = new THREE.Group();
  ctx.scene.add(group);

  const rebuild = () => {
    const nextSource = buildSource(type);
    const nextEdges = new THREE.EdgesGeometry(nextSource, params.thresholdAngle);
    group.traverse((o) => {
      const mesh = o as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
    });
    group.clear();
    const surface = new THREE.Mesh(nextSource, sourceMat);
    const lines = new THREE.LineSegments(nextEdges, edgeMat);
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
    controls: [
      { key: 'thresholdAngle', label: 'thresholdAngle', min: 1, max: 90, step: 1, value: 1, desc: '夹角阈值（°），越大只留硬边', precision: 0 },
    ] as ParamSlider[],
    defaults: params,
    onChange: (key, value) => {
      (params as Record<string, number>)[key] = value;
      rebuild();
    },
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
    edgeMat.dispose();
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
    id: `edges-geometry-${type}`,
    title: meta.label,
    description: `
      <h2>EdgesGeometry × ${meta.label}</h2>
      <p>下面把 <code>EdgesGeometry</code> 作用在 <code>${meta.label}</code> 上：淡色半透明面为本来的表面，白色线为提取出的棱边。</p>
      <pre><code>${meta.signature}</code></pre>
      <pre><code>new THREE.EdgesGeometry(source, thresholdAngle)</code></pre>
      <p>${meta.note}</p>
      <p>拖动 <code>thresholdAngle</code> 观察棱边变化：调大只保留硬边，调小则会把三角面之间的所有棱都画出来；可用开关单独隐藏半透明表面，只看线框。</p>
    `,
    create: (container) => createEdgesDemo(container, type),
  };
}

const overviewDescription = `
  <h2>EdgesGeometry 边缘线</h2>
  <p>它不是一个“从零生成”的几何体，而是<strong>分析另一个几何体</strong>、只保留相邻面夹角大于 <code>thresholdAngle</code> 的棱边，生成一份适合用 <code>LineSegments</code> 绘制的数据。常用来给模型描边、显示结构线。</p>
  <pre><code>new THREE.EdgesGeometry(
  geometry,       // 源几何体
  thresholdAngle  // 夹角阈值（度），默认 1
)</code></pre>
  <p>下面分 4 个子章节，分别演示 <code>EdgesGeometry</code> 作用于 Box / Sphere / Cylinder / TorusKnot 四种源几何体时的效果差异。源曲面越平滑，默认阈值下抽出的棱越少；调大 <code>thresholdAngle</code> 只留硬边，调小则画出全部三角棱。</p>
`;

export const edgesGeometry: Lesson = {
  id: 'edges-geometry',
  title: 'EdgesGeometry 边缘线',
  description: overviewDescription,
  children: [
    makeShapeLesson('box'),
    makeShapeLesson('sphere'),
    makeShapeLesson('cylinder'),
    makeShapeLesson('torusKnot'),
  ],
};
