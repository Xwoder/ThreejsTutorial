import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';

export const meshPhongMaterial: Lesson = {
    id: 'mesh-phong-material',
    title: 'MeshPhongMaterial 高光材质',
    description: `
    <h2>MeshPhongMaterial</h2>
    <p>经典的光照模型材质，在漫反射的基础上增加了<b>镜面高光</b>，用 <code>shininess</code> 控制高光的大小与强度：</p>
    <ul>
      <li><b>shininess 小</b>（如 10）：高光面积大、强度弱，像塑料</li>
      <li><b>shininess 大</b>（如 100）：高光面积小、强度强，像金属或陶瓷</li>
    </ul>
    <pre><code>new THREE.MeshPhongMaterial({
  color: 0x60a5fa,
  shininess: 80,   // 0 ~ 1000
  specular: 0xffffff, // 高光颜色
})</code></pre>
    <p>真实感不如 PBR 的 MeshStandardMaterial，但计算量小，适合移动端或简单效果。</p>
    <h3>本例说明</h3>
    <p>两个球体颜色相同：左侧 <code>shininess: 10</code>，右侧 <code>shininess: 100</code>。旋转球体观察高光区域的大小差异。</p>
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

        const low = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 48, 24),
            new THREE.MeshPhongMaterial({color: 0x60a5fa, shininess: 10, specular: 0xffffff}),
        );
        low.position.set(-1.5, 0, 0);
        ctx.scene.add(low);

        const high = new THREE.Mesh(
            new THREE.SphereGeometry(1.1, 48, 24),
            new THREE.MeshPhongMaterial({color: 0x60a5fa, shininess: 100, specular: 0xffffff}),
        );
        high.position.set(1.5, 0, 0);
        ctx.scene.add(high);

        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
        dirLight.position.set(3, 5, 4);
        ctx.scene.add(dirLight);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            low.rotation.y += 0.01;
            high.rotation.y -= 0.01;
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
