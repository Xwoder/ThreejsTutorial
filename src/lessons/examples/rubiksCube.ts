import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;

// 标准三阶魔方的六个面颜色（左、右、上、下、前、后）
const FACE_COLORS = {
    left: 0xff5b5b, // 红
    right: 0xffa53b, // 橙
    up: 0xffffff, // 白
    down: 0xffe14d, // 黄
    front: 0x4dd04d, // 绿
    back: 0x4d6bff, // 蓝
};
const INNER_COLOR = 0x1f2937; // 内部黑色
const GAP = 0.04; // 小方块之间的缝隙
const SIZE = 1; // 单个小方块边长

/**
 * 创建 3×3×3 魔方。
 * 每个位置 (x, y, z) ∈ {-1, 0, 1}^3 放置一个带 6 面材质的小立方体，
 * 仅当该面朝向魔方外侧时着色，内部面使用黑色，从而表现出真实魔方外观。
 */
function createCubeGroup(): THREE.Group {
    const group = new THREE.Group();
    const geo = new THREE.BoxGeometry(SIZE - GAP, SIZE - GAP, SIZE - GAP);

    for (let x = -1; x <= 1; x++) {
        for (let y = -1; y <= 1; y++) {
            for (let z = -1; z <= 1; z++) {
                // BoxGeometry 材质顺序：+x, -x, +y, -y, +z, -z
                const materials = [
                    new THREE.MeshStandardMaterial({
                        color: x === 1 ? FACE_COLORS.right : INNER_COLOR,
                        roughness: 0.85,
                        metalness: 0.0
                    }),
                    new THREE.MeshStandardMaterial({
                        color: x === -1 ? FACE_COLORS.left : INNER_COLOR,
                        roughness: 0.85,
                        metalness: 0.0
                    }),
                    new THREE.MeshStandardMaterial({
                        color: y === 1 ? FACE_COLORS.up : INNER_COLOR,
                        roughness: 0.85,
                        metalness: 0.0
                    }),
                    new THREE.MeshStandardMaterial({
                        color: y === -1 ? FACE_COLORS.down : INNER_COLOR,
                        roughness: 0.85,
                        metalness: 0.0
                    }),
                    new THREE.MeshStandardMaterial({
                        color: z === 1 ? FACE_COLORS.front : INNER_COLOR,
                        roughness: 0.85,
                        metalness: 0.0
                    }),
                    new THREE.MeshStandardMaterial({
                        color: z === -1 ? FACE_COLORS.back : INNER_COLOR,
                        roughness: 0.85,
                        metalness: 0.0
                    }),
                ];
                const cube = new THREE.Mesh(geo, materials);
                cube.position.set(x * SIZE, y * SIZE, z * SIZE);
                group.add(cube);
            }
        }
    }
    return group;
}

