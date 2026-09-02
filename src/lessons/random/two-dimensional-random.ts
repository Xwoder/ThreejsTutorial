import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {uniformInt} from 'pure-rand/distribution/uniformInt';
import {xorshift128plus} from 'pure-rand/generator/xorshift128plus';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_BLUE} from '../helper';
import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';

const description = `
  <h2>二维随机</h2>
  <p>本例是<strong>一维随机游走</strong>的推广：方块不再被限制在 <b>X 轴</b>，而是可以在 <b>XZ 平面</b>上自由游走（二维随机游走 / 2D Random Walk）。</p>
  <p>参数面板同样提供「<b>走 1 步</b>」「<b>走 10 步</b>」「<b>走 100 步</b>」按钮，但每次决定是否移动时，会<strong>连续生成两个随机数</strong>：</p>
  <ol>
    <li>第 <b>1</b> 个随机数（<code>uniformInt(rng, 0, 1)</code>）→ 决定沿 <b>X 轴</b>的方向：取到 <code>1</code> → <b>+X</b>，取到 <code>0</code> → <b>-X</b>；</li>
    <li>第 <b>2</b> 个随机数 → 决定沿 <b>Z 轴</b>的方向：取到 <code>1</code> → <b>+Z</b>，取到 <code>0</code> → <b>-Z</b>。</li>
  </ol>
  <p>因此每一步方块都会沿对角线迈出一格（同时改变 X 与 Z）。四个组合 <code>(+X,+Z)</code> / <code>(+X,-Z)</code> / <code>(-X,+Z)</code> / <code>(-X,-Z)</code> 各占 <b>25%</b> 概率，长期同样没有偏好方向，期望位移为零。轨迹用青色线在地面标出，可以看到明显的平面「布线」效果。</p>
  <p><b>用到的知识点：</b></p>
  <ul>
    <li>在「一维随机」抛一枚硬币的基础上，<strong>每步抛掷两枚硬币</strong>，分别映射到 X、Z 两个独立方向，从而把一维游走升级为二维。</li>
    <li><code>uniformInt(rng, 0, 1)</code> 每次调用都会推进伪随机生成器内部状态，连续两次调用即可得到两个互相独立的结果。</li>
  </ul>
`;

const STEP = 1; // 每步沿 X / Z 轴移动的格距

