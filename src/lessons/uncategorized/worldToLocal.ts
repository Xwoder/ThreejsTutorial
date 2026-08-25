import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

/** 生成字母贴片组：透明背景、只画字母，贴在球的六个方向（±X/±Y/±Z）各一小块球冠上，
 *  每块经纬度跨度很小、近似平面，字母几乎不变形，从上下左右前后都能看到。 */
function makeLetterPatches(letter: string, color: string, radius: number): THREE.Group {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const c = canvas.getContext('2d')!;
    c.clearRect(0, 0, size, size);
    c.fillStyle = color;
    c.font = 'bold 170px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(letter, size / 2, size / 2 + 8);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
    });

    // 六个方向对应的球面瓦片参数（phi=经度, theta=纬度），d 控制瓦片大小
    const d = Math.PI * 0.16;
    const dirs = [
        {phiStart: Math.PI / 2 - d, phiLength: d * 2, thetaStart: Math.PI / 2 - d, thetaLength: d * 2}, // +Z 前
        {phiStart: -Math.PI / 2 - d, phiLength: d * 2, thetaStart: Math.PI / 2 - d, thetaLength: d * 2}, // -Z 后
        {phiStart: Math.PI - d, phiLength: d * 2, thetaStart: Math.PI / 2 - d, thetaLength: d * 2}, // +X 右
        {phiStart: -d, phiLength: d * 2, thetaStart: Math.PI / 2 - d, thetaLength: d * 2}, // -X 左
        {phiStart: 0, phiLength: d * 2, thetaStart: 0, thetaLength: d * 2}, // +Y 上
        {phiStart: 0, phiLength: d * 2, thetaStart: Math.PI - d * 2, thetaLength: d * 2}, // -Y 下
    ];

    const group = new THREE.Group();
    dirs.forEach((a) => {
        const geo = new THREE.SphereGeometry(
            radius * 1.002,
            24,
            16,
            a.phiStart,
            a.phiLength,
            a.thetaStart,
            a.thetaLength,
        );
        const mesh = new THREE.Mesh(geo, material);
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

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(7, 6, 9);
        camera.lookAt(0, 0, 0);
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

        // 三个可视化小球：球用纯色，字母作为透明贴片贴在六个方向球冠上
        const sphereA = new THREE.Mesh(
            new THREE.SphereGeometry(0.22, 48, 48),
            new THREE.MeshStandardMaterial({color: 0xfacc15, emissive: 0x713f12, emissiveIntensity: 0.25}),
        );
        A.add(sphereA);
        const patchA = makeLetterPatches('A', '#ffffff', 0.22);
        sphereA.add(patchA);

        const sphereB = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 48, 48),
            new THREE.MeshStandardMaterial({color: 0x38bdf8, emissive: 0x0c4a6e, emissiveIntensity: 0.25}),
        );
        B.add(sphereB);
        const patchB = makeLetterPatches('B', '#ffffff', 0.18);
        sphereB.add(patchB);

        const sphereC = new THREE.Mesh(
            new THREE.SphereGeometry(0.18, 48, 48),
            new THREE.MeshStandardMaterial({color: 0xf472b6, emissive: 0x831843, emissiveIntensity: 0.25}),
        );
        C.add(sphereC);
        const patchC = makeLetterPatches('C', '#ffffff', 0.18);
        sphereC.add(patchC);

        // 创建一个「从起点指向目标」的箭头 + 沿箭柄方向显示坐标的标签
        const makeArrowWithLabel = (color: number) => {
            const arrow = new THREE.ArrowHelper(
                new THREE.Vector3(1, 0, 0),
                new THREE.Vector3(),
                1,
                color,
                0.25,
                0.15,
            );
            ctx.scene.add(arrow);

            const labelCanvas = document.createElement('canvas');
            labelCanvas.width = 512;
            labelCanvas.height = 128;
            const labelTex = new THREE.CanvasTexture(labelCanvas);
            labelTex.colorSpace = THREE.SRGBColorSpace;
            labelTex.minFilter = THREE.LinearFilter;
            const label = new THREE.Mesh(
                new THREE.PlaneGeometry(1.3, 0.32),
                new THREE.MeshBasicMaterial({
                    map: labelTex,
                    transparent: true,
                    depthTest: false,
                    side: THREE.DoubleSide,
                }),
            );
            label.renderOrder = 1000;
            ctx.scene.add(label);

            const setLabel = (rel: THREE.Vector3) => {
                const c = labelCanvas.getContext('2d')!;
                c.clearRect(0, 0, labelCanvas.width, labelCanvas.height);
                c.fillStyle = '#ffffff';
                c.font = 'bold 26px sans-serif';
                c.textAlign = 'center';
                c.textBaseline = 'middle';
                c.fillText(
                    `(${rel.x.toFixed(2)}, ${rel.y.toFixed(2)}, ${rel.z.toFixed(2)})`,
                    labelCanvas.width / 2,
                    labelCanvas.height / 2,
                );
                labelTex.needsUpdate = true;
            };

            // 更新箭头与标签：from、to 为世界坐标；labelRel 为标签要显示的相对坐标（默认用世界差）
            const update = (
                from: THREE.Vector3,
                to: THREE.Vector3,
                labelRel: THREE.Vector3 = to.clone().sub(from),
            ) => {
                const rel = to.clone().sub(from);
                const dir = rel.clone();
                const len = dir.length();
                if (len > 1e-4) {
                    arrow.position.copy(from);
                    arrow.setDirection(dir.normalize());
                    arrow.setLength(len, Math.min(0.25, len * 0.3), Math.min(0.15, len * 0.18));
                    arrow.visible = true;
                    label.position.copy(from).add(to).multiplyScalar(0.5).add(new THREE.Vector3(0, 0.08, 0));
                    label.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), dir.clone().normalize());
                    label.visible = true;
                    setLabel(labelRel);
                } else {
                    arrow.visible = false;
                    label.visible = false;
                }
            };

            return {arrow, label, labelTex, update};
        };

        const abArrow = makeArrowWithLabel(0xffffff); // A → B
        const acArrow = makeArrowWithLabel(0xf472b6); // A → C
        const bcArrow = makeArrowWithLabel(0x38bdf8); // B → C

        // 状态：A 点位置(原点基准) 与 B、C 各自的本地坐标偏移（B、C 初始随机）
        const state = {
            aX: 0,
            aY: 0,
            aZ: 0,
            bX: 1,
            bY: 2,
            bZ: 3,
            cX: 1,
            cY: 1,
            cZ: 1,
        };

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
            // B → C：箭头从 B 指向 C（世界坐标），标签显示 C 相对 B 的本地坐标（即 C.position）
            bcArrow.update(bWorld, cWorld, C.position.clone());

            // 把 C 的世界坐标转回 A 的本地坐标系（相对原点的偏移）
            const localInA = A.worldToLocal(cWorld.clone());

            readout.innerHTML =
                `C 的世界坐标: (${cWorld.x.toFixed(2)}, ${cWorld.y.toFixed(2)}, ${cWorld.z.toFixed(2)})<br>` +
                `A 点(原点) position: (${A.position.x.toFixed(2)}, ${A.position.y.toFixed(2)}, ${A.position.z.toFixed(2)})<br>` +
                `B 本地坐标(相对A): (${B.position.x.toFixed(2)}, ${B.position.y.toFixed(2)}, ${B.position.z.toFixed(2)})<br>` +
                `C 本地坐标(相对B): (${C.position.x.toFixed(2)}, ${C.position.y.toFixed(2)}, ${C.position.z.toFixed(2)})<br>` +
                `<strong style="color:#f472b6">C 相对A原点(A.worldToLocal): (${localInA.x.toFixed(2)}, ${localInA.y.toFixed(2)}, ${localInA.z.toFixed(2)})</strong>`;
        };
        applyAndShow();

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'aX',
                    label: 'A 点 X（原点）',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.aX,
                    precision: 1,
                    desc: 'A 点(原点) 的世界 X',
                },
                {
                    key: 'aY',
                    label: 'A 点 Y（原点）',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.aY,
                    precision: 1,
                    desc: 'A 点(原点) 的世界 Y',
                },
                {
                    key: 'aZ',
                    label: 'A 点 Z（原点）',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.aZ,
                    precision: 1,
                    desc: 'A 点(原点) 的世界 Z',
                },
                {
                    key: 'bX',
                    label: 'B 本地 X',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.bX,
                    precision: 1,
                    desc: 'B 相对 A 的本地坐标 X',
                },
                {
                    key: 'bY',
                    label: 'B 本地 Y',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.bY,
                    precision: 1,
                    desc: 'B 相对 A 的本地坐标 Y',
                },
                {
                    key: 'bZ',
                    label: 'B 本地 Z',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.bZ,
                    precision: 1,
                    desc: 'B 相对 A 的本地坐标 Z',
                },
                {
                    key: 'cX',
                    label: 'C 本地 X',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.cX,
                    precision: 1,
                    desc: 'C 相对 B 的本地坐标 X',
                },
                {
                    key: 'cY',
                    label: 'C 本地 Y',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.cY,
                    precision: 1,
                    desc: 'C 相对 B 的本地坐标 Y',
                },
                {
                    key: 'cZ',
                    label: 'C 本地 Z',
                    type: 'range',
                    min: -4,
                    max: 4,
                    step: 0.1,
                    value: state.cZ,
                    precision: 1,
                    desc: 'C 相对 B 的本地坐标 Z',
                },
            ],
            defaults: {
                aX: state.aX,
                aY: state.aY,
                aZ: state.aZ,
                bX: state.bX,
                bY: state.bY,
                bZ: state.bZ,
                cX: state.cX,
                cY: state.cY,
                cZ: state.cZ,
            },
            onChange(key, value) {
                switch (key) {
                    case 'aX':
                    case 'aY':
                    case 'aZ':
                    case 'bX':
                    case 'bY':
                    case 'bZ':
                    case 'cX':
                    case 'cY':
                    case 'cZ':
                        state[key] = value;
                        break;
                }
                applyAndShow();
            },
        });

        // 把 state 同步到参数面板的滑块显示
        const syncPanel = () => {
            panel.setDisplay('aX', state.aX);
            panel.setDisplay('aY', state.aY);
            panel.setDisplay('aZ', state.aZ);
            panel.setDisplay('bX', state.bX);
            panel.setDisplay('bY', state.bY);
            panel.setDisplay('bZ', state.bZ);
            panel.setDisplay('cX', state.cX);
            panel.setDisplay('cY', state.cY);
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
            const hits = raycaster.intersectObjects([sphereB, sphereC], false);
            if (hits.length === 0) return;
            const hit = hits[0];
            dragTarget = hit.object === sphereB ? 'B' : 'C';
            controls.enabled = false;
            dom.setPointerCapture(e.pointerId);
            // 拖拽平面：过球心、法线朝向相机
            const target = dragTarget === 'B' ? sphereB : sphereC;
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
                const hover = raycaster.intersectObjects([sphereB, sphereC], false);
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
            abArrow.arrow.dispose();
            abArrow.label.geometry.dispose();
            (abArrow.label.material as THREE.Material).dispose();
            abArrow.labelTex.dispose();
            acArrow.arrow.dispose();
            acArrow.label.geometry.dispose();
            (acArrow.label.material as THREE.Material).dispose();
            acArrow.labelTex.dispose();
            bcArrow.arrow.dispose();
            bcArrow.label.geometry.dispose();
            (bcArrow.label.material as THREE.Material).dispose();
            bcArrow.labelTex.dispose();
            sphereA.geometry.dispose();
            (sphereA.material as THREE.Material).dispose();
            patchA.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
            (patchA.userData.material as THREE.Material).dispose();
            (patchA.userData.texture as THREE.Texture).dispose();

            sphereB.geometry.dispose();
            (sphereB.material as THREE.Material).dispose();
            patchB.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
            (patchB.userData.material as THREE.Material).dispose();
            (patchB.userData.texture as THREE.Texture).dispose();

            sphereC.geometry.dispose();
            (sphereC.material as THREE.Material).dispose();
            patchC.children.forEach((m) => (m as THREE.Mesh).geometry.dispose());
            (patchC.userData.material as THREE.Material).dispose();
            (patchC.userData.texture as THREE.Texture).dispose();
            panel.remove();
            readout.remove();
            tip.remove();
        });
    },
};
