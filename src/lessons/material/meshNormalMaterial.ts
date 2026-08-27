import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;

export const meshNormalMaterial: Lesson = {
    id: 'material/mesh-normal-material',
    title: 'MeshNormalMaterial 法线材质',
    description: `
    <h2>MeshNormalMaterial</h2>
    <p>把每个顶点的<b>法线方向</b>映射为颜色：法线坐标 (x, y, z) 对应颜色 (r, g, b)。</p>
    <ul>
      <li>法线指向 +X（右）→ 红色</li>
      <li>法线指向 +Y（上）→ 绿色</li>
      <li>法线指向 +Z（前）→ 蓝色</li>
    </ul>
    <p>它<b>不需要任何灯光</b>，渲染速度快，常用于调试几何体，检查法线朝向是否正确。</p>
    <pre><code>const material = new THREE.MeshNormalMaterial();
// 可选：开启平面着色（flat shading）
new THREE.MeshNormalMaterial({ flatShading: true });</code></pre>
    <h3>本例说明</h3>
    <p>左侧球体的法线方向连续变化，颜色平滑过渡；右侧立方体每个面法线固定，所以六个面颜色各不相同——顶面发绿（+Y）、前面发蓝（+Z）、右面发红（+X）。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, 0x111827);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 1.5, 6);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const sphere = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 48, 24),
            new THREE.MeshNormalMaterial(),
        );
        sphere.position.set(-1.6, 0, 0);
        ctx.scene.add(sphere);

        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(1.6, 1.6, 1.6),
            new THREE.MeshNormalMaterial(),
        );
        cube.position.set(1.6, 0, 0);
        ctx.scene.add(cube);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            sphere.rotation.y += 0.01;
            cube.rotation.y -= 0.01;
            cube.rotation.x += 0.006;
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
