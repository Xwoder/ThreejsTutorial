import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const sineTerrain: Lesson = {
    id: 'uncategorized/sine-terrain',
    title: '三角函数地形',
    description: `
    <h2>用三角函数生成高低起伏的地形</h2>
    <p>不依赖任何高度贴图，而是直接用 <b>正弦 / 余弦函数</b> 在细分的 <code>PlaneGeometry</code> 上<strong>逐顶点</strong>计算高度，从而"雕刻"出连绵起伏的地形。这种方式完全由数学公式驱动，参数（频率、振幅、相位）可实时调节，非常适合理解顶点位移的基本原理。</p>
    <h3>核心思路</h3>
    <p>将平面每个顶点的局部坐标 <code>(x, z)</code> 代入多个正弦/余弦波叠加的算式，得到该点的高度 <code>y</code>。波越多、频率越高，地形越复杂：</p>
    <pre><code>const y =
    A1 * sin(k1 * x + p1) +
    A2 * cos(k2 * z + p2) +
    A3 * sin(k3 * (x + z) + p3);</code></pre>
    <ul>
      <li><b>amplitude（振幅）</b>：每个波的起伏高度。</li>
      <li><b>frequency（频率）</b>：波的个数，越大地形越密集细碎。</li>
      <li><b>phase（相位）</b>：波的横向偏移，让波形错开形成自然感。</li>
    </ul>
    <h3>技术要点</h3>
    <ul>
      <li>平面分段数越高（如 200×200），顶点越密，曲线越平滑。</li>
      <li>修改顶点后需调用 <code>geometry.computeVertexNormals()</code> 重新计算法线，光照才正确。</li>
      <li>用 <code>MeshStandardMaterial</code> + 方向光，可清晰看出明暗起伏。</li>
    </ul>
    <p>拖动右侧参数面板可实时重建地形，鼠标拖动环绕观察。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 1000);
        camera.position.set(60, 45, 60);
        camera.lookAt(0, 0, 0);

        // 光照
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.6));
        const sun = new THREE.DirectionalLight(0xffffff, 1.6);
        sun.position.set(50, 80, 30);
        ctx.scene.add(sun);
        ctx.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x2a2438, 0.5));

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.minDistance = 10;
        controls.maxDistance = 300;

        // 地形参数
        interface TerrainState {
            amplitude1: number;
            frequency1: number;
            phase1: number;
            amplitude2: number;
            frequency2: number;
            phase2: number;
            amplitude3: number;
            frequency3: number;
            phase3: number;
            segments: number;
            size: number;
            wireframe: number;

            [key: string]: number;
        }

        const state: TerrainState = {
            amplitude1: 4,
            frequency1: 0.12,
            phase1: 0,
            amplitude2: 2.5,
            frequency2: 0.2,
            phase2: 0,
            amplitude3: 1.5,
            frequency3: 0.32,
            phase3: 0,
            segments: 200,
            size: 100,
            wireframe: 0,
        };

        const mat = new THREE.MeshStandardMaterial({
            color: 0x4ade80,
            roughness: 0.9,
            metalness: 0.0,
            flatShading: false,
            side: THREE.DoubleSide,
        });

        // 用三角函数逐顶点计算高度
        const applyHeight = (geo: THREE.PlaneGeometry) => {
            const pos = geo.attributes.position as THREE.BufferAttribute;
            for (let i = 0; i < pos.count; i++) {
                const x = pos.getX(i);
                const y = pos.getY(i); // 平面原始在 XY，旋转前 y 即局部"z"
                const h =
                    state.amplitude1 * Math.sin(state.frequency1 * x + state.phase1) +
                    state.amplitude2 * Math.cos(state.frequency2 * y + state.phase2) +
                    state.amplitude3 * Math.sin(state.frequency3 * (x + y) + state.phase3);
                pos.setZ(i, h);
            }
            pos.needsUpdate = true;
            geo.computeVertexNormals();
        };

        const buildTerrain = () => {
            if (terrain) {
                ctx.scene.remove(terrain);
                terrain.geometry.dispose();
            }
            const geo = new THREE.PlaneGeometry(
                state.size,
                state.size,
                state.segments,
                state.segments,
            );
            applyHeight(geo);
            terrain = new THREE.Mesh(geo, mat);
            terrain.rotation.x = -Math.PI / 2; // 平面 XY -> 地面 XZ
            ctx.scene.add(terrain);
        };

        let terrain: THREE.Mesh | null = null;
        buildTerrain();

        const panel = createParamPanel({
            container,
            controls: [
                {
                    type: 'group',
                    label: '波 1',
                    children: [
                        {
                            key: 'amplitude1',
                            label: '振幅',
                            type: 'range',
                            min: 0,
                            max: 10,
                            step: 0.1,
                            value: state.amplitude1,
                            precision: 1,
                            desc: '第一个正弦波的起伏高度',
                        },
                        {
                            key: 'frequency1',
                            label: '频率',
                            type: 'range',
                            min: 0.02,
                            max: 0.5,
                            step: 0.01,
                            value: state.frequency1,
                            precision: 2,
                            desc: '第一个正弦波的个数密度',
                        },
                        {
                            key: 'phase1',
                            label: '相位',
                            type: 'range',
                            min: 0,
                            max: Math.PI * 2,
                            step: 0.05,
                            value: state.phase1,
                            precision: 2,
                            desc: '第一个正弦波的横向偏移，错开波形',
                        },
                    ],
                },
                {
                    type: 'group',
                    label: '波 2',
                    children: [
                        {
                            key: 'amplitude2',
                            label: '振幅',
                            type: 'range',
                            min: 0,
                            max: 10,
                            step: 0.1,
                            value: state.amplitude2,
                            precision: 1,
                            desc: '第二个余弦波的起伏高度',
                        },
                        {
                            key: 'frequency2',
                            label: '频率',
                            type: 'range',
                            min: 0.02,
                            max: 0.5,
                            step: 0.01,
                            value: state.frequency2,
                            precision: 2,
                            desc: '第二个余弦波的个数密度',
                        },
                        {
                            key: 'phase2',
                            label: '相位',
                            type: 'range',
                            min: 0,
                            max: Math.PI * 2,
                            step: 0.05,
                            value: state.phase2,
                            precision: 2,
                            desc: '第二个余弦波的横向偏移，错开波形',
                        },
                    ],
                },
                {
                    type: 'group',
                    label: '波 3',
                    children: [
                        {
                            key: 'amplitude3',
                            label: '振幅',
                            type: 'range',
                            min: 0,
                            max: 10,
                            step: 0.1,
                            value: state.amplitude3,
                            precision: 1,
                            desc: '第三个斜向波的起伏高度',
                        },
                        {
                            key: 'frequency3',
                            label: '频率',
                            type: 'range',
                            min: 0.02,
                            max: 0.5,
                            step: 0.01,
                            value: state.frequency3,
                            precision: 2,
                            desc: '第三个斜向波的个数密度',
                        },
                        {
                            key: 'phase3',
                            label: '相位',
                            type: 'range',
                            min: 0,
                            max: Math.PI * 2,
                            step: 0.05,
                            value: state.phase3,
                            precision: 2,
                            desc: '第三个斜向波的横向偏移，错开波形',
                        },
                    ],
                },
                {
                    key: 'segments',
                    label: '细分段数',
                    type: 'range',
                    min: 20,
                    max: 300,
                    step: 10,
                    value: state.segments,
                    precision: 0,
                    desc: '平面分段数量，越大地形越平滑',
                },
                {
                    key: 'wireframe',
                    label: '线框模式',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.wireframe,
                    desc: '以线框显示，便于观察顶点位移',
                },
            ],
            defaults: {
                amplitude1: 4,
                frequency1: 0.12,
                phase1: 0,
                amplitude2: 2.5,
                frequency2: 0.2,
                phase2: 0,
                amplitude3: 1.5,
                frequency3: 0.32,
                phase3: 0,
                segments: 200,
                wireframe: 0,
            },
            onChange(key, value) {
                switch (key) {
                    case 'amplitude1':
                    case 'frequency1':
                    case 'phase1':
                    case 'amplitude2':
                    case 'frequency2':
                    case 'phase2':
                    case 'amplitude3':
                    case 'frequency3':
                    case 'phase3':
                        state[key] = value;
                        if (terrain) {
                            applyHeight(terrain.geometry as THREE.PlaneGeometry);
                        }
                        break;
                    case 'segments':
                        state.segments = value;
                        buildTerrain();
                        break;
                    case 'wireframe':
                        state.wireframe = value >= 0.5 ? 1 : 0;
                        mat.wireframe = value >= 0.5;
                        break;
                }
            },
        });

        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧参数实时重建地形';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
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
            mat.dispose();
            panel.remove();
            tip.remove();
        });
    },
};
