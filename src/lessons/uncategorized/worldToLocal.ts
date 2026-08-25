import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';
import {LabeledAxesHelper} from '../../utils/LabeledAxesHelper.ts';

/** 生成字母贴片组：透明背景、只画字母，贴在盒子的六个面（±X/±Y/±Z）中心，从上下左右前后都能看到。 */
function makeLetterPatches(letter: string, color: string, size: number): THREE.Group {
    const canvasSize = 256;
    const canvas = document.createElement('canvas');
    canvas.width = canvasSize;
    canvas.height = canvasSize;
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, canvasSize, canvasSize);
    c.fillStyle = color;
    c.font = 'bold 170px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(letter, canvasSize / 2, canvasSize / 2 + 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
    });

    const half = size / 2;
    const patchSize = size * 0.6;
    // 六个面：position（贴在表面外一点）+ 朝向（通过 lookAt 让平面正对法线外侧）
    const faces = [
        {pos: [0, 0, half + 0.002], look: [0, 0, 1]}, // +Z 前
        {pos: [0, 0, -half - 0.002], look: [0, 0, -1]}, // -Z 后
        {pos: [half + 0.002, 0, 0], look: [1, 0, 0]}, // +X 右
        {pos: [-half - 0.002, 0, 0], look: [-1, 0, 0]}, // -X 左
        {pos: [0, half + 0.002, 0], look: [0, 1, 0]}, // +Y 上
        {pos: [0, -half - 0.002, 0], look: [0, -1, 0]}, // -Y 下
    ];

    const group = new THREE.Group();
    faces.forEach((f) => {
        const geo = new THREE.PlaneGeometry(patchSize, patchSize);
        const mesh = new THREE.Mesh(geo, material);
        mesh.position.set(f.pos[0], f.pos[1], f.pos[2]);
        mesh.lookAt(f.look[0], f.look[1], f.look[2]);
        mesh.renderOrder = 999;
        group.add(mesh);
    });
    // 记录材质/纹理便于统一释放
    group.userData.material = material;
    group.userData.texture = texture;
    return group;
}