export const twoDimensionalRandom: Lesson = {
    id: 'random/two-dimensional',
    title: '二维随机',
    description,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
        camera.position.set(9, 11, 9);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 0.3, 0);

        // 光照：环境光提供整体基础亮度，平行光模拟主光源
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        ctx.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1.8);
        dir.position.set(6, 10, 4);
        ctx.scene.add(dir);
        const syncLightToCamera = () => {
            const dirVec = new THREE.Vector3();
            camera.getWorldDirection(dirVec);
            dir.position.copy(camera.position).addScaledVector(dirVec, -10);
            dir.target.position.copy(camera.position).addScaledVector(dirVec, 10);
            dir.target.updateMatrixWorld();
        };
        syncLightToCamera();

        // 地面网格（XZ 平面），便于对照方块在 X / Z 两个方向的位移
        const grid = new THREE.GridHelper(24, 24, 0x335577, 0x223344);
        ctx.scene.add(grid);

        // 带文字标签的坐标轴辅助器：红=X，绿=Y，蓝=Z
        const axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0;
        ctx.scene.add(axes);

        // 沿 XZ 平面移动的小方块
        const size = 0.6;
        const cube = new THREE.Mesh(
            new THREE.BoxGeometry(size, size, size),
            new THREE.MeshStandardMaterial({color: 0xffb454, roughness: 0.55, metalness: 0.1}),
        );
        cube.position.set(0, size / 2, 0);
        ctx.scene.add(cube);

        // 随机游走轨迹（地面上的青色折线）
        const trailMat = new THREE.LineBasicMaterial({color: 0x4dd0e1});
        const trailLine = new THREE.Line(new THREE.BufferGeometry(), trailMat);
        const trailPoints: THREE.Vector3[] = [new THREE.Vector3(0, 0.05, 0)];
        trailLine.geometry.setFromPoints(trailPoints);
        ctx.scene.add(trailLine);

        // —— 随机状态 ——
        // 用当前时间做种子，保证每次进入课程得到的随机序列都不同
        const rng = xorshift128plus((Date.now() & 0xffffffff) >>> 0);
        let targetX = 0; // 方块要移动到的目标 X
        let targetZ = 0; // 方块要移动到的目标 Z
        let lastRandX = 0; // 上一次生成的随机数（0 或 1，对应 X 方向）
        let lastRandZ = 0; // 上一次生成的随机数（0 或 1，对应 Z 方向）
        let stepCount = 0; // 已走的步数

        const fmtPos = (x: number, y: number, z: number) => `(${x}, ${y}, ${z})`;

        const paramPanel = createParamPanel({
            container,
            resettable: false,
            controls: [
                {type: 'readonly', key: 'rndX', label: '上次随机数 X', value: lastRandX, precision: 0},
                {type: 'readonly', key: 'rndZ', label: '上次随机数 Z', value: lastRandZ, precision: 0},
                {type: 'readonly', key: 'pos', label: '位置', value: fmtPos(targetX, 0, targetZ)},
                {type: 'readonly', key: 'steps', label: '步数', value: stepCount, precision: 0},
            ],
            defaults: {rndX: 0, rndZ: 0, pos: fmtPos(0, 0, 0), steps: 0},
        });

        // 走 n 步：每步连续生成两个随机数 → 决定 X / Z 方向 → 更新目标位置与轨迹
        const advance = (n: number) => {
            for (let i = 0; i < n; i++) {
                // 第 1 个随机数决定 X 方向，第 2 个随机数决定 Z 方向（各 50% 概率 ±1）
                lastRandX = uniformInt(rng, 0, 1);
                lastRandZ = uniformInt(rng, 0, 1);
                const dirX = lastRandX * 2 - 1;
                const dirZ = lastRandZ * 2 - 1;
                targetX += dirX * STEP;
                targetZ += dirZ * STEP;
                stepCount++;
                trailPoints.push(new THREE.Vector3(targetX, 0.05, targetZ));
            }
            trailLine.geometry.setFromPoints(trailPoints);
            paramPanel.setDisplay('rndX', lastRandX);
            paramPanel.setDisplay('rndZ', lastRandZ);
            paramPanel.setDisplay('pos', fmtPos(targetX, 0, targetZ));
            paramPanel.setDisplay('steps', stepCount);
        };

        // 随机游走按钮组：走 1 步 / 走 10 步 / 走 100 步
        paramPanel.addControlGroup({
            title: '随机游走',
            items: [
                {
                    label: '走 1 步',
                    active: () => false,
                    onClick: () => advance(1),
                    color: 'var(--pp-axis-x)',
                    activeColor: 'var(--pp-on-accent)',
                },
                {
                    label: '走 10 步',
                    active: () => false,
                    onClick: () => advance(10),
                    color: 'var(--pp-axis-x)',
                    activeColor: 'var(--pp-on-accent)',
                },
                {
                    label: '走 100 步',
                    active: () => false,
                    onClick: () => advance(100),
                    color: 'var(--pp-axis-x)',
                    activeColor: 'var(--pp-on-accent)',
                },
            ],
        });

        // 「重置」按钮组
        paramPanel.addControlGroup({
            title: '',
            items: [
                {
                    label: '重置',
                    active: () => false,
                    onClick: () => {
                        targetX = 0;
                        targetZ = 0;
                        lastRandX = 0;
                        lastRandZ = 0;
                        stepCount = 0;
                        cube.position.x = 0;
                        cube.position.z = 0;
                        trailPoints.length = 1;
                        trailPoints[0].set(0, 0.05, 0);
                        trailLine.geometry.setFromPoints(trailPoints);
                        paramPanel.setDisplay('rndX', lastRandX);
                        paramPanel.setDisplay('rndZ', lastRandZ);
                        paramPanel.setDisplay('pos', fmtPos(targetX, 0, targetZ));
                        paramPanel.setDisplay('steps', stepCount);
                    },
                    color: 'var(--pp-danger)',
                    activeColor: 'var(--pp-danger)',
                },
            ],
        });

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            // 平滑地朝目标位置插值，让移动看起来更自然
            cube.position.x += (targetX - cube.position.x) * 0.15;
            cube.position.z += (targetZ - cube.position.z) * 0.15;
            orbit.update();
            syncLightToCamera();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            orbit.dispose();
            paramPanel.remove();
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
            ctx.scene.remove(cube);
            cube.geometry.dispose();
            (cube.material as THREE.Material).dispose();
            ctx.scene.remove(trailLine);
            trailLine.geometry.dispose();
            trailMat.dispose();
            ctx.scene.remove(grid);
            grid.geometry.dispose();
            (grid.material as THREE.Material).dispose();
        });
    },
};
