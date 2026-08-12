import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';

export const meshStandardMaterial: Lesson = {
    id: 'material/mesh-standard-material',
    title: 'MeshStandardMaterial 标准材质',
    description: `
    <h2>MeshStandardMaterial</h2>
    <p>基于物理的渲染（PBR）材质，模拟真实世界的材质属性，是目前最常用的材质。两个核心参数：</p>
    <ul>
      <li><b>metalness（金属度）</b>：0 = 非金属（塑料、木头），1 = 纯金属（铁、金）</li>
      <li><b>roughness（粗糙度）</b>：0 = 镜面般光滑，1 = 完全粗糙（漫反射）</li>
    </ul>
    <pre><code>new THREE.MeshStandardMaterial({
  color: 0x60a5fa,
  metalness: 0.6,  // 0 ~ 1
  roughness: 0.2,  // 0 ~ 1
})</code></pre>
    <h3>为什么金属需要环境贴图？</h3>
    <p>纯金属几乎没有漫反射，光泽全部来自环境反射。本例用 <code>RoomEnvironment</code> + <code>PMREMGenerator</code> 生成了环境贴图（<code>scene.environment</code>），金属球才能反射出周围的房间。</p>
    <h3>本例说明</h3>
    <p>一排 5 个球体 <b>metalness 从 0 到 1 递增</b>（roughness 固定 0.25）。可以清楚看到：金属度越高，物体越像金属、反射越强。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        // 程序化环境贴图，为金属材质提供反射来源，产生光泽感
        const pmrem = new THREE.PMREMGenerator(ctx.renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        ctx.scene.environment = envTex;
        ctx.scene.environmentIntensity = 0.8;

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 1.5, 6);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const cols = 3;
        const rows = 3;
        const count = cols * rows;
        const spacing = 2.0;
        const meshes: THREE.Mesh[] = [];
        for (let i = 0; i < count; i++) {
            const metalness = i / (count - 1);
            const mesh = new THREE.Mesh(
                new THREE.SphereGeometry(0.8, 48, 24),
                new THREE.MeshStandardMaterial({
                    color: 0x60a5fa,
                    metalness,
                    roughness: 0.25,
                }),
            );
            const col = i % cols;
            const row = Math.floor(i / cols);
            mesh.position.set(
                (col - (cols - 1) / 2) * spacing,
                -(row - (rows - 1) / 2) * spacing,
                0,
            );
            meshes.push(mesh);
            ctx.scene.add(mesh);
        }

        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(3, 5, 4);
        ctx.scene.add(dirLight);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            meshes.forEach((m) => (m.rotation.y += 0.01));
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            envTex.dispose();
            pmrem.dispose();
        });
    },
};
