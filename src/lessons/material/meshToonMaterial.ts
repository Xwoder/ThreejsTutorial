import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_NAVY} from '../helper';

import {createParamPanel} from '../../utils/paramPanel.ts';

/**
 * 生成卡通材质用的「梯度贴图」：把连续的光照强度离散成固定的几个灰度台阶，
 * 配合 NearestFilter 形成硬边的明暗分层（赛璐珞 / 卡通风）。
 * 台阶数越少，色带越分明；越多越接近平滑过渡。
 */
function makeGradientMap(steps: number): THREE.DataTexture {
    const colors = new Uint8Array(steps);
    for (let i = 0; i < steps; i++) {
        colors[i] = Math.round((i / (steps - 1)) * 255);
    }
    const tex = new THREE.DataTexture(colors, steps, 1, THREE.RedFormat);
    tex.minFilter = THREE.NearestFilter;
    tex.magFilter = THREE.NearestFilter;
    tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return tex;
}

export const meshToonMaterial: Lesson = {
    id: 'material/mesh-toon-material',
    title: 'MeshToonMaterial 卡通材质',
    description: `
    <h2>MeshToonMaterial 卡通材质</h2>
    <p><code>MeshToonMaterial</code> 是一种<b>非真实感渲染（NPR）</b>材质，能把物体画成卡通 / 二次元风格：明暗不是连续渐变，而是被<b>切成几道硬边色带</b>（赛璐珞上色）。它的核心是一个叫 <code>gradientMap</code> 的<small>梯度贴图</small>：</p>
    <pre><code>new THREE.MeshToonMaterial({
  color: 0x60a5fa,
  gradientMap: gradientMap,  // 决定色带数量与分布
})</code></pre>
    <h3>关键点</h3>
    <ul>
      <li><b>梯度贴图</b>：一张一维灰度图，用 <code>NearestFilter</code> 采样。像素个数 = 色带阶数（2 阶最生硬，6 阶以上趋于平滑）。</li>
      <li><b>强烈依赖方向光</b>：色带由 <code>DirectionalLight</code> 的入射角决定。环境光只会整体提亮、不产生分层。</li>
      <li>没有 roughness / metalness 等 PBR 参数，表面始终遵循卡通着色逻辑。</li>
    </ul>
    <h3>动手试试</h3>
    <p>拖动「渐变阶数」观察色带从 2 道硬边到平滑过渡的变化；转动「平行光角度」看明暗交界如何扫过每个几何体；调「环境光强度」可让暗部不至于全黑。相同布局参考 AmbientLight 课程。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_NAVY);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 7, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        // 地板
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.9, side: THREE.DoubleSide}),
        );
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);

        // 共享的梯度贴图，由「渐变阶数」控制重建
        let gradientMap = makeGradientMap(4);
        const toonMaterials: THREE.MeshToonMaterial[] = [];

        // 9 个不同形状 / 颜色的物体，按 3×3 网格排列（与 AmbientLight 课程一致）
        const shapes = [
            {geo: new THREE.SphereGeometry(0.9, 48, 32), color: 0x60a5fa, h: 0.9},
            {geo: new THREE.BoxGeometry(1.5, 1.5, 1.5), color: 0xfbbf24, h: 0.75},
            {geo: new THREE.CylinderGeometry(0.6, 0.6, 2.2, 32), color: 0x34d399, h: 1.1},
            {geo: new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16), color: 0xfb7185, h: 1.2},
            {geo: new THREE.TorusGeometry(0.7, 0.28, 32, 64), color: 0xa78bfa, h: 1.3},
            {geo: new THREE.ConeGeometry(0.8, 1.8, 32), color: 0xfbbf24, h: 0.9},
            {geo: new THREE.DodecahedronGeometry(0.9), color: 0xffffff, h: 1.0},
            {geo: new THREE.OctahedronGeometry(0.9), color: 0xfb923c, h: 0.9},
            {geo: new THREE.IcosahedronGeometry(0.9), color: 0x2dd4bf, h: 0.9},
        ];
        const SPACING = 3.2;
        shapes.forEach(({geo, color, h}, i) => {
            const mat = new THREE.MeshToonMaterial({color, gradientMap});
            toonMaterials.push(mat);
            const mesh = new THREE.Mesh(geo, mat);
            const row = Math.floor(i / 3);
            const col = i % 3;
            mesh.position.set((col - 1) * SPACING, h + 0.1, (row - 1) * SPACING);
            ctx.scene.add(mesh);
        });

        // 环境光：卡通材质用它做整体保底亮度（不产生分层）
        const ambient = new THREE.AmbientLight(0xffffff, 0.4);
        ctx.scene.add(ambient);

        // 平行光：卡通色带由它的入射方向决定，是分层的关键来源
        const dirLight = new THREE.DirectionalLight(0xffffff, 3);
        let lightAngleDeg = 35;
        const updateLight = () => {
            const a = THREE.MathUtils.degToRad(lightAngleDeg);
            dirLight.position.set(Math.cos(a) * 6, 5, Math.sin(a) * 6);
        };
        updateLight();
        ctx.scene.add(dirLight);

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'steps',
                    label: '渐变阶数',
                    type: 'stepper',
                    min: 2,
                    max: 8,
                    step: 1,
                    value: 4,
                    precision: 0,
                    desc: '梯度贴图像素数 = 色带数量，越小越硬朗的卡通感'
                },
                {
                    key: 'dirIntensity',
                    label: '平行光强度',
                    type: 'range',
                    min: 0,
                    max: 5,
                    step: 0.05,
                    value: 3,
                    precision: 2,
                    desc: '产生卡通色带的主光源亮度'
                },
                {
                    key: 'lightAngle',
                    label: '平行光角度',
                    type: 'range',
                    min: 0,
                    max: 360,
                    step: 1,
                    value: 35,
                    precision: 0,
                    desc: '绕场景旋转平行光，观察明暗交界扫过几何体'
                },
                {
                    key: 'ambientIntensity',
                    label: '环境光强度',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    value: 0.4,
                    precision: 2,
                    desc: '整体提亮暗部，调为 0 时背光面接近全黑'
                },
            ],
            defaults: {steps: 4, dirIntensity: 3, lightAngle: 35, ambientIntensity: 0.4},
            onChange(key, value) {
                switch (key) {
                    case 'steps': {
                        const old = gradientMap;
                        gradientMap = makeGradientMap(Math.round(value));
                        toonMaterials.forEach((m) => (m.gradientMap = gradientMap));
                        old.dispose();
                        break;
                    }
                    case 'dirIntensity':
                        dirLight.intensity = value;
                        break;
                    case 'lightAngle':
                        lightAngleDeg = value;
                        updateLight();
                        break;
                    case 'ambientIntensity':
                        ambient.intensity = value;
                        break;
                }
            },
        });

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
            floor.geometry.dispose();
            (floor.material as THREE.Material).dispose();
            shapes.forEach(({geo}) => geo.dispose());
            toonMaterials.forEach((m) => m.dispose());
            gradientMap.dispose();
            panel.remove();
        });
    },
};
