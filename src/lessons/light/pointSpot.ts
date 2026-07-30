import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const pointSpot: Lesson = {
  id: 'point-spot',
  title: '点光源与聚光灯',
  description: `
    <h2>PointLight 点光源</h2>
    <p>点光源像一个<b>灯泡</b>：从一个点向四周发光，距离越远越暗：</p>
    <pre><code>const light = new THREE.PointLight(0xff9f43, 30, 20);
//                                        颜色   强度  衰减距离
light.position.set(0, 2, 0);</code></pre>
    <h2>SpotLight 聚光灯</h2>
    <p>聚光灯像<b>手电筒/舞台灯</b>：从一个点向某个方向发射锥形光束：</p>
    <pre><code>const spot = new THREE.SpotLight(0x7dd3fc, 80);
spot.position.set(0, 5, 0);
spot.angle = Math.PI / 8;   // 光锥半角
spot.penumbra = 0.3;        // 边缘柔化 0~1
spot.target = someObject;   // 照射目标</code></pre>
    <h3>观察要点</h3>
    <p>画布中：左侧橙色小球是<b>点光源</b>（绕场景旋转），右侧是向下的<b>聚光灯</b>。两者的 Helper 标示出光源位置与照射范围。注意聚光灯边缘的柔化效果（penumbra）。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x0b1120);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 3.5, 7);
    camera.lookAt(0, 0.5, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const material = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), material);
    floor.rotation.x = -Math.PI / 2;
    ctx.scene.add(floor);
    for (let i = 0; i < 4; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), material);
      box.position.set((i - 1.5) * 2, 0.4, (i % 2) * 2 - 1);
      ctx.scene.add(box);
    }

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.08));

    const point = new THREE.PointLight(0xff9f43, 30, 20);
    point.position.set(0, 2, 0);
    ctx.scene.add(point);
    ctx.scene.add(new THREE.PointLightHelper(point, 0.25));

    const spot = new THREE.SpotLight(0x7dd3fc, 120);
    spot.position.set(3, 5, 0);
    spot.angle = Math.PI / 8;
    spot.penumbra = 0.35;
    const target = new THREE.Object3D();
    target.position.set(3, 0, 0);
    ctx.scene.add(target);
    spot.target = target;
    ctx.scene.add(spot);
    ctx.scene.add(new THREE.SpotLightHelper(spot));

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    let raf = 0;
    const clock = new THREE.Clock();
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const t = clock.getElapsedTime();
      point.position.set(Math.cos(t) * 3, 1.8, Math.sin(t) * 3);
      controls.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
    });
  },
};
