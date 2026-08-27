import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {setSceneBackground, createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const gridHelper: Lesson = {
    id: 'uncategorized/grid-helper',
    title: 'GridHelper 网格',
    description: `
    <h2>GridHelper 网格辅助线</h2>
    <p><code>GridHelper</code> 在 XZ 平面上绘制一个正方形网格，帮助建立空间坐标感、判断物体位置与尺寸，是 3D 场景中最常用的辅助工具之一。</p>
    <pre><code>new THREE.GridHelper(size, divisions, colorCenterLine, colorGrid)
// size            网格总边长
// divisions       分割份数（边长等分为多少格）
// colorCenterLine 经过原点的中心线颜色
// colorGrid       普通网格线颜色</code></pre>
    <p>网格本质是一个 <code>LineSegments</code> 对象，可像普通物体一样修改 <code>position</code> 与 <code>rotation</code>。拖动右侧参数即可实时重建网格并调整它的尺寸、位置与角度。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, 0x111827);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(6, 5, 8);
        camera.lookAt(0, 0, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        // 参考立方体：便于观察网格与坐标的关系
        const box = new THREE.Mesh(
            new THREE.BoxGeometry(0.6, 0.6, 0.6),
            new THREE.MeshStandardMaterial({color: 0x7dd3fc, roughness: 0.4}),
        );
        box.position.set(1.5, 0.3, 1);
        ctx.scene.add(box);
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
        const point = new THREE.PointLight(0xffffff, 1.5, 20);
        point.position.set(3, 3, 3);
        ctx.scene.add(point);

        // 核心演示对象：GridHelper
        const state = {
            size: 10,
            divisions: 10,
            centerColor: 0xe2e8f0,
            gridColor: 0x94a3b8,
            posY: 0,
            rotX: 0,
        };

        const disposeGrid = (g: THREE.GridHelper) => {
            g.geometry.dispose();
            const m = g.material as THREE.Material | THREE.Material[];
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else m.dispose();
        };

        let grid = new THREE.GridHelper(
            state.size,
            state.divisions,
            state.centerColor,
            state.gridColor,
        );
        ctx.scene.add(grid);

        // 按当前参数重建网格（尺寸 / 分割数 / 颜色 / 位置 / 角度）
        const rebuild = () => {
            disposeGrid(grid);
            ctx.scene.remove(grid);
            grid = new THREE.GridHelper(
                state.size,
                state.divisions,
                state.centerColor,
                state.gridColor,
            );
            grid.position.y = state.posY;
            grid.rotation.x = THREE.MathUtils.degToRad(state.rotX);
            ctx.scene.add(grid);
        };

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'size',
                    label: '网格大小',
                    type: 'range',
                    min: 4,
                    max: 20,
                    step: 1,
                    value: state.size,
                    precision: 0,
                    desc: '网格总边长',
                },
                {
                    key: 'divisions',
                    label: '分割数',
                    type: 'range',
                    min: 2,
                    max: 40,
                    step: 1,
                    value: state.divisions,
                    precision: 0,
                    desc: '将边长等分的份数，越多格子越密',
                },
                {
                    key: 'gridColor',
                    label: '网格线颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: state.gridColor,
                    desc: '普通网格线的颜色',
                },
                {
                    key: 'centerColor',
                    label: '中心线颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: state.centerColor,
                    desc: '经过原点的中心线颜色',
                },
                {
                    key: 'posY',
                    label: '高度 Y',
                    type: 'range',
                    min: -2,
                    max: 2,
                    step: 0.1,
                    value: state.posY,
                    precision: 1,
                    desc: '网格在竖直方向上的位置',
                },
                {
                    key: 'rotX',
                    label: '绕 X 旋转（°）',
                    type: 'range',
                    min: -180,
                    max: 180,
                    step: 1,
                    value: state.rotX,
                    precision: 0,
                    desc: '网格绕 X 轴的旋转角度',
                },
            ],
            defaults: {
                size: 10,
                divisions: 10,
                gridColor: 0x94a3b8,
                centerColor: 0xe2e8f0,
                posY: 0,
                rotX: 0,
            },
            onChange(key, value) {
                switch (key) {
                    case 'size':
                    case 'divisions':
                    case 'gridColor':
                    case 'centerColor':
                    case 'posY':
                    case 'rotX':
                        state[key] = value;
                        break;
                }
                rebuild();
            },
        });

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧参数面板实时重建网格';
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
            disposeGrid(grid);
            box.geometry.dispose();
            (box.material as THREE.Material).dispose();
            panel.remove();
            tip.remove();
        });
    },
};
