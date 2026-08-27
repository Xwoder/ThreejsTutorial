import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup, setSceneBackground, BG_DARK} from '../helper';

import {createParamPanel, type ParamSlider} from '../../utils/paramPanel.ts';
import type { Lesson } from '../types';

export interface GeometryLessonOptions {
  id: string;
  title: string;
  description: string;
  createGeometry: (params: Record<string, number>) => THREE.BufferGeometry;
  params?: Record<string, number>;
  controls?: ParamSlider[];
  cameraPos?: [number, number, number];
  /** 相机注视目标（OrbitControls target），默认原点。几何体中心不在原点时用它让物体居中 */
  target?: [number, number, number];
  /** 旋转速度倍率 */
  spin?: number;
  /** 渲染面：默认 THREE.FrontSide，平面类几何体可设为 THREE.DoubleSide 让两面都可见 */
  side?: THREE.Side;
  /** 是否在右上角提供「几何体 / 边缘 / 框线」选项卡（EdgesGeometry / WireframeGeometry 演示） */
  viewTabs?: boolean;
}

type ViewMode = 'geometry' | 'edges' | 'wireframe';

/** 用 MeshNormalMaterial 单独展示一种几何体，可环绕查看 */
export function makeGeometryLesson(opts: GeometryLessonOptions): Lesson {
  const {
    id,
    title,
    description,
    createGeometry,
    params: initialParams = {},
    controls = [],
    cameraPos = [0, 1.5, 5],
    target = [0, 0, 0],
    spin = 1,
    side = THREE.FrontSide,
    viewTabs = false,
  } = opts;

  return {
    id,
    title,
    description,
    create(container) {
      const ctx = createContext(container);
      setSceneBackground(ctx, BG_DARK);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(...cameraPos);
      ctx.onResize((w, h) => {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });

      let params = { ...initialParams };

      const solidMat = new THREE.MeshNormalMaterial({side});
      const surfaceMat = new THREE.MeshNormalMaterial({side, transparent: true, opacity: 0.25});
      const edgeMat = new THREE.LineBasicMaterial({color: 0xffffff});
      const wireMat = new THREE.LineBasicMaterial({color: 0x33e0ff});

      const group = new THREE.Group();
      group.rotation.x += 0.004 * spin;
      group.rotation.y += 0.006 * spin;
      ctx.scene.add(group);

      const orbit = new OrbitControls(camera, ctx.renderer.domElement);
      orbit.enableDamping = true;
      orbit.target.set(...target);
      camera.lookAt(...target);

      let mode: ViewMode = 'geometry';
      const buildGeometry = () => createGeometry(params);

      const rebuild = () => {
        group.traverse((o) => {
          const obj = o as THREE.Mesh;
          if (obj.geometry) obj.geometry.dispose();
        });
        group.clear();

        if (mode === 'geometry') {
          group.add(new THREE.Mesh(buildGeometry(), solidMat));
          return;
        }
        const surface = new THREE.Mesh(buildGeometry(), surfaceMat);
        const source = surface.geometry;
        const lines =
            mode === 'edges'
                ? new THREE.LineSegments(new THREE.EdgesGeometry(source), edgeMat)
                : new THREE.LineSegments(new THREE.WireframeGeometry(source), wireMat);
        group.add(surface, lines);
      };
      rebuild();

      // 右上角选项卡：几何体 / 边缘 / 框线
      let tabs: HTMLDivElement | null = null;
      if (viewTabs) {
        tabs = document.createElement('div');
        tabs.className = 'view-tabs';
        const tabDefs: { mode: ViewMode; label: string }[] = [
          {mode: 'geometry', label: '几何体'},
          {mode: 'edges', label: '边缘'},
          {mode: 'wireframe', label: '框线'},
        ];
        const tabBtns: HTMLButtonElement[] = [];
        tabDefs.forEach((def) => {
          const btn = document.createElement('button');
          btn.type = 'button';
          btn.textContent = def.label;
          btn.addEventListener('click', () => {
            mode = def.mode;
            tabBtns.forEach((b) => b.classList.toggle('active', b === btn));
            rebuild();
          });
          tabs!.appendChild(btn);
          tabBtns.push(btn);
        });
        tabBtns[0].classList.add('active');
        container.appendChild(tabs);
      }

      let panel: ReturnType<typeof createParamPanel> | null = null;
      if (controls.length) {
        panel = createParamPanel({
          container,
          controls,
          defaults: initialParams,
          onChange: (key, value) => {
            params = { ...params, [key]: value };
            rebuild();
          },
        });
      }

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        group.rotation.x += 0.004 * spin;
        group.rotation.y += 0.006 * spin;
        orbit.update();
        ctx.renderer.render(ctx.scene, camera);
      };
      loop();

      return makeCleanup(ctx, () => {
        cancelAnimationFrame(raf);
        orbit.dispose();
        solidMat.dispose();
        surfaceMat.dispose();
        edgeMat.dispose();
        wireMat.dispose();
        tabs?.remove();
        panel?.remove();
      });
    },
  };
}
