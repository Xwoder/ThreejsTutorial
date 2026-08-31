import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_SPACE} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';

/**
 * 用 canvas 画一张「中心亮、边缘透明」的圆形光点贴图。
 * PointsMaterial 默认把贴图铺满一个正方形点，方形贴图会露出硬边，
 * 所以粒子类课程几乎都会先做这样一张径向渐变贴图。
 */
function makeStarTexture(size = 128): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const c = canvas.getContext('2d')!;
    const half = size / 2;
    const g = c.createRadialGradient(half, half, 0, half, half, half);
    g.addColorStop(0.0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.32)');
    g.addColorStop(1.0, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
}

/** 星星色温：从冷蓝到暖橙，模拟真实星空的冷暖差异 */
const STAR_TINTS = [0xffffff, 0xfff6e8, 0xffd9a0, 0xcfe0ff, 0xa9c6ff, 0xffc9b0];

export const starField: Lesson = {
    id: 'particles/star-field',
    title: '粒子星星',
    description: `
    <h2>粒子星星</h2>
    <p>用 <code>THREE.Points</code> 一次画出成千上万颗星星：每一颗星只是几何体里的<b>一个顶点</b>，
    由 <code>PointsMaterial</code> 决定它的大小、贴图与混合方式。相比创建上万个 <code>Mesh</code>，
    粒子只上传一份顶点数据、一次 draw call，是星空、雪花、烟雾这类效果的标配做法。</p>
    <pre><code>const geometry = new THREE.BufferGeometry();
geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
geometry.setAttribute('color',    new THREE.BufferAttribute(colors, 3));

const material = new THREE.PointsMaterial({
  size: 1.2,
  map: starTexture,        // 圆形光点贴图
  vertexColors: true,      // 每个顶点自带颜色
  transparent: true,
  depthWrite: false,       // 不写深度，避免叠加处出现黑边
  blending: THREE.AdditiveBlending,
  sizeAttenuation: true,   // 近大远小
});
const stars = new THREE.Points(geometry, material);</code></pre>
    <h3>几个要点</h3>
    <ul>
      <li><b>position 属性</b>：每 3 个数字代表一颗星的 x / y / z。在球体内均匀取点时，半径要写成
        <code>radius * Math.cbrt(Math.random())</code> —— 直接用 <code>radius * random()</code>
        会让星星大量堆积在球心（体积随半径三次方增长）。</li>
      <li><b>vertexColors</b>：开启后颜色取自 <code>color</code> 属性，每颗星可以有不同的冷暖色调；
        逐帧改写这个属性就能做出<b>闪烁</b>效果（本课的星星各带一个随机相位）。</li>
      <li><b>sizeAttenuation</b>：开启后远处的星星更小，透视感更强；关掉则所有星星屏幕尺寸一致。</li>
      <li><b>AdditiveBlending</b>：叠加混合让重叠的星星互相增亮，配合 <code>depthWrite:false</code> 才不会互相遮挡出黑边。</li>
    </ul>
    <p>右侧参数可实时调节星星数量、散布范围、大小与闪烁。拖动鼠标环绕观察，滚轮缩放。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_SPACE);

        /** 视角模式：'center' 站在星云中心向外看；'orbit' 退到外围俯瞰整片星空 */
        type ViewMode = 'center' | 'orbit';
        const state = {
            view: 'center' as ViewMode,
            count: 6000,   // 星星数量
            radius: 50,    // 散布半径
            size: 1.2,     // 星星大小
            twinkle: 0.7,  // 闪烁强度
            speed: 1.5,    // 闪烁速度
            spin: 0.06,    // 整体旋转速度
            axes: true,    // 是否显示带标签的坐标轴指示器
        };

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 2000);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        /**
         * 根据当前视角模式重置相机位置与 OrbitControls 约束：
         * - center 中心视角：相机钉在星云中心（原点），只「转头」环顾，禁平移禁缩放；
         * - orbit  外围视角：相机退到散布球体外侧俯瞰整片星空，可自由环绕与缩放。
         */
        const applyView = (mode: ViewMode) => {
            state.view = mode;
            if (mode === 'center') {
                camera.position.set(0, 0, 0);
                controls.target.set(0, 0, -1);
                controls.enablePan = false;   // 禁止平移，永远站在中心
                controls.enableZoom = false;  // 禁止缩放，视角不进不退
                controls.rotateSpeed = -0.3;  // 负值：拖动方向符合直觉（向右拖看到右侧的星）
            } else {
                // 退到半径外侧约 1.8 倍处，略微抬高俯瞰
                const dist = state.radius * 1.8;
                camera.position.set(0, dist * 0.35, dist);
                controls.target.set(0, 0, 0);
                controls.enablePan = true;
                controls.enableZoom = true;
                controls.rotateSpeed = -0.3;
            }
            controls.update();
        };
        applyView(state.view);

        // 带文字标签的坐标轴辅助器（红=X / 绿=Y / 蓝=Z），用于对照方向；默认可见，可被参数面板开关
        // 星空课程无地面，无需抬高避免共面遮挡；相机钉在原点，轴原点也放在原点更干净
        const axes = new LabeledAxesHelper(8, true, true);
        axes.position.set(0, 0, 0);
        axes.visible = state.axes;
        ctx.scene.add(axes);

        const starTexture = makeStarTexture();

        const material = new THREE.PointsMaterial({
            size: state.size,
            map: starTexture,
            vertexColors: true,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
            sizeAttenuation: true,
        });

        /** 每颗星的基础颜色（线性空间），闪烁时以它为基准做明暗缩放 */
        let baseColors = new Float32Array(0);
        /** 每颗星的闪烁相位，避免所有星星同步呼吸 */
        let phases = new Float32Array(0);

        /** 按当前参数生成粒子几何体：球体内均匀散布 + 随机色温 + 随机相位 */
        const makeStarGeometry = (): THREE.BufferGeometry => {
            const count = Math.round(state.count);
            const positions = new Float32Array(count * 3);
            const colors = new Float32Array(count * 3);
            baseColors = new Float32Array(count * 3);
            phases = new Float32Array(count);

            const tint = new THREE.Color();
            for (let i = 0; i < count; i++) {
                // 球体内均匀取点：半径用立方根修正；留一点空心，避免中心糊成一团
                const r = state.radius * (0.2 + 0.8 * Math.cbrt(Math.random()));
                const theta = Math.random() * Math.PI * 2;
                const phi = Math.acos(2 * Math.random() - 1);
                const sinPhi = Math.sin(phi);
                positions[i * 3] = r * sinPhi * Math.cos(theta);
                positions[i * 3 + 1] = r * Math.cos(phi) * 0.6; // 压扁 Y，呈星盘状
                positions[i * 3 + 2] = r * sinPhi * Math.sin(theta);

                tint.setHex(STAR_TINTS[(Math.random() * STAR_TINTS.length) | 0]);
                colors[i * 3] = tint.r;
                colors[i * 3 + 1] = tint.g;
                colors[i * 3 + 2] = tint.b;
                phases[i] = Math.random() * Math.PI * 2;
            }
            baseColors = colors.slice();

            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
            geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
            return geometry;
        };

        let geometry = makeStarGeometry();
        const stars = new THREE.Points(geometry, material);
        ctx.scene.add(stars);

        /** 数量 / 半径变化时需要重新生成顶点：替换 geometry 并释放旧的 */
        const rebuild = () => {
            const next = makeStarGeometry();
            stars.geometry = next;
            geometry.dispose();
            geometry = next;
        };

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'count',
                    label: '星星数量',
                    type: 'range',
                    min: 500,
                    max: 5000,
                    step: 500,
                    value: state.count,
                    precision: 0,
                    desc: '粒子个数，即几何体的顶点数',
                },
                {
                    key: 'radius',
                    label: '散布半径',
                    type: 'range',
                    min: 10,
                    max: 100,
                    step: 1,
                    value: state.radius,
                    precision: 0,
                    desc: '星星分布球体的半径',
                },
                {
                    key: 'size',
                    label: '星星大小',
                    type: 'range',
                    min: 0.2,
                    max: 4,
                    step: 0.1,
                    value: state.size,
                    precision: 1,
                    desc: 'PointsMaterial.size，配合 sizeAttenuation 近大远小',
                },
                {
                    key: 'twinkle',
                    label: '闪烁强度',
                    type: 'range',
                    min: 0,
                    max: 1,
                    step: 0.05,
                    value: state.twinkle,
                    precision: 2,
                    desc: '逐帧改写 color 属性的明暗幅度，0 为不闪烁',
                },
                {
                    key: 'speed',
                    label: '闪烁速度',
                    type: 'range',
                    min: 0,
                    max: 5,
                    step: 0.1,
                    value: state.speed,
                    precision: 1,
                    desc: '闪烁的角频率，越大呼吸越快',
                },
                {
                    key: 'spin',
                    label: '旋转速度',
                    type: 'range',
                    min: 0,
                    max: 0.3,
                    step: 0.01,
                    value: state.spin,
                    precision: 2,
                    desc: '整片星空绕 Y 轴的自转速度（弧度/秒）',
                },
                {
                    key: 'axes',
                    label: '显示坐标轴',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '是否显示带 X/Y/Z 文字标签的坐标轴指示器（红=X 绿=Y 蓝=Z）',
                },
            ],
            defaults: {
                count: 6000,
                radius: 50,
                size: 1.2,
                twinkle: 0.7,
                speed: 1.5,
                spin: 0.06,
                axes: 1,
            },
            onChange(key, value) {
                switch (key) {
                    case 'count':
                    case 'radius':
                        state[key] = value;
                        rebuild();
                        break;
                    case 'size':
                        state.size = value;
                        material.size = value;
                        break;
                    case 'twinkle':
                    case 'speed':
                    case 'spin':
                        state[key] = value;
                        break;
                    case 'axes':
                        state.axes = value >= 0.5;
                        axes.visible = state.axes;
                        break;
                }
            },
        });

        // 左上角视角选项卡：中心视角 / 外围视角（样式复用全局 .view-tabs）
        const viewTabs = document.createElement('div');
        viewTabs.className = 'view-tabs';
        const viewDefs: Array<{ label: string; mode: ViewMode }> = [
            {label: '中心视角', mode: 'center'},
            {label: '外围视角', mode: 'orbit'},
        ];
        const viewButtons: HTMLButtonElement[] = [];
        viewDefs.forEach(({label, mode}) => {
            const btn = document.createElement('button');
            btn.textContent = label;
            btn.title = mode === 'center' ? '站在星云中心向外环顾' : '退到星海外侧俯瞰整片星空';
            if (state.view === mode) btn.classList.add('active');
            btn.addEventListener('click', () => {
                applyView(mode);
                viewButtons.forEach((b) => b.classList.toggle('active', b === btn));
            });
            viewTabs.appendChild(btn);
            viewButtons.push(btn);
        });
        container.appendChild(viewTabs);

        const tip = document.createElement('div');
        tip.textContent = '左侧可切换「中心 / 外围」视角 · 拖动鼠标环顾四周 · 右侧参数实时调节星空';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

        let last = performance.now();
        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const now = performance.now();
            const dt = Math.min((now - last) / 1000, 0.1);
            last = now;

            // 闪烁：按各自相位缩放顶点颜色，最后整体标记 needsUpdate
            const colorAttr = stars.geometry.getAttribute('color') as THREE.BufferAttribute;
            const arr = colorAttr.array as Float32Array;
            const t = now / 1000;
            for (let i = 0; i < phases.length; i++) {
                const f = 1 - state.twinkle + state.twinkle * (0.5 + 0.5 * Math.sin(t * state.speed + phases[i]));
                arr[i * 3] = baseColors[i * 3] * f;
                arr[i * 3 + 1] = baseColors[i * 3 + 1] * f;
                arr[i * 3 + 2] = baseColors[i * 3 + 2] * f;
            }
            colorAttr.needsUpdate = true;

            stars.rotation.y += dt * state.spin;

            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            ctx.scene.remove(axes);
            axes.traverse((obj) => {
                const anyObj = obj as unknown as {
                    geometry?: { dispose(): void };
                    material?: { dispose(): void } | { dispose(): void }[];
                };
                anyObj.geometry?.dispose();
                const mat = anyObj.material;
                if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
                else mat?.dispose();
            });
            starTexture.dispose();
            material.dispose();
            panel.remove();
            tip.remove();
        });
    },
};
