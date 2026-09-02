import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {uniformInt} from 'pure-rand/distribution/uniformInt';
import {xorshift128plus} from 'pure-rand/generator/xorshift128plus';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_BLUE} from '../helper';
import type {Lesson} from '../types';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';
import {createParamPanel} from '../../utils/paramPanel.ts';

const description = `
  <h2>一维随机</h2>
  <p>本例演示一个<strong>一维随机游走（1D Random Walk）</strong>：场景中只有一个小方块，它只能沿着 <b>X 轴</b>移动。</p>
  <p>参数面板提供「<b>走 1 步</b>」「<b>走 10 步</b>」「<b>走 100 步</b>」三个按钮，每次点击都会：</p>
  <ol>
    <li>用 <code>pure-rand</code> 的 <code>xorshift128plus</code> 伪随机数生成器生成一个新的随机数；</li>
    <li>用 <code>uniformInt(rng, 0, 1)</code> 抛一枚公平硬币，再映射成 <code>-1</code> 或 <code>1</code> 作为方向；</li>
    <li>取到 <code>1</code> → 方块沿 <b>+X</b> 前进一格；取到 <code>-1</code> → 沿 <b>-X</b> 后退一格。「上次随机数」面板显示的就是这个 <code>±1</code> 方向。</li>
  </ol>
  <p>由于两个结果的概率各占 <b>50%</b>，长期来看方块没有「偏好方向」，期望位移始终为 <code>0</code>（零漂移随机游走）。轨迹会用青色线在地面上标出，便于观察随机起伏。</p>
  <p><b>用到的知识点：</b></p>
  <ul>
    <li><code>pure-rand</code>：与平台无关的确定性伪随机库；<code>xorshift128plus(seed)</code> 创建生成器，<code>uniformInt(rng, from, to)</code> 在闭区间内均匀取样，且每次调用都会推进内部状态。</li>
    <li><code>uniformInt(rng, 0, 1)</code> 对 <code>{0, 1}</code> 均匀（等价于抛一枚公平硬币），再经 <code>* 2 - 1</code> 映射为 <code>±1</code> 方向，天然实现「一半概率前进 / 一半概率后退」。</li>
  </ul>
`;

const STEP = 1; // 每步沿 X 轴移动的格距

export const oneDimensionalRandom: Lesson = {
    id: 'random/one-dimensional',
    title: '一维随机',
    description,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_BLUE);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 200);
        camera.position.set(7, 5, 11);
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

        // 地面网格（XZ 平面），便于对照方块沿 X 轴的位移
        const grid = new THREE.GridHelper(24, 24, 0x335577, 0x223344);
        ctx.scene.add(grid);

        // 带文字标签的坐标轴辅助器：红=X（移动方向），绿=Y，蓝=Z
        const axes = new LabeledAxesHelper(3, true, true);
        axes.position.y = 0;
        ctx.scene.add(axes);

        // 沿 X 轴移动的小方块
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
        let lastRand = 0; // 上一次生成的随机数（0 或 1）
        let stepCount = 0; // 已走的步数

        const paramPanel = createParamPanel({
            container,
            resettable: false,
            controls: [
                {type: 'readonly', key: 'rnd', label: '上次随机数', value: lastRand, precision: 0},
                {type: 'readonly', key: 'pos', label: '位置 X', value: targetX, precision: 0},
              {type: 'readonly', key: 'steps', label: '步数', value: stepCount, precision: 0},
            ],
            defaults: {rnd: 0, pos: 0, steps: 0},
        });

        // 走 n 步：每步生成随机数 → 决定方向 → 更新目标位置与轨迹
        const advance = (n: number) => {
            for (let i = 0; i < n; i++) {
                lastRand = uniformInt(rng, 0, 1) * 2 - 1; // 等概率返回 -1（后退）或 1（前进）
                targetX += lastRand * STEP; // 直接把方向（±1）乘步长叠加到 X
                stepCount++;
                trailPoints.push(new THREE.Vector3(targetX, 0.05, 0));
            }
            trailLine.geometry.setFromPoints(trailPoints);
            paramPanel.setDisplay('rnd', lastRand);
            paramPanel.setDisplay('pos', targetX);
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
                        lastRand = 0;
                        stepCount = 0;
                        cube.position.x = 0;
                        trailPoints.length = 1;
                        trailPoints[0].set(0, 0.05, 0);
                        trailLine.geometry.setFromPoints(trailPoints);
                        paramPanel.setDisplay('rnd', lastRand);
                        paramPanel.setDisplay('pos', targetX);
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
