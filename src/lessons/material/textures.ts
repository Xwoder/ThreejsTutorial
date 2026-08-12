import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import { createContext, makeCleanup } from '../helper';

export const textures: Lesson = {
  id: 'material/textures',
  title: '纹理贴图',
  description: `
    <h2>Texture</h2>
    <p>纹理是把图片"贴"到几何体表面的技术，让物体拥有细节。用 <code>TextureLoader</code> 加载图片：</p>
    <pre><code>const texture = new THREE.TextureLoader().load('/texture.jpg');
texture.colorSpace = THREE.SRGBColorSpace; // 颜色贴图要声明色彩空间

const material = new THREE.MeshStandardMaterial({ map: texture });</code></pre>
    <h3>UV 坐标</h3>
    <p>几何体的每个顶点带有 UV 坐标（0~1），告诉 GPU 该点对应图片上的哪个位置。内置几何体自带 UV，自定义几何体需要手动提供。</p>
    <h3>本例说明</h3>
    <p>画布中用 <code>CanvasTexture</code> 程序化生成了一张棋盘格纹理（无需外部图片），分别贴在立方体、球体和平面上：</p>
    <pre><code>const canvas = document.createElement('canvas');
// ... 在 canvas 上绘制图案
const texture = new THREE.CanvasTexture(canvas);</code></pre>
    <p>实际项目中你也可以换成任何图片 URL。</p>
  `,
  create(container) {
    const ctx = createContext(container);
    ctx.scene.background = new THREE.Color(0x111827);

    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
    camera.position.set(0, 2.5, 6);
    camera.lookAt(0, 0.5, 0);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    // 程序化生成棋盘格纹理
    const cv = document.createElement('canvas');
    cv.width = cv.height = 256;
    const g = cv.getContext('2d')!;
    const cell = 32;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        g.fillStyle = (x + y) % 2 ? '#38bdf8' : '#0f172a';
        g.fillRect(x * cell, y * cell, cell, cell);
      }
    }
    const texture = new THREE.CanvasTexture(cv);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshStandardMaterial({ map: texture });
    const cube = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4), material);
    cube.position.set(-1.6, 1, 0);
    ctx.scene.add(cube);

    const sphere = new THREE.Mesh(new THREE.SphereGeometry(0.9, 48, 24), material);
    sphere.position.set(1.6, 1, 0);
    ctx.scene.add(sphere);

    const floorTex = texture.clone();
    floorTex.wrapS = floorTex.wrapT = THREE.RepeatWrapping;
    floorTex.repeat.set(4, 4);
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(10, 10),
      new THREE.MeshStandardMaterial({ map: floorTex }),
    );
    floor.rotation.x = -Math.PI / 2;
    ctx.scene.add(floor);

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(3, 6, 4);
    ctx.scene.add(dirLight);

    const controls = new OrbitControls(camera, ctx.renderer.domElement);
    controls.enableDamping = true;

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      cube.rotation.y += 0.008;
      sphere.rotation.y -= 0.008;
      controls.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      controls.dispose();
      texture.dispose();
      floorTex.dispose();
    });
  },
};
