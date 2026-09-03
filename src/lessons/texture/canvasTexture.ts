import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK} from '../helper';

/** 用 Canvas2D 绘制一个数字「1」，返回可贴到网格上的 CanvasTexture */
function makeNumberTexture(): THREE.CanvasTexture {
    const size = 256;
    const cv = document.createElement('canvas');
    cv.width = cv.height = size;
    const g = cv.getContext('2d')!;

    // 背景
    g.fillStyle = '#0ea5e9';
    g.fillRect(0, 0, size, size);

    // 数字「1」
    g.fillStyle = '#ffffff';
    g.font = 'bold 180px system-ui, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('1', size / 2, size / 2 + 10);

    const texture = new THREE.CanvasTexture(cv);
    texture.colorSpace = THREE.SRGBColorSpace; // 颜色贴图需声明色彩空间
    texture.anisotropy = 8;
    return texture;
}

export const canvasTexture: Lesson = {
    id: 'texture/canvasTexture',
    title: 'CanvasTexture 数字',
    description: `
    <h2>CanvasTexture</h2>
    <p><code>CanvasTexture</code> 允许把一个普通的 2D <code>&lt;canvas&gt;</code> 当作纹理贴到几何体上，无需任何外部图片文件。本例在运行时用 Canvas2D 绘制数字「1」，贴到立方体的正面：</p>
    <pre><code>const cv = document.createElement('canvas');
cv.width = cv.height = 256;
const g = cv.getContext('2d')!;
g.fillStyle = '#0ea5e9';
g.fillRect(0, 0, 256, 256);
g.fillStyle = '#fff';
g.font = 'bold 180px sans-serif';
g.textAlign = 'center';
g.textBaseline = 'middle';
g.fillText('1', 128, 138);

const texture = new THREE.CanvasTexture(cv);
texture.colorSpace = THREE.SRGBColorSpace;</code></pre>
    <h3>贴到立方体的正面</h3>
    <p><code>BoxGeometry</code> 的 6 个面各对应材质数组里的一个下标，顺序为：+X, -X, +Y, -Y, +Z, -Z。正面（朝相机的 +Z 面）是第 4 个材质，给它单独指定带「1」的纹理，其余 5 个面各用不同颜色的纯色材质：</p>
    <pre><code>const faceMat = new THREE.MeshStandardMaterial({ map: texture });
const sideMats = [
  new THREE.MeshStandardMaterial({ color: 0xef4444 }), // +X 红
  new THREE.MeshStandardMaterial({ color: 0x22c55e }), // -X 绿
  new THREE.MeshStandardMaterial({ color: 0xf59e0b }), // +Y 橙
  new THREE.MeshStandardMaterial({ color: 0xeab308 }), // -Y 黄
  new THREE.MeshStandardMaterial({ color: 0xa855f7 }), // -Z 紫
];
const cube = new THREE.Mesh(
  new THREE.BoxGeometry(2, 2, 2),
  [sideMats[0], sideMats[1], sideMats[2], sideMats[3], faceMat, sideMats[4]],
);</code></pre>
    <p>转动视角即可看到正面显示数字「1」，其余每面各有一种颜色。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 0, 5);
        camera.lookAt(0, 0, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // 用 Canvas2D 绘制数字「1」生成纹理
        const numberTexture = makeNumberTexture();

        // 正面（+Z）用 CanvasTexture 显示数字「1」，其余 5 个面各用不同颜色的纯色材质
        const faceMat = new THREE.MeshStandardMaterial({map: numberTexture});
        const sideMats = [
            new THREE.MeshStandardMaterial({color: 0xef4444}), // +X 红
            new THREE.MeshStandardMaterial({color: 0x22c55e}), // -X 绿
            new THREE.MeshStandardMaterial({color: 0xf59e0b}), // +Y 橙
            new THREE.MeshStandardMaterial({color: 0xeab308}), // -Y 黄
            new THREE.MeshStandardMaterial({color: 0xa855f7}), // -Z 紫
        ];
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(2, 2, 2),
            // +X, -X, +Y, -Y, +Z(正面), -Z
            [sideMats[0], sideMats[1], sideMats[2], sideMats[3], faceMat, sideMats[4]],
        );
        ctx.scene.add(cube);

        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
        dirLight.position.set(2, 3, 4);
        ctx.scene.add(dirLight);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            numberTexture.dispose();
            sideMats.forEach((m) => m.dispose());
        });
    },
};
