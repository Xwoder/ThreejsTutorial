import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createContext, makeCleanup } from '../helper';
import { createParamPanel } from '../paramPanel';
import type { ParamSlider } from '../paramPanel';
import type { Lesson } from '../types';

const wireframeDescription = `
  <h2>WireframeGeometry 线框</h2>
  <p>同样不是“从零生成”的几何体，而是<strong>包裹另一个几何体</strong>，把它的<strong>所有三角面边</strong>都抽成一份用 <code>LineSegments</code> 绘制的数据。与 <code>EdgesGeometry</code> 的区别：它不区分硬边/软边，会把网格的每一根三角棱都画出来，因此能看到完整的细分结构。</p>
  <pre><code>new THREE.WireframeGeometry(geometry)</code></pre>
  <p>本例并排展示 Box / Sphere / Cylinder / TorusKnot：淡色半透明面为本来的表面，青色线为完整线框。可用开关单独显示某个几何体。</p>
`;

type ShapeType = 'box' | 'sphere' | 'cylinder' | 'torusKnot';

interface ShapeItem {
  type: ShapeType;
  group: THREE.Group;
  surface: THREE.Mesh;
  lines: THREE.LineSegments;
}

function buildSource(type: ShapeType, size: number): THREE.BufferGeometry {
  const seg = 24;
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

export const wireframeGeometry: Lesson = {
  id: 'wireframe-geometry',
  title: 'WireframeGeometry 线框',
  description: wireframeDescription,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 1.5, 8);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const orbit = new OrbitControls(camera, ctx.renderer.domElement);
    orbit.enableDamping = true;

    const params = {
      size: 1.2,
      showBox: 1,
      showSphere: 1,
      showCylinder: 1,
      showTorusKnot: 1,
    };

    /** 构建几何体显示开关复选框组（footer） */
    const buildShapeToggle = (): HTMLElement => {
      const wrap = document.createElement('div');
      const label = document.createElement('div');
      label.className = 'shape-toggle-label';
      label.textContent = '显示哪些几何体';
      wrap.appendChild(label);
      types.forEach((type) => {
        const row = document.createElement('label');
        row.className = 'camera-control-checkbox';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = (params as Record<string, number>)[`show${cap(type)}`] >= 0.5;
        cb.addEventListener('change', () => {
          const key = `show${cap(type)}`;
          (params as Record<string, number>)[key] = cb.checked ? 1 : 0;
          rebuild();
        });
        const text = document.createElement('span');
        text.textContent = cap(type);
        row.append(cb, text);
        wrap.appendChild(row);
      });
      return wrap;
    };

    const sourceMat = new THREE.MeshNormalMaterial({ transparent: true, opacity: 0.2 });
    const wireMat = new THREE.LineBasicMaterial({ color: 0x33e0ff });

    const types: ShapeType[] = ['box', 'sphere', 'cylinder', 'torusKnot'];
    const items: ShapeItem[] = types.map((type) => {
      const source = buildSource(type, params.size);
      const wire = new THREE.WireframeGeometry(source);
      const surface = new THREE.Mesh(source, sourceMat);
      const lines = new THREE.LineSegments(wire, wireMat);
      const group = new THREE.Group();
      group.add(surface, lines);
      ctx.scene.add(group);
      return { type, group, surface, lines };
    });

    const rebuild = () => {
      const visibleTypes = types.filter((t) => (params as Record<string, number>)[`show${cap(t)}`] >= 0.5);
      const spacing = 3.2;
      const n = visibleTypes.length || 1;
      let i = 0;
      items.forEach((item) => {
        const visible = (params as Record<string, number>)[`show${cap(item.type)}`] >= 0.5;
        item.group.visible = visible;
        if (!visible) return;
        const nextSource = buildSource(item.type, params.size);
        const nextWire = new THREE.WireframeGeometry(nextSource);
        item.surface.geometry.dispose();
        item.lines.geometry.dispose();
        item.surface.geometry = nextSource;
        item.lines.geometry = nextWire;
        item.group.position.x = (i - (n - 1) / 2) * spacing;
        i++;
      });
    };
    rebuild();

    const panel = createParamPanel({
      container,
      controls: [
        { key: 'size', label: 'size', min: 0.5, max: 2, step: 0.1, value: 1.2, desc: '几何体整体尺寸', precision: 1 },
      ] as ParamSlider[],
      defaults: params,
      onChange: (key, value) => {
        (params as Record<string, number>)[key] = value;
        rebuild();
      },
      footer: buildShapeToggle(),
    });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      items.forEach((item) => {
        item.group.rotation.y += 0.006;
      });
      orbit.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      orbit.dispose();
      sourceMat.dispose();
      wireMat.dispose();
      items.forEach((item) => {
        item.surface.geometry.dispose();
        item.lines.geometry.dispose();
      });
      panel.remove();
    });
  },
};

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
