import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const solarSystem: Lesson = {
  id: 'example-solar-system',
  title: '太阳系',
  description: `
    <h2>太阳系</h2>
    <p>用三个球体构建一个迷你太阳系：太阳居中，地球绕太阳公转，月亮绕地球公转。每个天体都用球体表示，公转通过父级 <code>Group</code> 的旋转实现。</p>
    <h3>结构说明</h3>
    <ul>
      <li><b>太阳</b>：位于原点，自发自转。</li>
      <li><b>地球</b>：挂在「地球公转组」下，组绕 Y 轴旋转即地球公转；地球自身自转。</li>
      <li><b>月亮</b>：作为地球的子节点，再挂到「月亮公转组」下，组绕 Y 轴旋转即月亮绕地球公转。</li>
    </ul>
    <p>可以用鼠标拖动环绕观察，滚轮缩放。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x05070f);

    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    camera.position.set(0, 18, 30);

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const sunLight = new THREE.PointLight(0xffffff, 3, 0, 0.5);
    ctx.scene.add(sunLight); // 放在太阳（原点）处，照亮地球与月亮

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    // ---- 天体 ----
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(3, 48, 48),
      new THREE.MeshBasicMaterial({ color: 0xff5522 }),
    );
    ctx.scene.add(sun);

    // 地球公转组：绕太阳旋转
    const earthOrbit = new THREE.Group();
    ctx.scene.add(earthOrbit);

    const earth = new THREE.Mesh(
      new THREE.SphereGeometry(1.2, 48, 48),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.9, metalness: 0 }),
    );
    earth.position.set(12, 0, 0);
    earthOrbit.add(earth);

    // 月亮公转组：作为地球的子节点，随地球一起移动
    const moonOrbit = new THREE.Group();
    earth.add(moonOrbit);

    const moon = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 32, 32),
      new THREE.MeshStandardMaterial({ color: 0xcfcfcf, roughness: 1, metalness: 0 }),
    );
    moon.position.set(3, 0, 0);
    moonOrbit.add(moon);

    // 公转轨道线（仅作示意）
    const orbitRing = new THREE.Mesh(
      new THREE.RingGeometry(11.98, 12.02, 128),
      new THREE.MeshBasicMaterial({ color: 0x334155, side: THREE.DoubleSide }),
    );
    orbitRing.rotation.x = Math.PI / 2;
    ctx.scene.add(orbitRing);

    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    const clock = new THREE.Clock();
    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      const dt = clock.getDelta();

      sun.rotation.y += dt * 0.3;
      earthOrbit.rotation.y += dt * 0.5;   // 地球绕太阳公转
      earth.rotation.y += dt;         // 地球自转
      moonOrbit.rotation.y += dt * 2.0;     // 月亮绕地球公转

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
