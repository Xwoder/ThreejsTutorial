import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RectAreaLightHelper} from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import type {Lesson} from '../types';
import {setSceneBackground, createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const rectAreaLight: Lesson = {
    id: 'lights/rect-area-light',
    title: 'RectAreaLight 矩形区域光',
    description: `
    <h2>RectAreaLight 矩形区域光</h2>
    <p><code>RectAreaLight</code> 模拟一个<b>发光的矩形面板</b>（如灯带、落地窗、影棚柔光箱），光线从面板平面均匀射出，能产生柔和、真实的高光反射：</p>
    <pre><code>const light = new THREE.RectAreaLight(0xffffff, 100, 4, 4);
light.position.set(0, 4.5, 0);
light.lookAt(0, 0, 0);
scene.add(light);</code></pre>
    <h3>注意</h3>
    <ul>    
      <li>只对 <code>MeshStandardMaterial</code> / <code>MeshPhysicalMaterial</code> 生效，<b>不支持</b> Phong / Lambert / Basic 材质</li>
      <li>使用 <code>lookAt</code> 指定面板的照射方向（默认朝向 -Z）</li>
      <li>没有内置 Helper，需引入 <code>RectAreaLightHelper</code> 辅助显示面板</li>
      <li>无阴影（<code>castShadow</code> 无效），也不产生衰减</li>
    </ul>
    <h3>动手试试</h3>
    <p>拖动「宽度 / 高度」改变面板尺寸，「位置 X / Y / Z」移动光源，观察球体与金属方块上的高光形状变化；调低强度可看到面板更像一块发光板。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, 0x0d1b2a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5.5, 7, 8);
        camera.lookAt(0, 0.5, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.5, 0);

        // 地板（与 point-light 一致：12×12、粗糙度 0.9）
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.9, side: THREE.DoubleSide}),
        );
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);

        // 四面墙：围成半开放的小盒子（顶部留空，光从上方射入）
        const wallGeo = new THREE.PlaneGeometry(12, 3);
        const wallMat = new THREE.MeshStandardMaterial({
            color: 0x6b7f99,
            roughness: 0.9,
            metalness: 0.05,
            side: THREE.DoubleSide, // 从盒子外部也能看到墙面
        });
        const walls: THREE.Mesh[] = [];
        const wallPlacements = [
            {x: 0, z: -6, rotY: 0},       // 北墙（-Z）
            {x: 0, z: 6, rotY: 0},        // 南墙（+Z）
            {x: -6, z: 0, rotY: Math.PI / 2}, // 西墙（-X）
            {x: 6, z: 0, rotY: Math.PI / 2},  // 东墙（+X）
        ];
        wallPlacements.forEach(({x, z, rotY}) => {
            const wall = new THREE.Mesh(wallGeo, wallMat);
            wall.position.set(x, 1.5, z);
            wall.rotation.y = rotY;
            ctx.scene.add(wall);
            walls.push(wall);
        });

        // 与 point-light 一致：9 个不同形状 / 颜色的物体，按 3×3 网格排列
        const items = [
            {
                geo: new THREE.SphereGeometry(0.9, 48, 32),
                mat: new THREE.MeshStandardMaterial({color: 0x60a5fa, roughness: 0.3}),
                h: 0.9
            },
            {
                geo: new THREE.BoxGeometry(1.5, 1.5, 1.5),
                mat: new THREE.MeshStandardMaterial({color: 0xfbbf24, roughness: 0.5}),
                h: 0.75
            },
            {
                geo: new THREE.CylinderGeometry(0.6, 0.6, 2.2, 32),
                mat: new THREE.MeshStandardMaterial({color: 0x34d399, roughness: 0.4, metalness: 0.2}),
                h: 1.1
            },
            {
                geo: new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16),
                mat: new THREE.MeshStandardMaterial({color: 0xfb7185, roughness: 0.5}),
                h: 1.2
            },
            {
                geo: new THREE.TorusGeometry(0.7, 0.28, 32, 64),
                mat: new THREE.MeshStandardMaterial({color: 0xa78bfa, roughness: 0.4}),
                h: 1.3
            },
            {
                geo: new THREE.ConeGeometry(0.8, 1.8, 32),
                mat: new THREE.MeshStandardMaterial({color: 0xfbbf24, roughness: 0.5}),
                h: 0.9
            },
            {
                geo: new THREE.DodecahedronGeometry(0.9),
                mat: new THREE.MeshStandardMaterial({color: 0xffffff, roughness: 0.6}),
                h: 1.0
            },
            {
                geo: new THREE.OctahedronGeometry(0.9),
                mat: new THREE.MeshStandardMaterial({color: 0xfb923c, roughness: 0.5}),
                h: 0.9
            },
            {
                geo: new THREE.IcosahedronGeometry(0.9),
                mat: new THREE.MeshStandardMaterial({color: 0x2dd4bf, roughness: 0.4}),
                h: 0.9
            },
        ];
        const SPACING = 3.2;
        const meshes: THREE.Mesh[] = [];
        items.forEach(({geo, mat, h}, i) => {
            const mesh = new THREE.Mesh(geo, mat);
            const row = Math.floor(i / 3);
            const col = i % 3;
            mesh.position.set((col - 1) * SPACING, h + 0.1, (row - 1) * SPACING);
            ctx.scene.add(mesh);
            meshes.push(mesh);
        });

        // 矩形区域光：默认面板 4x4，悬于场景上方照向原点
        const rectLight = new THREE.RectAreaLight(0xffffff, 3, 4, 4);
        rectLight.position.set(0, 4.5, 0);
        ctx.scene.add(rectLight);

        // 照射目标点：lookAt 决定面板朝向（发光面正对目标）
        const target = {x: 0, y: 0, z: 0};
        const updateLightLookAt = () => {
            rectLight.lookAt(target.x, target.y, target.z);
        };
        updateLightLookAt();

        let showHelperVisible = true;
        let helper = new RectAreaLightHelper(rectLight);
        ctx.scene.add(helper);
        // RectAreaLightHelper 没有 update()，几何在构造时一次性生成；
        // 面板尺寸 / 位置变化时需重建 helper 以同步外观
        const rebuildHelper = () => {
            helper.dispose();
            ctx.scene.remove(helper);
            rectLight.updateMatrixWorld(true);
            helper = new RectAreaLightHelper(rectLight);
            helper.visible = showHelperVisible;
            ctx.scene.add(helper);
        };

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'intensity',
                    label: '强度 intensity',
                    type: 'range',
                    min: 0,
                    max: 10,
                    step: 0.05,
                    value: 3,
                    precision: 2,
                    desc: '面板发光强度（单位 cd/m²），越大越亮'
                },
                {
                    key: 'color',
                    label: '颜色',
                    type: 'color',
                    min: 0,
                    max: 0xffffff,
                    step: 1,
                    value: 0xffffff,
                    desc: '面板发光的颜色'
                },
                {
                    type: 'group',
                    label: '尺寸',
                    children: [
                        {
                            key: 'width',
                            label: '宽度 width',
                            type: 'range',
                            min: 0.5,
                            max: 8,
                            step: 0.1,
                            value: 4,
                            precision: 1,
                            desc: '面板的宽度'
                        },
                        {
                            key: 'height',
                            label: '高度 height',
                            type: 'range',
                            min: 0.5,
                            max: 8,
                            step: 0.1,
                            value: 4,
                            precision: 1,
                            desc: '面板的高度'
                        },
                    ],
                },
                {
                    type: 'group',
                    label: '位置',
                    children: [
                        {
                            key: 'posX',
                            label: '位置 X position.x',
                            type: 'range',
                            min: -6,
                            max: 6,
                            step: 0.1,
                            value: 0,
                            precision: 1,
                            desc: '面板在世界空间中的 X 位置'
                        },
                        {
                            key: 'posY',
                            label: '位置 Y position.y',
                            type: 'range',
                            min: 0.5,
                            max: 8,
                            step: 0.1,
                            value: 4.5,
                            precision: 1,
                            desc: '面板离地高度'
                        },
                        {
                            key: 'posZ',
                            label: '位置 Z position.z',
                            type: 'range',
                            min: -6,
                            max: 6,
                            step: 0.1,
                            value: 0,
                            precision: 1,
                            desc: '面板在世界空间中的 Z 位置'
                        },
                    ],
                },
                {
                    type: 'group',
                    label: '目标',
                    children: [
                        {
                            key: 'targetX',
                            label: '目标 X target.x',
                            type: 'range',
                            min: -6,
                            max: 6,
                            step: 0.1,
                            value: 0,
                            precision: 1,
                            desc: '面板发光面正对的 X 位置'
                        },
                        {
                            key: 'targetY',
                            label: '目标 Y target.y',
                            type: 'range',
                            min: 0,
                            max: 8,
                            step: 0.1,
                            value: 0,
                            precision: 1,
                            desc: '面板发光面正对的 Y 位置'
                        },
                        {
                            key: 'targetZ',
                            label: '目标 Z target.z',
                            type: 'range',
                            min: -6,
                            max: 6,
                            step: 0.1,
                            value: 0,
                            precision: 1,
                            desc: '面板发光面正对的 Z 位置'
                        },
                    ],
                },
                {
                    key: 'showHelper',
                    label: '显示 RectAreaLightHelper',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: 1,
                    desc: '是否显示半透明的矩形发光面板'
                },
            ],
            defaults: {
                intensity: 3,
                color: 0xffffff,
                width: 4,
                height: 4,
                posX: 0,
                posY: 4.5,
                posZ: 0,
                targetX: 0,
                targetY: 0,
                targetZ: 0,
                showHelper: 1
            },
            onChange(key, value) {
                switch (key) {
                    case 'intensity':
                        rectLight.intensity = value;
                        break;
                    case 'color':
                        rectLight.color.setHex(value);
                        break;
                    case 'width':
                        rectLight.width = value;
                        rebuildHelper();
                        break;
                    case 'height':
                        rectLight.height = value;
                        rebuildHelper();
                        break;
                    case 'posX':
                        rectLight.position.x = value;
                        updateLightLookAt();
                        rebuildHelper();
                        break;
                    case 'posY':
                        rectLight.position.y = value;
                        updateLightLookAt();
                        rebuildHelper();
                        break;
                    case 'posZ':
                        rectLight.position.z = value;
                        updateLightLookAt();
                        rebuildHelper();
                        break;
                    case 'targetX':
                        target.x = value;
                        updateLightLookAt();
                        rebuildHelper();
                        break;
                    case 'targetY':
                        target.y = value;
                        updateLightLookAt();
                        rebuildHelper();
                        break;
                    case 'targetZ':
                        target.z = value;
                        updateLightLookAt();
                        rebuildHelper();
                        break;
                    case 'showHelper':
                        showHelperVisible = value >= 0.5;
                        helper.visible = showHelperVisible;
                        break;
                }
            },
        });

        // 点击场景拾取：点击地板 / 物体，让面板照向点击位置
        const raycaster = new THREE.Raycaster();
        const pointerNdc = new THREE.Vector2();
        const clickableObjects = [floor, ...walls, ...meshes];
        let pointerDownPos: { x: number; y: number } | null = null;

        const onPointerDown = (e: PointerEvent) => {
            pointerDownPos = {x: e.clientX, y: e.clientY};
        };
        const onClick = (e: MouseEvent) => {
            // 拖拽相机松手也会触发 click，位移过大时忽略
            if (
                pointerDownPos &&
                (Math.abs(e.clientX - pointerDownPos.x) > 5 || Math.abs(e.clientY - pointerDownPos.y) > 5)
            ) {
                return;
            }
            const rect = ctx.renderer.domElement.getBoundingClientRect();
            pointerNdc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
            pointerNdc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
            raycaster.setFromCamera(pointerNdc, camera);
            const hits = raycaster.intersectObjects(clickableObjects, false);
            if (hits.length === 0) return;
            const p = hits[0].point;
            target.x = p.x;
            target.y = p.y;
            target.z = p.z;
            updateLightLookAt();
            rebuildHelper();
            panel.setDisplay('targetX', target.x);
            panel.setDisplay('targetY', target.y);
            panel.setDisplay('targetZ', target.z);
        };
        ctx.renderer.domElement.addEventListener('pointerdown', onPointerDown);
        ctx.renderer.domElement.addEventListener('click', onClick);

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
            ctx.renderer.domElement.removeEventListener('pointerdown', onPointerDown);
            ctx.renderer.domElement.removeEventListener('click', onClick);
            floor.geometry.dispose();
            (floor.material as THREE.Material).dispose();
            wallGeo.dispose();
            wallMat.dispose();
            items.forEach(({geo, mat}) => {
                geo.dispose();
                mat.dispose();
            });
            helper.dispose();
            panel.remove();
        });
    },
};