export const rubiksCube: Lesson = {
    id: 'examples/example-rubiks-cube',
    title: '三阶魔方',
    description: `
    <h2>三阶魔方</h2>
    <p>用 27 个带 6 面材质的小立方体拼出经典三阶魔方。每个小立方体只有在朝向魔方外表面的那一面才着色，内部为黑色，从而获得真实外观。</p>
    <h3>交互方式</h3>
    <ul>
      <li><b>U / D</b>：旋转上 / 下层（绕 Y 轴）</li>
      <li><b>L / R</b>：旋转左 / 右层（绕 X 轴）</li>
      <li><b>F / B</b>：旋转前 / 后层（绕 Z 轴）</li>
      <li>按住 <b>Shift</b> 反向旋转</li>
      <li><b>空格</b>：随机打乱</li>
    </ul>
    <p>也可以用鼠标拖动环绕观察，滚轮缩放。旋转采用四元数插值动画，结束后把小立方体重新挂回魔方根节点并修正坐标，保证后续旋转始终基于世界坐标分层。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, 0x0b1020);

        // 程序化环境贴图，为材质提供反射，产生光泽感
        const pmrem = new THREE.PMREMGenerator(ctx.renderer);
        ctx.scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        ctx.scene.environmentIntensity = 0.4; // 降低环境反射亮度

        const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
        camera.position.set(5, 5, 7);

        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dir = new THREE.DirectionalLight(0xffffff, 1.2);
        dir.position.set(5, 8, 6);
        ctx.scene.add(dir);
        const dir2 = new THREE.DirectionalLight(0xffffff, 0.5);
        dir2.position.set(-6, -3, -5);
        ctx.scene.add(dir2);

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        const cube = createCubeGroup();
        ctx.scene.add(cube);

        // 适配尺寸：让相机的宽高比跟随容器
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        // ---- 旋转逻辑 ----
        // 当前是否正在播放动画，动画期间忽略新的旋转请求
        let busy = false;

        /** 选择某一层的所有小立方体（按世界坐标判断） */
        function getLayer(axis: 'x' | 'y' | 'z', value: number): THREE.Mesh[] {
            const result: THREE.Mesh[] = [];
            cube.children.forEach((child) => {
                const v = (child as THREE.Mesh).getWorldPosition(new THREE.Vector3())[axis];
                if (Math.abs(v - value * SIZE) < 0.1) result.push(child as THREE.Mesh);
            });
            return result;
        }

        /**
         * 绕指定轴的某层旋转 angle 弧度，带动画。
         * axis: 'x' | 'y' | 'z'，layer: -1 | 0 | 1，direction: 1 或 -1。
         */
        function rotateLayer(axis: 'x' | 'y' | 'z', layer: number, angle: number, onDone?: () => void) {
            if (busy) return;
            busy = true;

            const pieces = getLayer(axis, layer);
            const pivot = new THREE.Group();
            ctx.scene.add(pivot);
            pieces.forEach((p) => pivot.attach(p)); // attach 保持世界变换

            const axisVec = new THREE.Vector3(
                axis === 'x' ? 1 : 0,
                axis === 'y' ? 1 : 0,
                axis === 'z' ? 1 : 0,
            );
            const startQuat = pivot.quaternion.clone();
            const deltaQuat = new THREE.Quaternion().setFromAxisAngle(axisVec, angle);
            const endQuat = startQuat.clone().multiply(deltaQuat);

            const duration = 260;
            const t0 = performance.now();
            const animate = () => {
                const t = Math.min((performance.now() - t0) / duration, 1);
                // easeInOutQuad
                const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
                pivot.quaternion.copy(startQuat).slerp(endQuat, e);
                if (t < 1) {
                    requestAnimationFrame(animate);
                } else {
                    // 把小立方体放回魔方根节点，保持旋转后的世界位置/朝向
                    pieces.forEach((p) => {
                        cube.attach(p);
                        // 四舍五入修正坐标，避免浮点漂移累积
                        p.position.set(
                            Math.round(p.position.x / SIZE) * SIZE,
                            Math.round(p.position.y / SIZE) * SIZE,
                            Math.round(p.position.z / SIZE) * SIZE,
                        );
                    });
                    ctx.scene.remove(pivot);
                    busy = false;
                    onDone?.();
                }
            };
            animate();
        }

        // 面 + 方向 → (轴, 层, 角度)
        function faceMove(face: string, reverse: boolean) {
            const amount = reverse ? -Math.PI / 2 : Math.PI / 2;
            switch (face) {
                case 'U':
                    rotateLayer('y', 1, amount);
                    break;
                case 'D':
                    rotateLayer('y', -1, -amount);
                    break;
                case 'L':
                    rotateLayer('x', -1, amount);
                    break;
                case 'R':
                    rotateLayer('x', 1, -amount);
                    break;
                case 'F':
                    rotateLayer('z', 1, -amount);
                    break;
                case 'B':
                    rotateLayer('z', -1, amount);
                    break;
            }
        }

        // 随机打乱
        function shuffle() {
            if (busy) return;
            const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
            let remaining = 20;
            const step = () => {
                if (remaining <= 0) return;
                const f = faces[Math.floor(Math.random() * faces.length)];
                faceMove(f, Math.random() > 0.5);
                remaining--;
                const id = setInterval(() => {
                    clearInterval(id);
                    step();
                }, 270);
            };
            step();
        }

        const onKey = (e: KeyboardEvent) => {
            const reverse = e.shiftKey;
            switch (e.key.toLowerCase()) {
                case 'u':
                    faceMove('U', reverse);
                    break;
                case 'd':
                    faceMove('D', reverse);
                    break;
                case 'l':
                    faceMove('L', reverse);
                    break;
                case 'r':
                    faceMove('R', reverse);
                    break;
                case 'f':
                    faceMove('F', reverse);
                    break;
                case 'b':
                    faceMove('B', reverse);
                    break;
                case ' ':
                    e.preventDefault();
                    shuffle();
                    break;
            }
        };
        window.addEventListener('keydown', onKey);

        // 提示 UI
        const tip = document.createElement('div');
        tip.textContent = 'U/D/L/R/F/B 旋转 · Shift 反向 · 空格打乱';
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
            window.removeEventListener('keydown', onKey);
            tip.remove();
        });
    },
};
