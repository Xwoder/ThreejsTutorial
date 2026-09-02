import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK} from '../helper';

import {createParamPanel} from '../../utils/paramPanel.ts';

export const axesHelper: Lesson = {
    id: 'helper/axes-helper',
    title: 'AxesHelper 坐标轴',
    description: `
    <h2>AxesHelper 坐标轴</h2>
    <p><code>AxesHelper</code> 用三条不同颜色的线段表示三个轴向，帮助快速建立空间方向感。默认约定：<b style="color:#f87171">X 轴为红色</b>、<b style="color:#4ade80">Y 轴为绿色</b>、<b style="color:#60a5fa">Z 轴为蓝色</b>。</p>
    <pre><code>new THREE.AxesHelper(size) // 三条轴均为指定长度</code></pre>
    <p>画布中的三条坐标轴自带 X / Y / Z 文字标签，勾选右侧「是否显示坐标轴名称」即可随时显示或隐藏它们。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK);

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

        // 核心演示对象：AxesHelper，三条轴默认红 / 绿 / 蓝
        const size = 3;
        const axes = new THREE.AxesHelper(size);
        ctx.scene.add(axes);

        // 勾选状态：是否显示坐标轴名称
        const state = {showLabels: 1};

        // X / Y / Z 文字标签，颜色与三轴一致（红 / 绿 / 蓝）
        const AXIS_META = [
            {text: 'X', color: '#ff453a', pos: new THREE.Vector3(size + 0.25, 0, 0)},
            {text: 'Y', color: '#32d74b', pos: new THREE.Vector3(0, size + 0.25, 0)},
            {text: 'Z', color: '#0a84ff', pos: new THREE.Vector3(0, 0, size + 0.25)},
        ];
        const labelTextures: THREE.CanvasTexture[] = [];
        const labelSprites: THREE.Sprite[] = [];
        AXIS_META.forEach(({text, color, pos}) => {
            const canvas = document.createElement('canvas');
            canvas.width = 128;
            canvas.height = 128;
            const c = canvas.getContext('2d')!;
            c.fillStyle = color;
            c.font = 'bold 84px sans-serif';
            c.textAlign = 'center';
            c.textBaseline = 'middle';
            c.fillText(text, 64, 70);
            const texture = new THREE.CanvasTexture(canvas);
            texture.colorSpace = THREE.SRGBColorSpace;
            texture.minFilter = THREE.LinearFilter;
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false}),
            );
            sprite.renderOrder = 999;
            sprite.position.copy(pos);
            sprite.scale.set(0.8, 0.8, 0.8);
            sprite.visible = state.showLabels >= 0.5;
            ctx.scene.add(sprite);
            labelTextures.push(texture);
            labelSprites.push(sprite);
        });

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'showLabels',
                    label: '显示坐标轴名称',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showLabels,
                    desc: '是否显示 X / Y / Z 文字标签',
                },
            ],
            defaults: {
                showLabels: 1,
            },
            onChange(key, value) {
                if (key === 'showLabels') {
                    state.showLabels = value;
                    labelSprites.forEach((s) => (s.visible = value >= 0.5));
                }
            },
        });

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧可切换坐标轴名称显示';
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
