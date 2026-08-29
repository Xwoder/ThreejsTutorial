import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground, BG_DARK_SLATE} from '../helper';

import {createParamPanel} from '../../utils/paramPanel.ts';

/** 阴影贴图过滤类型：与 THREE 的 ShadowMap 常量一一对应 */
const SHADOW_TYPES: { label: string; value: THREE.ShadowMapType }[] = [
    {label: 'Basic', value: THREE.BasicShadowMap},
    {label: 'PCF', value: THREE.PCFShadowMap},
    {label: 'PCFSoft', value: THREE.PCFSoftShadowMap},
    {label: 'VSM', value: THREE.VSMShadowMap},
];

/** 可选阴影贴图分辨率（2 的幂） */
const SHADOW_SIZES = [512, 1024, 2048, 4096];

export const shadow: Lesson = {
    id: 'uncategorized/shadow',
    title: '阴影 Shadow',
    description: `
    <h2>阴影 Shadow</h2>
    <p>Three.js 中的阴影并不是光线追踪，而是经典的 <b>Shadow Map（阴影贴图）</b>：先<b>从光源视角</b>把场景渲染成一张深度图，再在正式渲染时比较「某点到光源的距离」与「深度图中记录的最近距离」，若更远则该点处于阴影里。</p>

    <h3>四个开关，缺一不可</h3>
    <pre><code>renderer.shadowMap.enabled = true;   // ① 渲染器总开关（最容易漏！）
light.castShadow = true;             // ② 光源投射阴影
mesh.castShadow = true;              // ③ 物体投下影子  → 谁投影
floor.receiveShadow = true;          // ④ 平面接收影子  → 谁被投影</code></pre>
    <p>四个开关必须<b>同时为真</b>才会出现阴影，任意一个关掉影子就消失。<code>castShadow</code> 决定"谁投影"，<code>receiveShadow</code> 决定"谁被投影"，两者互相独立：地面只需 <code>receiveShadow</code>，而几何体若想接到别的物体的影子（互阴影），就得两者都开。</p>
    <p>右侧面板「阴影的四个开关」分组里有这 4 个勾选项，可以逐个关掉，亲眼验证每一步的作用：关①全部失效；关②光源不再产生深度图；关③物体不投影但地面仍显示别人的影子；关④地面不再显示任何影子。</p>
    <p>地面上共放置 <b>9 个不同形状 / 颜色的几何体</b>，按 <b>3×3 网格</b>排列（间距 3.2），覆盖球体、立方体、圆柱、环面纽结、圆环、圆锥、十二面体、八面体、二十面体，方便对比不同轮廓投出的影子。</p>
    <p>本示例中所有几何体都<b>悬浮在地面之上</b>（可拖动「悬浮高度」调节），影子与物体之间留有空隙，能更清楚地看出"影子落在地面上"这件事。物体高度取各自的<b>包围球半径</b>（<code>geometry.boundingSphere.radius</code>）作为贴地基准，因此无论怎么自转都不会插进地面。</p>

    <h3>平行光的阴影相机</h3>
    <p>平行光的阴影由一台<b>正交相机</b>（<code>light.shadow.camera</code>）负责渲染深度图。它的取景范围必须<b>刚好包住需要投影的物体</b>：</p>
    <pre><code>const s = light.shadow.camera;
s.left = -10; s.right = 10; s.top = 10; s.bottom = -10;
s.near = 0.5; s.far = 30;
s.updateProjectionMatrix();          // 改完务必调用</code></pre>
    <ul>
      <li>范围<b>过大</b> → 深度图分辨率被浪费，阴影边缘出现锯齿（放大看像马赛克）。</li>
      <li>范围<b>过小</b> → 超出部分的物体投影被直接裁掉。</li>
    </ul>
    <p>勾选「显示阴影相机 Helper」可以看到这个黄色/多彩的视锥框，调整「阴影相机范围」时它随之缩放。</p>

    <h3>阴影质量与常见瑕疵</h3>
    <ul>
      <li><b>mapSize</b>：阴影贴图分辨率。越高边缘越细腻，代价是显存与性能。建议 1024 / 2048。</li>
      <li><b>过滤类型</b>：<code>BasicShadowMap</code> 不做插值，边缘最硬；<code>PCFShadowMap</code> 做多次采样；<code>PCFSoftShadowMap</code> 进一步软化边缘（最常用）；<code>VSMShadowMap</code> 用方差阴影，边缘柔和且可配合 <code>radius</code> 大范围虚化。</li>
      <li><b>radius</b>：模糊半径。仅在 PCF / PCFSoft / VSM 下生效，<code>Basic</code> 类型下无效。</li>
      <li><b>bias / normalBias</b>：深度比较的偏移量，用来消除<b>阴影痤疮（shadow acne）</b>——物体表面出现的条纹状自阴影。<code>bias</code> 通常取很小的负值（如 -0.0005），<code>normalBias</code> 沿法线方向偏移，两者配合效果最好；调得过大则会出现 <b>Peter Panning</b>（影子与物体"脱开"）。</li>
    </ul>

    <h3>动手试试</h3>
    <ul>
      <li>把「仰角」降到 10° 左右 → 影子被拉得很长，像傍晚的太阳。</li>
      <li>拖动「悬浮高度」→ 物体整体远离地面，影子与物体逐渐"脱开"，可以清楚看到"影子是投在地面上的"。</li>
      <li>把「阴影贴图分辨率」调到 512 → 边缘锯齿立刻明显。</li>
      <li>把「阴影相机范围」调到 20 → 同样的贴图分辨率下阴影变得模糊。</li>
      <li>把 <code>bias</code> 设为 0 并切到 Basic → 观察表面出现的自阴影条纹。</li>
    </ul>
    <p>拖动鼠标环绕观察，滚轮缩放；右侧参数面板可实时调节。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, BG_DARK_SLATE);

        // ---------- 渲染器：开启阴影 ----------
        ctx.renderer.shadowMap.enabled = true;
        ctx.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
        camera.position.set(8, 6.5, 10);
        camera.lookAt(0, 1.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // ---------- 地面：接收阴影 ----------
        const floorMat = new THREE.MeshStandardMaterial({
            color: 0x8d9aab,
            roughness: 0.95,
            metalness: 0,
        });
        const floorGeo = new THREE.PlaneGeometry(20, 20);
        const floor = new THREE.Mesh(floorGeo, floorMat);
        floor.rotation.x = -Math.PI / 2;
        floor.receiveShadow = true;
        ctx.scene.add(floor);

        // ---------- 9 个几何体（与 point-light 课程一致）：3×3 网格排布，悬浮在地面上方 ----------
        interface ShapeItem {
            mesh: THREE.Mesh;
            /** 自转速度系数，让不同物体转速略有差异 */
            speed: number;
            /** 贴地时的中心高度：取包围球半径，保证任意自转角度都穿不到地面 */
            restY: number;
        }

        /** 网格间距，与 point-light 课程保持一致 */
        const SPACING = 3.2;
        const shapeDefs: {
            geo: THREE.BufferGeometry;
            color: number;
            roughness: number;
            metalness?: number;
            speed: number;
        }[] = [
            {
                geo: new THREE.SphereGeometry(0.9, 48, 32),
                color: 0x60a5fa,
                roughness: 0.3,
                speed: 0.2,
            },
            {
                geo: new THREE.BoxGeometry(1.5, 1.5, 1.5),
                color: 0xfbbf24,
                roughness: 0.5,
                speed: 0.6,
            },
            {
                geo: new THREE.CylinderGeometry(0.6, 0.6, 2.2, 32),
                color: 0x34d399,
                roughness: 0.4,
                metalness: 0.2,
                speed: 0.8,
            },
            {
                geo: new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16),
                color: 0xfb7185,
                roughness: 0.5,
                speed: 1,
            },
            {
                geo: new THREE.TorusGeometry(0.7, 0.28, 32, 64),
                color: 0xa78bfa,
                roughness: 0.4,
                speed: 1.1,
            },
            {
                geo: new THREE.ConeGeometry(0.8, 1.8, 32),
                color: 0xfbbf24,
                roughness: 0.5,
                speed: 1.2,
            },
            {
                geo: new THREE.DodecahedronGeometry(0.9),
                color: 0xffffff,
                roughness: 0.6,
                speed: 1.3,
            },
            {
                geo: new THREE.OctahedronGeometry(0.9),
                color: 0xfb923c,
                roughness: 0.5,
                speed: 1.2,
            },
            {
                geo: new THREE.IcosahedronGeometry(0.9),
                color: 0x2dd4bf,
                roughness: 0.4,
                speed: 0.9,
            },
        ];

        const shapes: ShapeItem[] = shapeDefs.map((d, i) => {
            const mat = new THREE.MeshStandardMaterial({
                color: d.color,
                roughness: d.roughness,
                metalness: d.metalness ?? 0,
            });
            // 包围球半径作为"贴地高度"：物体绕任意轴自转时都不会插入地面
            d.geo.computeBoundingSphere();
            const restY = d.geo.boundingSphere?.radius ?? 1;
            const mesh = new THREE.Mesh(d.geo, mat);
            const row = Math.floor(i / 3);
            const col = i % 3;
            mesh.position.set((col - 1) * SPACING, restY, (row - 1) * SPACING);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            ctx.scene.add(mesh);
            return {mesh, speed: d.speed, restY};
        });

        // ---------- 灯光 ----------
        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        ctx.scene.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 3);
        dirLight.castShadow = true;
        dirLight.shadow.mapSize.set(2048, 2048);
        dirLight.shadow.radius = 2;
        dirLight.shadow.bias = -0.0005;
        dirLight.shadow.normalBias = 0.02;
        // 阴影相机（正交）范围
        Object.assign(dirLight.shadow.camera, {
            left: -10,
            right: 10,
            top: 10,
            bottom: -10,
            near: 0.5,
            far: 30,
        });
        dirLight.shadow.camera.updateProjectionMatrix();
        ctx.scene.add(dirLight);
        ctx.scene.add(dirLight.target);

        // ---------- Helper ----------
        const lightHelper = new THREE.DirectionalLightHelper(dirLight, 2, 0xfacc15);
        ctx.scene.add(lightHelper);
        const camHelper = new THREE.CameraHelper(dirLight.shadow.camera);
        camHelper.visible = false;
        ctx.scene.add(camHelper);

        // ---------- 状态 ----------
        const LIGHT_DIST = 14;
        /** 几何体自转的基础角速度（弧度/秒），各物体再乘以自身的 speed 系数 */
        const SPIN_SPEED = 0.3;
        const state = {
            intensity: 3,
            ambient: 0.3,
            azimuth: 45,
            elevation: 50,
            hover: 0.8,
            radius: 2,
            bias: -0.0005,
            normalBias: 0.02,
            camSize: 10,
            camFar: 30,
            // 阴影的四个开关，缺一不可
            enableShadowMap: 1,
            lightCast: 1,
            castShadow: 1,
            receiveShadow: 1,
            showLightHelper: 1,
            showCamHelper: 0,
        };
        let shadowType: THREE.ShadowMapType = THREE.PCFSoftShadowMap;
        let mapSize = 2048;

        /** 按方位角 / 仰角摆放光源 */
        const applyDirection = () => {
            const a = THREE.MathUtils.degToRad(state.azimuth);
            const e = THREE.MathUtils.degToRad(state.elevation);
            dirLight.position.set(
                Math.sin(a) * Math.cos(e) * LIGHT_DIST,
                Math.sin(e) * LIGHT_DIST,
                Math.cos(a) * Math.cos(e) * LIGHT_DIST,
            );
            dirLight.target.position.set(0, 0, 0);
            lightHelper.update();
        };

        /** 让所有几何体整体抬升，与地面保持距离（影子与物体"脱开"，更易观察） */
        const applyHover = () => {
            shapes.forEach(({mesh, restY}) => {
                mesh.position.y = restY + state.hover;
            });
        };

        /** 阴影相机是正交相机，改范围后必须刷新投影矩阵 */
        const applyShadowCamera = () => {
            const cam = dirLight.shadow.camera;
            cam.left = -state.camSize;
            cam.right = state.camSize;
            cam.top = state.camSize;
            cam.bottom = -state.camSize;
            cam.far = state.camFar;
            cam.updateProjectionMatrix();
            camHelper.update();
        };

        /** 切换阴影贴图分辨率：需释放旧贴图，Three.js 才会在下一帧重建 */
        const applyMapSize = () => {
            dirLight.shadow.mapSize.set(mapSize, mapSize);
            dirLight.shadow.map?.dispose();
            dirLight.shadow.map = null as unknown as THREE.WebGLRenderTarget;
            dirLight.shadow.needsUpdate = true;
        };

        /** 切换过滤类型：着色器需要重新编译 */
        const applyShadowType = () => {
            ctx.renderer.shadowMap.type = shadowType;
            dirLight.shadow.map?.dispose();
            dirLight.shadow.map = null as unknown as THREE.WebGLRenderTarget;
            ctx.renderer.shadowMap.needsUpdate = true;
            refreshMaterials();
        };

        /**
         * 标记场景内所有材质重新编译着色器。
         * 切换 renderer.shadowMap.enabled 会改变程序缓存键（shadowMapEnabled），
         * 但不会自动触发重编译，必须手动置 needsUpdate。
         */
        const refreshMaterials = () => {
            ctx.scene.traverse((obj) => {
                const m = (obj as THREE.Mesh).material;
                if (!m) return;
                const list = Array.isArray(m) ? m : [m];
                list.forEach((mm) => (mm.needsUpdate = true));
            });
        };

        /** 开关 1：渲染器总开关 */
        const applyShadowMapEnabled = () => {
            ctx.renderer.shadowMap.enabled = state.enableShadowMap >= 0.5;
            refreshMaterials();
        };

        /** 开关 2：光源是否投射阴影 */
        const applyLightCast = () => {
            dirLight.castShadow = state.lightCast >= 0.5;
            refreshMaterials();
        };

        /** 开关 3：几何体是否投下影子 */
        const applyObjectCast = () => {
            const on = state.castShadow >= 0.5;
            shapes.forEach(({mesh}) => (mesh.castShadow = on));
        };

        /** 开关 4：地面与几何体是否接收影子 */
        const applyReceive = () => {
            const on = state.receiveShadow >= 0.5;
            floor.receiveShadow = on;
            shapes.forEach(({mesh}) => (mesh.receiveShadow = on));
        };

        applyDirection();
        applyHover();
        applyShadowCamera();
        applyShadowMapEnabled();
        applyLightCast();
        applyObjectCast();
        applyReceive();

        // ---------- 参数面板 ----------
        const panel = createParamPanel({
            container,
            controls: [
                {
                    type: 'group',
                    label: '灯光',
                    children: [
                        {
                            key: 'intensity',
                            label: '平行光强度',
                            min: 0,
                            max: 10,
                            step: 0.05,
                            value: state.intensity,
                            precision: 2,
                            desc: '光线越强，明暗与阴影对比越强烈',
                        },
                        {
                            key: 'ambient',
                            label: '环境光强度',
                            min: 0,
                            max: 1,
                            step: 0.01,
                            value: state.ambient,
                            precision: 2,
                            desc: '抬高环境光会"冲淡"阴影，使其变浅',
                        },
                        {
                            key: 'azimuth',
                            label: '方位角（°）',
                            min: -180,
                            max: 180,
                            step: 1,
                            value: state.azimuth,
                            precision: 0,
                            desc: '光线在地平面上的朝向，影子随之转向',
                        },
                        {
                            key: 'elevation',
                            label: '仰角（°）',
                            min: 5,
                            max: 85,
                            step: 1,
                            value: state.elevation,
                            precision: 0,
                            desc: '光线与地面的夹角，越小影子越长',
                        },
                    ],
                },
                {
                    key: 'hover',
                    label: '悬浮高度',
                    min: 0,
                    max: 4,
                    step: 0.05,
                    value: state.hover,
                    precision: 2,
                    desc: '几何体底部与地面的间距，越高影子越"飘"',
                },
                {
                    type: 'group',
                    label: '阴影的四个开关',
                    children: [
                        {
                            key: 'enableShadowMap',
                            label: '① renderer.shadowMap.enabled',
                            type: 'checkbox',
                            min: 0,
                            max: 1,
                            step: 1,
                            value: state.enableShadowMap,
                            desc: '渲染器总开关，关闭后其余三项全部失效',
                        },
                        {
                            key: 'lightCast',
                            label: '② light.castShadow',
                            type: 'checkbox',
                            min: 0,
                            max: 1,
                            step: 1,
                            value: state.lightCast,
                            desc: '平行光是否投射阴影，决定"谁能产生影子"',
                        },
                        {
                            key: 'castShadow',
                            label: '③ mesh.castShadow',
                            type: 'checkbox',
                            min: 0,
                            max: 1,
                            step: 1,
                            value: state.castShadow,
                            desc: '几何体是否投下影子，决定"谁投影"',
                        },
                        {
                            key: 'receiveShadow',
                            label: '④ mesh.receiveShadow',
                            type: 'checkbox',
                            min: 0,
                            max: 1,
                            step: 1,
                            value: state.receiveShadow,
                            desc: '地面与几何体是否接收影子，决定"谁被投影"',
                        },
                    ],
                },
                {
                    key: 'radius',
                    label: '阴影半径 radius',
                    min: 0,
                    max: 8,
                    step: 0.5,
                    value: state.radius,
                    precision: 1,
                    desc: '边缘模糊程度，仅 PCF / PCFSoft / VSM 生效',
                },
                {
                    key: 'bias',
                    label: '深度偏移 bias',
                    min: -0.002,
                    max: 0.002,
                    step: 0.0001,
                    value: state.bias,
                    precision: 4,
                    desc: '消除阴影痤疮，通常为很小的负值',
                },
                {
                    key: 'normalBias',
                    label: '法线偏移 normalBias',
                    min: 0,
                    max: 0.1,
                    step: 0.001,
                    value: state.normalBias,
                    precision: 3,
                    desc: '沿法线偏移采样点，同样用于去除自阴影',
                },
                {
                    key: 'camSize',
                    label: '阴影相机范围',
                    min: 2,
                    max: 20,
                    step: 0.5,
                    value: state.camSize,
                    precision: 1,
                    desc: '正交相机的半边长，越小阴影越清晰',
                },
                {
                    key: 'camFar',
                    label: '阴影相机远平面',
                    min: 5,
                    max: 60,
                    step: 1,
                    value: state.camFar,
                    precision: 0,
                    desc: '超出此距离的物体不再投影',
                },
                {
                    key: 'showLightHelper',
                    label: '显示光源方向',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showLightHelper,
                    desc: 'DirectionalLightHelper：黄色方块指示光照方向',
                },
                {
                    key: 'showCamHelper',
                    label: '显示阴影相机 Helper',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.showCamHelper,
                    desc: 'CameraHelper：显示渲染阴影贴图所用的视锥',
                },
            ],
            defaults: {
                intensity: 3,
                ambient: 0.3,
                azimuth: 45,
                elevation: 50,
                hover: 0.8,
                radius: 2,
                bias: -0.0005,
                normalBias: 0.02,
                camSize: 10,
                camFar: 30,
                enableShadowMap: 1,
                lightCast: 1,
                castShadow: 1,
                receiveShadow: 1,
                showLightHelper: 1,
                showCamHelper: 0,
            },
            onChange(key, value) {
                switch (key) {
                    case 'intensity':
                        state.intensity = value;
                        dirLight.intensity = value;
                        break;
                    case 'ambient':
                        state.ambient = value;
                        ambient.intensity = value;
                        break;
                    case 'azimuth':
                        state.azimuth = value;
                        applyDirection();
                        break;
                    case 'elevation':
                        state.elevation = value;
                        applyDirection();
                        break;
                    case 'hover':
                        state.hover = value;
                        applyHover();
                        break;
                    case 'radius':
                        state.radius = value;
                        dirLight.shadow.radius = value;
                        break;
                    case 'bias':
                        state.bias = value;
                        dirLight.shadow.bias = value;
                        break;
                    case 'normalBias':
                        state.normalBias = value;
                        dirLight.shadow.normalBias = value;
                        break;
                    case 'camSize':
                        state.camSize = value;
                        applyShadowCamera();
                        break;
                    case 'camFar':
                        state.camFar = value;
                        applyShadowCamera();
                        break;
                    case 'enableShadowMap':
                        state.enableShadowMap = value;
                        applyShadowMapEnabled();
                        break;
                    case 'lightCast':
                        state.lightCast = value;
                        applyLightCast();
                        break;
                    case 'castShadow':
                        state.castShadow = value;
                        applyObjectCast();
                        break;
                    case 'receiveShadow':
                        state.receiveShadow = value;
                        applyReceive();
                        break;
                    case 'showLightHelper':
                        state.showLightHelper = value;
                        lightHelper.visible = value >= 0.5;
                        break;
                    case 'showCamHelper':
                        state.showCamHelper = value;
                        camHelper.visible = value >= 0.5;
                        break;
                }
            },
        });

        // 阴影贴图分辨率：按钮组
        const sizeGroup = panel.addControlGroup({
            title: '阴影贴图分辨率',
            items: SHADOW_SIZES.map((size) => ({
                label: String(size),
                onClick: () => {
                    mapSize = size;
                    applyMapSize();
                    sizeGroup.sync();
                },
                active: () => mapSize === size,
            })),
        });
        sizeGroup.sync();

        // 过滤类型：按钮组
        const typeGroup = panel.addControlGroup({
            title: '过滤类型',
            items: SHADOW_TYPES.map((t) => ({
                label: t.label,
                onClick: () => {
                    shadowType = t.value;
                    applyShadowType();
                    typeGroup.sync();
                },
                active: () => shadowType === t.value,
            })),
        });
        typeGroup.sync();

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧参数实时调节阴影效果';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 1.5, 0);
        controls.maxPolarAngle = Math.PI / 2 - 0.02; // 不穿到地面之下

        const clock = new THREE.Clock();
        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            const dt = Math.min(clock.getDelta(), 0.1);
            shapes.forEach(({mesh, speed}) => {
                mesh.rotation.y += dt * SPIN_SPEED * speed;
                mesh.rotation.x += dt * SPIN_SPEED * speed * 0.35;
            });
            if (camHelper.visible) camHelper.update();
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            // 阴影贴图由光源单独持有，disposeObject3D 不会遍历到，需显式释放
            dirLight.shadow.map?.dispose();
            panel.remove();
            tip.remove();
        });
    },
};