export const worldToLocal: Lesson = {
    id: 'uncategorized/world-to-local',
    title: 'worldToLocal 世界转本地坐标',
    description: `
    <h2>Object3D.worldToLocal</h2>
    <p><code>worldToLocal(vector)</code> 将一个处于<strong>世界坐标系</strong>中的点，转换为该物体<strong>自身本地坐标系</strong>中的坐标。它内部会应用物体世界矩阵的逆矩阵 <code>matrixWorld.invert()</code>。</p>
    <pre><code>const local = mesh.worldToLocal(worldPoint.clone());
// worldPoint 是世界坐标中的点
// local 是相对 mesh 本地原点（含 position/rotation/scale）后的坐标</code></pre>
    <p>与之对应的是 <code>localToWorld(vector)</code>，方向相反。下面场景有三个点 A、B、C，构成父子层级 <code>A → B → C</code>（A 是 B 的父级，B 是 C 的父级）。其中 A 点代表<strong>原点</strong>（本地坐标系的 (0,0,0)）。用三条 <code>ArrowHelper</code> 箭头分别表示：白色 A→B、粉色 A→C（二者标签都是相对 A 的世界坐标），蓝色 B→C（标签是 C 相对 B 的<strong>本地坐标</strong>，即 C 的 position）。你可以用右侧参数设定各点的本地坐标，观察点 C 的世界坐标，以及把 C 的世界坐标用 <code>A.worldToLocal()</code> 转回 A 本地坐标系的结果。</p>
    `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
        camera.position.set(8.5, 8.5, 10.5);
        camera.lookAt(2, 2, -1); // 默认注视方块 B（其初始世界坐标）
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        ctx.scene.add(new THREE.AmbientLight(0xffffff, 1.4));
        const point = new THREE.PointLight(0xffffff, 1.5, 50);
        point.position.set(5, 8, 5);
        ctx.scene.add(point);

        // 网格与地面参考
        const grid = new THREE.GridHelper(20, 20, 0x64748b, 0x334155);
        ctx.scene.add(grid);

        // 带标签的坐标轴辅助器（X 红 / Y 绿 / Z 蓝），位于原点
        const labeledAxes = new LabeledAxesHelper(6);
        ctx.scene.add(labeledAxes);

        // 三个点构成层级：A → B → C（A 是 B 的父级，B 是 C 的父级）
        // A 点代表原点：放在世界原点并固定为本地 (0,0,0)
        const A = new THREE.Object3D();
        A.position.set(0, 0, 0);
        ctx.scene.add(A);

        const B = new THREE.Object3D();
        B.position.set(2, 1, 0); // 相对 A 的本地坐标
        A.add(B);

        const C = new THREE.Object3D();
        C.position.set(1.5, 0, 1); // 相对 B 的本地坐标
        B.add(C);

        // 三个可视化小盒子：盒子用纯色，字母作为透明贴片贴在六个面中心
        const boxA = new THREE.Mesh(
            new THREE.BoxGeometry(0.44, 0.44, 0.44),
            new THREE.MeshStandardMaterial({color: 0xfacc15, emissive: 0x713f12, emissiveIntensity: 0.25}),
        );
        A.add(boxA);
        const patchA = makeLetterPatches('A', '#ffffff', 0.44);
        boxA.add(patchA);

        const boxB = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.36, 0.36),
            new THREE.MeshStandardMaterial({color: 0x38bdf8, emissive: 0x0c4a6e, emissiveIntensity: 0.25}),
        );
        B.add(boxB);
        const patchB = makeLetterPatches('B', '#ffffff', 0.36);
        boxB.add(patchB);

        const boxC = new THREE.Mesh(
            new THREE.BoxGeometry(0.36, 0.36, 0.36),
            new THREE.MeshStandardMaterial({color: 0xf472b6, emissive: 0x831843, emissiveIntensity: 0.25}),
        );
        C.add(boxC);
        const patchC = makeLetterPatches('C', '#ffffff', 0.36);
        boxC.add(patchC);

        // 创建一个「从起点指向目标」的箭头（不带文字）
        const makeArrow = (color: number) => {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(),
                1,
                color,
                0.25,
                0.15,
            );
            ctx.scene.add(arrow);

            const update = (from: THREE.Vector3, to: THREE.Vector3) => {
                const rel = to.clone().sub(from);
                const dir = rel.clone().normalize();
                const len = rel.length();
                if (len > 1e-4) {
                    arrow.position.copy(from);
                    arrow.setDirection(dir);
                    arrow.setLength(len, Math.min(0.25, len * 0.3), Math.min(0.15, len * 0.18));
                    arrow.visible = true;
                } else {
                    arrow.visible = false;
                }
            };

            return {arrow, update};
        };

        const abArrow = makeArrow(0xffffff); // A → B
        const acArrow = makeArrow(0xf472b6); // A → C
        const bcArrow = makeArrow(0x38bdf8); // B → C

        // 方块下方的标签：永远朝向镜头，显示该方块的世界坐标与局部坐标
        const makeBoxLabel = () => {
            // 用较高分辨率画布保证靠近镜头时文字依然清晰
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 288;
            const tex = new THREE.CanvasTexture(canvas);
            tex.colorSpace = THREE.SRGBColorSpace;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            const sprite = new THREE.Sprite(
                new THREE.SpriteMaterial({map: tex, transparent: true, depthTest: false}),
            );
            sprite.renderOrder = 1001;
            sprite.scale.set(1.3, 0.73, 1);
            const setText = (world: THREE.Vector3, local: THREE.Vector3) => {
                const c = canvas.getContext('2d')!;
                c.clearRect(0, 0, canvas.width, canvas.height);
                c.fillStyle = '#ffffff';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.font = '34px sans-serif';
                c.fillText(`局部坐标: (${local.x.toFixed(2)}, ${local.y.toFixed(2)}, ${local.z.toFixed(2)})`, canvas.width / 2, 132);
                c.fillText(`世界坐标: (${world.x.toFixed(2)}, ${world.y.toFixed(2)}, ${world.z.toFixed(2)})`, canvas.width / 2, 216);
                tex.needsUpdate = true;
            };
            return {sprite, tex, setText};
        };

        const labelA = makeBoxLabel();
        labelA.sprite.position.set(0, -0.38, 0);
        boxA.add(labelA.sprite);
        const labelB = makeBoxLabel();
        labelB.sprite.position.set(0, -0.34, 0);
        boxB.add(labelB.sprite);
        const labelC = makeBoxLabel();
        labelC.sprite.position.set(0, -0.34, 0);
        boxC.add(labelC.sprite);

        // 状态：A 点位置(原点基准) 与 B、C 各自的本地坐标偏移（B、C 初始随机）
        // 初始位置（供重置按钮恢复）
        const initialState = {
            aX: 0,
            aY: 0,
            aZ: 0,
            bX: 2,
            bY: 2,
            bZ: -1,
            cX: 2,
            cY: -1,
            cZ: 2,
        };
        const state = {...initialState};

        // 显示转换结果文字
        const readout = document.createElement('div');
        readout.style.cssText =
            'position:absolute;left:16px;top:14px;color:#e2e8f0;font-size:13px;line-height:1.6;pointer-events:none;background:rgba(0,0,0,.35);padding:8px 10px;border-radius:8px;';
        container.appendChild(readout);

        const applyAndShow = () => {
            // A 点作为原点基准（可平移演示）
            A.position.set(state.aX, state.aY, state.aZ);
            // B 相对 A 的本地坐标
            B.position.set(state.bX, state.bY, state.bZ);
            // C 相对 B 的本地坐标
            C.position.set(state.cX, state.cY, state.cZ);
            A.updateMatrixWorld(true);

            // 更新 A→B、A→C 箭头（标签显示各自相对 A 的世界坐标）
            const aWorld = new THREE.Vector3();
            const bWorld = new THREE.Vector3();
            const cWorld = new THREE.Vector3();
            A.getWorldPosition(aWorld);
            B.getWorldPosition(bWorld);
            C.getWorldPosition(cWorld);

            abArrow.update(aWorld, bWorld);
            acArrow.update(aWorld, cWorld);
            bcArrow.update(bWorld, cWorld);

            // 每个方块下方的标签：世界坐标 + 局部坐标
            // A 的局部坐标 = 相对父级（场景原点）的 position
            labelA.setText(aWorld, A.position);
            labelB.setText(bWorld, B.position);
            labelC.setText(cWorld, C.position);

            // 把 C 的世界坐标转回 A 的本地坐标系（相对原点的偏移）
            const localInA = A.worldToLocal(cWorld.clone());

            readout.innerHTML =
                `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="display:inline-block;width:16px;height:16px;background-color:#facc15;border-radius:2px;border:1px solid rgba(255,255,255,.3);"></span><strong>方块A</strong></div>` +
                `局部坐标: (${A.position.x.toFixed(2)}, ${A.position.y.toFixed(2)}, ${A.position.z.toFixed(2)})<br>` +
                `世界坐标: (${aWorld.x.toFixed(2)}, ${aWorld.y.toFixed(2)}, ${aWorld.z.toFixed(2)})<br><br>` +
                `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="display:inline-block;width:16px;height:16px;background-color:#38bdf8;border-radius:2px;border:1px solid rgba(255,255,255,.3);"></span><strong>方块B</strong></div>` +
                `局部坐标: (${B.position.x.toFixed(2)}, ${B.position.y.toFixed(2)}, ${B.position.z.toFixed(2)})<br>` +
                `世界坐标: (${bWorld.x.toFixed(2)}, ${bWorld.y.toFixed(2)}, ${bWorld.z.toFixed(2)})<br><br>` +
                `<div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;"><span style="display:inline-block;width:16px;height:16px;background-color:#f472b6;border-radius:2px;border:1px solid rgba(255,255,255,.3);"></span><strong>方块C</strong></div>` +
                `局部坐标: (${C.position.x.toFixed(2)}, ${C.position.y.toFixed(2)}, ${C.position.z.toFixed(2)})<br>` +
                `世界坐标: (${cWorld.x.toFixed(2)}, ${cWorld.y.toFixed(2)}, ${cWorld.z.toFixed(2)})`;
        };
        applyAndShow();

        // 参数面板：不含滑块，仅保留一个「重置参数」按钮
        const panel = createParamPanel({
            container,
            controls: [],
            defaults: {},
            onReset() {
                Object.assign(state, initialState);
                applyAndShow();
            },
        });

        // 同步 state 到面板显示（当前面板无滑块，调用为空操作）
        const syncPanel = () => {
            panel.setDisplay('aX', state.aX);
            panel.setDisplay('bY', state.bY);
            panel.setDisplay('cZ', state.cZ);
        };

        // 拖拽 B、C 球：射线拾取 + 在朝向相机的平面上移动，落点转回各自的本地坐标
        const raycaster = new THREE.Raycaster();
        const pointer = new THREE.Vector2();
        const dragPlane = new THREE.Plane();
        const dragOffset = new THREE.Vector3();
        const hitPoint = new THREE.Vector3();
        const planeNormal = new THREE.Vector3();
        let dragTarget: 'B' | 'C' | null = null;
        const dom = ctx.renderer.domElement;
        const round1 = (n: number) => Math.round(n * 10) / 10;

        const setPointer = (e: PointerEvent) => {
            const rect = dom.getBoundingClientRect();
            pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
        };

        const onPointerDown = (e: PointerEvent) => {
            setPointer(e);
            raycaster.setFromCamera(pointer, camera);
            const hits = raycaster.intersectObjects([boxB, boxC], false);
            if (hits.length === 0) return;
            const hit = hits[0];
            dragTarget = hit.object === boxB ? 'B' : 'C';
            controls.enabled = false;
            dom.setPointerCapture(e.pointerId);
            // 拖拽平面：过盒子中心、法线朝向相机
            const target = dragTarget === 'B' ? boxB : boxC;
            const targetWorld = new THREE.Vector3();
            target.getWorldPosition(targetWorld);
            camera.getWorldDirection(planeNormal);
            dragPlane.setFromNormalAndCoplanarPoint(planeNormal, targetWorld);
            // 记录抓取点与球心的偏移，避免跳变
            raycaster.ray.intersectPlane(dragPlane, hitPoint);
            dragOffset.copy(targetWorld).sub(hitPoint);
            dom.style.cursor = 'grabbing';
        };

        const onPointerMove = (e: PointerEvent) => {
            setPointer(e);
            if (!dragTarget) {
                // 悬停在可拖拽球上时给出抓取光标
                raycaster.setFromCamera(pointer, camera);
                const hover = raycaster.intersectObjects([boxB, boxC], false);
                dom.style.cursor = hover.length ? 'grab' : '';
                return;
            }
            raycaster.setFromCamera(pointer, camera);
            if (!raycaster.ray.intersectPlane(dragPlane, hitPoint)) return;
            const world = hitPoint.clone().add(dragOffset);
            if (dragTarget === 'B') {
                const local = A.worldToLocal(world); // B 的父级是 A
                state.bX = round1(local.x);
                state.bY = round1(local.y);
                state.bZ = round1(local.z);
            } else {
                const local = B.worldToLocal(world); // C 的父级是 B
                state.cX = round1(local.x);
                state.cY = round1(local.y);
                state.cZ = round1(local.z);
            }
            applyAndShow();
            syncPanel();
        };

        const endDrag = (e: PointerEvent) => {
            if (!dragTarget) return;
            dragTarget = null;
            controls.enabled = true;
            dom.style.cursor = '';
            try {
                dom.releasePointerCapture(e.pointerId);
            } catch {
                /* ignore */
            }
        };

        dom.addEventListener('pointerdown', onPointerDown);
        dom.addEventListener('pointermove', onPointerMove);
        dom.addEventListener('pointerup', endDrag);
        dom.addEventListener('pointercancel', endDrag);

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动空白处环绕观察 · 按住 B(蓝) 或 C(粉) 球可直接拖动它们的位置，左侧实时显示 C 的世界坐标与相对 A 原点的本地坐标';
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
            dom.removeEventListener('pointerdown', onPointerDown);
            dom.removeEventListener('pointermove', onPointerMove);
            dom.removeEventListener('pointerup', endDrag);
            dom.removeEventListener('pointercancel', endDrag);
            grid.geometry.dispose();
            (grid.material as THREE.Material).dispose();
            // 释放带标签坐标轴辅助器：Line2 线 + X/Y/Z 标签精灵
            labeledAxes.traverse((obj) => {
                const anyObj = obj as THREE.Object3D & {
                    geometry?: THREE.BufferGeometry;
                    material?: THREE.Material | THREE.Material[];
                };
                if (anyObj.geometry) anyObj.geometry.dispose();
                const mat = anyObj.material;
                if (mat) {
                    (Array.isArray(mat) ? mat : [mat]).forEach((m) => {
                        const map = (m as THREE.MeshBasicMaterial | THREE.SpriteMaterial).map;
                        if (map) map.dispose();
                        m.dispose();
                    });
                }
            });
            abArrow.arrow.dispose();
            acArrow.arrow.dispose();
            bcArrow.arrow.dispose();
            labelA.sprite.material.dispose();
            labelA.tex.dispose();
            labelB.sprite.material.dispose();
            labelB.tex.dispose();
            labelC.sprite.material.dispose();
            labelC.tex.dispose();
            boxA.geometry.dispose();
            (boxA.material as THREE.Material).dispose();
            patchA.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
            (patchA.userData.material as THREE.Material).dispose();
            (patchA.userData.texture as THREE.Texture).dispose();

            boxB.geometry.dispose();
            (boxB.material as THREE.Material).dispose();
            patchB.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
            (patchB.userData.material as THREE.Material).dispose();
            (patchB.userData.texture as THREE.Texture).dispose();

            boxC.geometry.dispose();
            (boxC.material as THREE.Material).dispose();
            patchC.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
            (patchC.userData.material as THREE.Material).dispose();
            (patchC.userData.texture as THREE.Texture).dispose();
            panel.remove();
            readout.remove();
            tip.remove();
        });
    },
};
