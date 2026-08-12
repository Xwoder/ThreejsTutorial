import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../paramPanel';

export const axesHelper: Lesson = {
    id: 'axes-helper',
    title: 'AxesHelper 坐标轴（三轴异色）',
    description: `
    <h2>AxesHelper 坐标轴</h2>
    <p><code>AxesHelper</code> 用三条不同颜色的线段表示三个轴向，帮助快速建立空间方向感。默认约定：<b style="color:#f87171">X 轴为红色</b>、<b style="color:#4ade80">Y 轴为绿色</b>、<b style="color:#60a5fa">Z 轴为蓝色</b>。</p>
    <pre><code>new THREE.AxesHelper(size) // 三条轴均为指定长度</code></pre>
    <h3>自定义各轴颜色</h3>
    <p><code>AxesHelper</code> 内部是一条 <code>LineSegments</code>，每条轴对应两个顶点，颜色存放在 <code>geometry.attributes.color</code> 中：顶点 <code>0/1</code> 属于 X 轴，<code>2/3</code> 属于 Y 轴，<code>4/5</code> 属于 Z 轴。修改后需要设置 <code>needsUpdate = true</code>：</p>
    <pre><code>const colors = axes.geometry.attributes.color;
colors.setXYZ(0, r, g, b);  // X 轴起点
colors.setXYZ(1, r, g, b);  // X 轴终点
colors.needsUpdate = true;</code></pre>
    <p>拖动右侧三个颜色选择器，即可为三个轴分别设置任意颜色，X/Y/Z 文字标签的颜色也会同步变化。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5, 4, 7);
        camera.lookAt(0, 0, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        ctx.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x1e293b));

        // 核心演示对象：AxesHelper，三条轴默认为红 / 绿 / 蓝
        const size = 3;
        const axes = new THREE.AxesHelper(size);
        ctx.scene.add(axes);

        // 各轴颜色状态（默认即 AxesHelper 的 X 红 / Y 绿 / Z 蓝）
        const state: Record<string, number> = {
            colorX: 0xff0000,
            colorY: 0x00ff00,
            colorZ: 0x0000ff,
        };

        // X / Y / Z 文字标签，颜色跟随对应轴
        const AXIS_TEXTS = ['X', 'Y', 'Z'];
        const labelTextures: THREE.CanvasTexture[] = [];
        const labelSprites: THREE.Sprite[] = [];
        const d = size + 0.25;
        const positions = [
            new THREE.Vector3(d, 0, 0),
            new THREE.Vector3(0, d, 0),
            new THREE.Vector3(0, 0, d),
        ];
        AXIS_TEXTS.forEach((_text, i) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false}),
            );
            sprite.renderOrder = 999;
            sprite.position.copy(positions[i]);
            sprite.scale.set(0.8, 0.8, 0.8);
            ctx.scene.add(sprite);
            labelTextures.push(texture);
            labelSprites.push(sprite);
        });

        /** 把三轴颜色写入 AxesHelper 顶点颜色属性，并同步标签颜色 */
        const applyColors = () => {
            const attr = axes.geometry.attributes.color as THREE.BufferAttribute;
            const axisColors = [state.colorX, state.colorY, state.colorZ].map(
                (hex) => new THREE.Color(hex),
            );
            axisColors.forEach((col, i) => {
                attr.setXYZ(i * 2, col.r, col.g, col.b);
                attr.setXYZ(i * 2 + 1, col.r, col.g, col.b);
            });
            attr.needsUpdate = true;

            axisColors.forEach((col, i) => {
                const canvas = labelTextures[i].image as HTMLCanvasElement;
                const c = canvas.getContext('2d')!;
                c.clearRect(0, 0, canvas.width, canvas.height);
                c.fillStyle = col.getStyle();
                c.font = 'bold 84px sans-serif';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText(AXIS_TEXTS[i], 64, 70);
                labelTextures[i].needsUpdate = true;
            });
        };
        applyColors();

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'colorX',
                    label: 'X 轴颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: state.colorX,
                    desc: 'X 轴（向右为正）',
                },
                {
                    key: 'colorY',
                    label: 'Y 轴颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: state.colorY,
                    desc: 'Y 轴（向上为正）',
                },
                {
                    key: 'colorZ',
                    label: 'Z 轴颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: state.colorZ,
                    desc: 'Z 轴（朝向屏幕外为正）',
                },
            ],
            defaults: {
                colorX: 0xff0000,
                colorY: 0x00ff00,
                colorZ: 0x0000ff,
            },
            onChange(key, value) {
                state[key] = value;
                applyColors();
            },
        });

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧可修改三轴颜色';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

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
            axes.geometry.dispose();
            (axes.material as THREE.Material).dispose();
            labelTextures.forEach((t) => t.dispose());
            labelSprites.forEach((s) => s.material.dispose());
            panel.remove();
            tip.remove();
        });
    },
};
