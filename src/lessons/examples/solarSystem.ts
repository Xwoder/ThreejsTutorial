import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;

/** 在 canvas 上随机散布斑块，用于给球体增加可见纹理 */
function makeBlobTexture(base: string, blob: string, count: number, size = 512): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size / 2;
    const c = canvas.getContext('2d')!;
    c.fillStyle = base;
    c.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < count; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const r = 8 + Math.random() * 28;
        c.beginPath();
        c.arc(x, y, r, 0, Math.PI * 2);
        c.fillStyle = blob;
        c.globalAlpha = 0.5 + Math.random() * 0.5;
        c.fill();
    }
    c.globalAlpha = 1;
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

export const solarSystem: Lesson = {
    id: 'examples/example-sun-earth-moon',
    title: '太阳地球与月亮',
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

        /* 场景的背景 */
        setSceneBackground(ctx, 0x05070f);
        /* 场景的环境光 */
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.15));

        /* 透视相机*/
        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000); // 透视相机
        camera.position.set(0, 18, 30);

        /* 太阳光，点光源 */
        const sunLight = new THREE.PointLight(0xffffff, 14, 0, 0.5);
        ctx.scene.add(sunLight); // 放在太阳（原点）处，照亮地球与月亮

        /* 轨道控制器 */
        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        /* 太阳天体 */
        const sun = new THREE.Mesh(
            new THREE.SphereGeometry(3, 48, 48),
            new THREE.MeshBasicMaterial({map: makeBlobTexture('#ff8c1a', '#ffb347', 90)}),
        );
        ctx.scene.add(sun);

        /* 地球天体 */
        const earth = new THREE.Mesh(
            new THREE.SphereGeometry(1.2, 48, 48),
            new THREE.MeshStandardMaterial({
                map: makeBlobTexture('#1e63c4', '#3fae5a', 50),
                roughness: 0.9,
                metalness: 0,
            }),
        );
        earth.position.set(18, 0, 0);

        /* 月亮天体 */
        const moon = new THREE.Mesh(
            new THREE.SphereGeometry(0.4, 32, 32),
            new THREE.MeshStandardMaterial({
                map: makeBlobTexture('#bdbdbd', '#8a8a8a', 40),
                roughness: 1,
                metalness: 0,
            }),
        );
        moon.position.set(3, 0, 0);

         /* 地球公转组：绕太阳旋转 */
        const earthOrbit = new THREE.Group();
        ctx.scene.add(earthOrbit);
        earthOrbit.add(earth);

        /* 月亮公转组：作为地球的子节点，随地球一起移动 */
        const moonOrbit = new THREE.Group();
        earth.add(moonOrbit);
        moonOrbit.add(moon);

        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        let last = performance.now();
        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, 0.1); // 限制单帧最大步长
            last = now;

            sun.rotation.y += dt * 0.3; /* 太阳自转 */
            earth.rotation.y += dt; /* 地球自转 */
            earthOrbit.rotation.y += dt * 0.5; /* 地球绕太阳公转 */
            moonOrbit.rotation.y += dt * 2.0; /* 月亮绕地球公转 */

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
