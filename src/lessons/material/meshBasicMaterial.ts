import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';

export const meshBasicMaterial: Lesson = {
    id: 'mesh-basic-material',
    title: 'MeshBasicMaterial 基础材质',
    description: `
    <h2>MeshBasicMaterial</h2>
    <p>最简单的材质：<b>不受任何光照影响</b>，直接把颜色画在表面。即使场景里摆满灯光，它的明暗也不会变化。</p>
    <pre><code>const material = new THREE.MeshBasicMaterial({
  color: 0x60a5fa,
});</code></pre>
    <h3>线框模式</h3>
    <p>设置 <code>wireframe: true</code> 只显示三角面网格线，常用于调试几何体结构：</p>
    <pre><code>new THREE.MeshBasicMaterial({ color: 0x60a5fa, wireframe: true });</code></pre>
    <h3>适用场景</h3>
    <ul>
      <li>纯色 UI 元素、粒子、2D 效果</li>
      <li>线框调试、查看几何体拓扑</li>
      <li>不需要真实感的简单物体</li>
    </ul>
    <h3>本例说明</h3>
    <p>画布中两个球体都使用 MeshBasicMaterial，场景里明明有灯光，但颜色完全不受影响。右侧的线框球体展示了三角网格结构。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 1.5, 6);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const solid = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 48, 24),
            new THREE.MeshBasicMaterial({color: 0x60a5fa}),
        );
        solid.position.set(-1.5, 0, 0);
        ctx.scene.add(solid);

        const wire = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 24, 12),
            new THREE.MeshBasicMaterial({color: 0x60a5fa, wireframe: true}),
        );
        wire.position.set(1.5, 0, 0);
        ctx.scene.add(wire);

        // 场景里有灯光，但 Basic 材质完全不受影响
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
        const dirLight = new THREE.DirectionalLight(0xffffff, 2);
        dirLight.position.set(3, 5, 4);
        ctx.scene.add(dirLight);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            solid.rotation.y += 0.008;
            wire.rotation.y -= 0.008;
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
