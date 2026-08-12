import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {AxesWithLabels} from '../../utils/AxesWithLabels.ts';

const PERSP_FOV = 55;
const CAMERA_POSITION = new THREE.Vector3(20, 14, 20);

export const cameraCompare: Lesson = {
    id: 'camera/perspective-vs-orthographic',
    title: '对比透视相机与正交相机',
    description: `
    <h2>Perspective vs Orthographic</h2>
    <p>同一个场景、两套相机同时渲染：左侧为 <b>透视相机</b>（PerspectiveCamera），右侧为 <b>正交相机</b>（OrthographicCamera）。</p>
    <h3>核心差异</h3>
    <ul>
      <li><b>透视相机</b>：<b>近大远小</b>，符合人眼视觉，离相机远的立方体在画面上更小</li>
      <li><b>正交相机</b>：<b>无近大远小</b>，无论距离远近，立方体在画面上大小完全一致</li>
    </ul>
    <h3>动手试试</h3>
    <p>拖动任意一侧画布旋转视角，<b>另一侧会同步跟随</b>；在任意一侧<b>滚轮缩放</b>，另一侧也会等效缩放——两侧画面中的物体大小始终保持一致，便于直接对比同一角度、同一画面尺寸下两种投影的观感。</p>
    <h3>等效缩放原理</h3>
    <p>两种相机缩放机制不同：透视靠<b>改变相机到目标的距离</b>，正交靠<b>修改 <code>camera.zoom</code></b>。同步时让两侧的"垂直可视高度 H"相等：</p>
    <pre><code>// 透视侧：H = 2 * d * tan(fov / 2)，d 为相机到目标距离
// 正交侧：H = 2 * ORTHO_VIEW / zoom
// 一侧变化时，反解另一侧的 d 或 zoom 使 H 保持一致</code></pre>
    <h3>代码要点</h3>
    <pre><code>// 透视相机：金字塔形视锥
new THREE.PerspectiveCamera(fov, aspect, near, far)

// 正交相机：长方体视锥
new THREE.OrthographicCamera(left, right, top, bottom, near, far)</code></pre>
    <p>两个相机共享同一个 <code>THREE.Scene</code>，拍摄内容完全一致，唯一区别是投影方式。</p>
  `,
    create(container) {
        // 布局：左右两块画布
        const compare = document.createElement('div');
        compare.className = 'camera-compare';
        container.appendChild(compare);

        const perspPane = document.createElement('div');
        perspPane.className = 'camera-pane';
        const orthoPane = document.createElement('div');
        orthoPane.className = 'camera-pane';

        const perspTag = document.createElement('div');
        perspTag.className = 'camera-pane-tag';
        perspTag.innerHTML = '<span class="dot persp"></span>PerspectiveCamera 透视相机';
        perspPane.appendChild(perspTag);

        const orthoTag = document.createElement('div');
        orthoTag.className = 'camera-pane-tag';
        orthoTag.innerHTML = '<span class="dot ortho"></span>OrthographicCamera 正交相机';
        orthoPane.appendChild(orthoTag);

        compare.appendChild(perspPane);
        compare.appendChild(orthoPane);

        // 两个渲染器，分别对应左右画布
        const makeRenderer = (pane: HTMLElement) => {
            const canvas = document.createElement('canvas');
            canvas.style.display = 'block';
            canvas.style.width = '100%';
            canvas.style.height = '100%';
            pane.appendChild(canvas);
            const renderer = new THREE.WebGLRenderer({canvas, antialias: true});
            renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            return renderer;
        };
        const perspRenderer = makeRenderer(perspPane);
        const orthoRenderer = makeRenderer(orthoPane);

        // 共享同一个场景
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x111827);
        scene.add(new THREE.GridHelper(40, 20, 0x475569, 0x1e293b));
        scene.add(new AxesWithLabels(6));

        // 立方体阵列：透视 vs 正交差异一目了然
        const material = new THREE.MeshNormalMaterial();
        const GRID = 10;
        const SPACING = 5;
        for (let ix = 0; ix < GRID; ix++) {
            for (let iz = 0; iz < GRID; iz++) {
                const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
                box.position.set(
                    (ix - (GRID - 1) / 2) * SPACING,
                    0.5,
                    (iz - (GRID - 1) / 2) * SPACING,
                );
                scene.add(box);
            }
        }

        // 原点标记：球心位于世界原点 (0, 0, 0)，帮助对齐两个视图的中心
        const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.3, 24, 24),
            new THREE.MeshBasicMaterial({color: 0xfbbf24}),
        );
        scene.add(marker);

        // 两个相机，初始位置与朝向完全一致
        const perspCamera = new THREE.PerspectiveCamera(PERSP_FOV, 1, 0.1, 2000);
        perspCamera.position.copy(CAMERA_POSITION);
        perspCamera.lookAt(0, 0, 0);

        const ORTHO_VIEW = 16;
        const orthoCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
        orthoCamera.position.copy(CAMERA_POSITION);
        orthoCamera.lookAt(0, 0, 0);

        const updateOrthoFrustum = () => {
            const w = orthoPane.clientWidth || 1;
            const h = orthoPane.clientHeight || 1;
            const aspect = w / h;
            orthoCamera.left = -ORTHO_VIEW * aspect;
            orthoCamera.right = ORTHO_VIEW * aspect;
            orthoCamera.top = ORTHO_VIEW;
            orthoCamera.bottom = -ORTHO_VIEW;
            orthoCamera.updateProjectionMatrix();
        };
        updateOrthoFrustum();

        // 两侧 OrbitControls：任意一侧拖动/滚轮，另一侧同步跟随（位姿 + 等效缩放）
        const perspControls = new OrbitControls(perspCamera, perspRenderer.domElement);
        const orthoControls = new OrbitControls(orthoCamera, orthoRenderer.domElement);
        perspControls.enableDamping = true;
        orthoControls.enableDamping = true;
        perspControls.target.set(0, 0, 0);
        orthoControls.target.set(0, 0, 0);

        // 记住最后一次交互发生在哪一侧，作为缩放同步的基准
        let lastActive: 'persp' | 'ortho' = 'persp';
        perspControls.addEventListener('start', () => {
            lastActive = 'persp';
        });
        orthoControls.addEventListener('start', () => {
            lastActive = 'ortho';
        });

        // 等效缩放：让两侧的"垂直可视高度 H"保持一致
        // 透视侧 H = 2 * d * tan(fov / 2)   （d 为相机到目标距离，缩放表现为距离变化）
        // 正交侧 H = 2 * ORTHO_VIEW / zoom  （缩放表现为 camera.zoom 变化）
        const perspViewHeight = (distance: number) =>
            2 * distance * Math.tan(THREE.MathUtils.degToRad(PERSP_FOV) / 2);
        const orthoViewHeight = (zoom: number) => (2 * ORTHO_VIEW) / zoom;

        // 把某一侧相机的位姿（位置 + 朝向 + 观察目标）复制给另一侧
        const copyPose = (
            fromCam: THREE.PerspectiveCamera | THREE.OrthographicCamera,
            fromControls: OrbitControls,
            toCam: THREE.PerspectiveCamera | THREE.OrthographicCamera,
            toControls: OrbitControls,
        ) => {
            toCam.position.copy(fromCam.position);
            toCam.quaternion.copy(fromCam.quaternion);
            toControls.target.copy(fromControls.target);
        };

        // 以透视侧为基准：把它当前的视锥高度换算成正交 zoom
        const syncFromPersp = () => {
            copyPose(perspCamera, perspControls, orthoCamera, orthoControls);
            const distance = perspCamera.position.distanceTo(perspControls.target);
            orthoCamera.zoom = (2 * ORTHO_VIEW) / perspViewHeight(distance);
            orthoCamera.updateProjectionMatrix();
        };

        // 以正交侧为基准：把它当前的视锥高度换算成透视相机的目标距离
        const syncFromOrtho = () => {
            const height = orthoViewHeight(orthoCamera.zoom);
            const distance = height / (2 * Math.tan(THREE.MathUtils.degToRad(PERSP_FOV) / 2));
            const dir = new THREE.Vector3()
                .subVectors(orthoControls.target, orthoCamera.position)
                .normalize();
            perspCamera.position.copy(orthoControls.target).addScaledVector(dir, -distance);
            perspCamera.quaternion.copy(orthoCamera.quaternion);
            perspControls.target.copy(orthoControls.target);
            // 保持两侧位姿一致
            orthoCamera.position.copy(perspCamera.position);
            orthoCamera.quaternion.copy(perspCamera.quaternion);
        };

        const syncAll = () => {
            if (lastActive === 'ortho') syncFromOrtho();
            else syncFromPersp();
        };
        perspControls.addEventListener('change', syncAll);
        orthoControls.addEventListener('change', syncAll);
        // 初始统一两侧画面大小
        syncFromPersp();

        const onResize = () => {
            const pw = perspPane.clientWidth || 1;
            const ph = perspPane.clientHeight || 1;
            perspRenderer.setSize(pw, ph, false);
            perspCamera.aspect = pw / ph;
            perspCamera.updateProjectionMatrix();

            const ow = orthoPane.clientWidth || 1;
            const oh = orthoPane.clientHeight || 1;
            orthoRenderer.setSize(ow, oh, false);
            updateOrthoFrustum();
        };
        const observer = new ResizeObserver(onResize);
        observer.observe(container);
        onResize();

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            perspControls.update();
            orthoControls.update();
            perspRenderer.render(scene, perspCamera);
            orthoRenderer.render(scene, orthoCamera);
        };
        loop();

        return () => {
            cancelAnimationFrame(raf);
            observer.disconnect();
            perspControls.dispose();
            orthoControls.dispose();
            perspRenderer.dispose();
            orthoRenderer.dispose();
            perspRenderer.domElement.remove();
            orthoRenderer.domElement.remove();
            compare.remove();
        };
    },
};
