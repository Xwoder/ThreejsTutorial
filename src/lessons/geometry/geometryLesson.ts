import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { createContext, makeCleanup } from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';
import type {ParamSlider} from '../../utils/paramPanel.ts';
import type { Lesson } from '../types';

export interface GeometryLessonOptions {
  id: string;
  title: string;
  description: string;
  createGeometry: (params: Record<string, number>) => THREE.BufferGeometry;
  params?: Record<string, number>;
  controls?: ParamSlider[];
  cameraPos?: [number, number, number];
  /** 旋转速度倍率 */
  spin?: number;
  /** 渲染面：默认 THREE.FrontSide，平面类几何体可设为 THREE.DoubleSide 让两面都可见 */
  side?: THREE.Side;
}

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
    spin = 1,
    side = THREE.FrontSide,
  } = opts;

  return {
    id,
    title,
    description,
    create(container) {
      const ctx = createContext(container);
      ctx.scene.background = new THREE.Color(0x111827);

      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.set(...cameraPos);
      ctx.onResize((w, h) => {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      });

      const material = new THREE.MeshNormalMaterial({ side });
      let params = { ...initialParams };
      let geometry = createGeometry(params);
      const mesh = new THREE.Mesh(geometry, material);
      ctx.scene.add(mesh);

      const orbit = new OrbitControls(camera, ctx.renderer.domElement);
      orbit.enableDamping = true;

      let panel: ReturnType<typeof createParamPanel> | null = null;
      if (controls.length) {
        panel = createParamPanel({
          container,
          controls,
          defaults: initialParams,
          onChange: (key, value) => {
            params = { ...params, [key]: value };
            const next = createGeometry(params);
            mesh.geometry = next;
            geometry.dispose();
            geometry = next;
          },
        });
      }

      let raf = 0;
      const loop = () => {
        raf = requestAnimationFrame(loop);
        mesh.rotation.x += 0.004 * spin;
        mesh.rotation.y += 0.006 * spin;
        orbit.update();
        ctx.renderer.render(ctx.scene, camera);
      };
      loop();

      return makeCleanup(ctx, () => {
        cancelAnimationFrame(raf);
        orbit.dispose();
        geometry.dispose();
        material.dispose();
        panel?.remove();
      });
    },
  };
}
