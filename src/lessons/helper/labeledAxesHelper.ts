import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK} from '../helper';

import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const labeledAxesHelper: Lesson = {
    id: 'helper/labeled-axes-helper',
    title: 'LabeledAxesHelper 带标签坐标轴',
    description: `
    <h2>LabeledAxesHelper 带标签坐标轴</h2>
    <p><code>LabeledAxesHelper</code> 是项目内置的<b>增强版坐标轴</b>：相比原生 <code>AxesHelper</code>，它在三轴末端用 <b>X / Y / Z</b> 文字标签标注方向，并用加粗的 <code>Line2</code> 轴线（世界单位线宽，不再受 WebGL 线宽 1px 限制）替代细线，且末端可显示箭头。</p>
    <p>默认约定与 <code>AxesHelper</code> 一致：<b style="color:#ff453a">X 轴红色</b>、<b style="color:#32d74b">Y 轴绿色</b>、<b style="color:#0a84ff">Z 轴蓝色</b>。标签与轴线关闭了深度测试，从任何视角（含从底部翻转）都显示在最前，便于随时建立空间方向感。</p>
    <pre><code>new LabeledAxesHelper(
  size,       // 坐标轴长度
  showArrow,  // 末端是否显示箭头（圆锥）
  showLabel,  // 是否显示 X / Y / Z 文字标签
)</code></pre>
    <p>右侧可实时调节坐标轴长度、切换箭头与标签的显示，直观对比与原生 <code>AxesHelper</code> 的差异。</p>
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

        // 参数状态
        const state = {
            size: 3,
            showArrow: 1,
            showLabel: 1,
            showX: 1,
            showY: 1,
            showZ: 1,
        };

        // 核心演示对象：LabeledAxesHelper
        let axes: LabeledAxesHelper;
        const build = () => {
            if (axes) {
                ctx.scene.remove(axes);
                axes.traverse((o) => {
                    const any = o as THREE.Mesh | Line2 | THREE.Sprite;
                    const g = (any as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
                    if (g && 'dispose' in g) g.dispose();
                    const m = (any as THREE.Mesh).material as THREE.Material | undefined;
                    if (m && 'dispose' in m) m.dispose();
                });
            }
            axes = new LabeledAxesHelper(
                state.size,
                state.showArrow >= 0.5,
                state.showLabel >= 0.5,
                state.showX >= 0.5,
                state.showY >= 0.5,
                state.showZ >= 0.5,
            );
            ctx.scene.add(axes);
        };
        build();

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'size',
                    label: '坐标轴长度',
                    type: 'range',
                    min: 1,
                    max: 8,
                    step: 0.5,
                    value: state.size,
                    precision: 1,
                    desc: '三条轴的统一长度',
                },
                {
                    key: 'showArrow',
                    label: '显示箭头',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showArrow,
                    desc: '是否在轴末端显示箭头（圆锥）',
                },
                {
                    key: 'showLabel',
                    label: '显示名称',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showLabel,
                    desc: '是否显示 X / Y / Z 文字标签',
                },
                {
                    key: 'showX',
                    label: '显示 X 轴',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showX,
                    desc: '是否显示红色 X 轴',
                },
                {
                    key: 'showY',
                    label: '显示 Y 轴',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showY,
                    desc: '是否显示绿色 Y 轴',
                },
                {
                    key: 'showZ',
                    label: '显示 Z 轴',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showZ,
                    desc: '是否显示蓝色 Z 轴',
                },
            ],
            defaults: {
                size: 3,
                showArrow: 1,
                showLabel: 1,
                showX: 1,
                showY: 1,
                showZ: 1,
            },
            onChange(key, value) {
                (state as Record<string, number>)[key] = value;
                build();
            },
        });

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧参数控制坐标轴';
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
            if (axes) {
                axes.traverse((o) => {
                    const any = o as THREE.Mesh | Line2 | THREE.Sprite;
                    const g = (any as THREE.Mesh).geometry as THREE.BufferGeometry | undefined;
                    if (g && 'dispose' in g) g.dispose();
                    const m = (any as THREE.Mesh).material as THREE.Material | undefined;
                    if (m && 'dispose' in m) m.dispose();
                });
            }
            panel.remove();
            tip.remove();
        });
    },
};
