import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RectAreaLightHelper} from 'three/examples/jsm/helpers/RectAreaLightHelper.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const rectAreaLight: Lesson = {
    id: 'rect-area-light',
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
        ctx.scene.background = new THREE.Color(0x0d1b2a);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5, 4.5, 7);
        camera.lookAt(0, 0.8, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0.8, 0);

        // 地板
        const floor = new THREE.Mesh(
            new THREE.PlaneGeometry(12, 12),
            new THREE.MeshStandardMaterial({color: 0x8899aa, roughness: 0.85, metalness: 0.1}),
        );
        floor.rotation.x = -Math.PI / 2;
        ctx.scene.add(floor);

        // 物体（RectAreaLight 只支持 Standard / Physical 材质）
        const items = [
            {
                geo: new THREE.SphereGeometry(0.9, 48, 32),
                mat: new THREE.MeshStandardMaterial({color: 0x60a5fa, roughness: 0.25, metalness: 0.4}),
                pos: new THREE.Vector3(-2.4, 0.9, 0.8)
            },
            {
                geo: new THREE.BoxGeometry(1.4, 1.4, 1.4),
                mat: new THREE.MeshPhysicalMaterial({color: 0xeeeeee, roughness: 0.15, metalness: 0.9}),
                pos: new THREE.Vector3(2.4, 0.9, 1.4)
            },
            {
                geo: new THREE.TorusKnotGeometry(0.7, 0.25, 100, 16),
                mat: new THREE.MeshStandardMaterial({color: 0xfb7185, roughness: 0.4}),
                pos: new THREE.Vector3(0.2, 1.2, -1.6)
            },
            {
                geo: new THREE.CylinderGeometry(0.6, 0.6, 1.8, 32),
                mat: new THREE.MeshStandardMaterial({color: 0x34d399, roughness: 0.5}),
                pos: new THREE.Vector3(-2.6, 0.9, -1.6)
            },
        ];
        const meshes: THREE.Mesh[] = [];
        items.forEach(({geo, mat, pos}) => {
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.copy(pos);
            ctx.scene.add(mesh);
            meshes.push(mesh);
        });

        // 矩形区域光：默认面板 4x4，悬于场景上方照向原点
        const rectLight = new THREE.RectAreaLight(0xffffff, 3, 4, 4);
        rectLight.position.set(0, 4.5, 0);
        rectLight.lookAt(0, 0, 0);
        ctx.scene.add(rectLight);

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
                    label: '强度',
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
                    key: 'width',
                    label: '宽度',
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
                    label: '高度',
                    type: 'range',
                    min: 0.5,
                    max: 8,
                    step: 0.1,
                    value: 4,
                    precision: 1,
                    desc: '面板的高度'
                },
                {
                    key: 'posX',
                    label: '位置 X',
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
                    label: '高度 Y',
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
                    label: '位置 Z',
                    type: 'range',
                    min: -6,
                    max: 6,
                    step: 0.1,
                    value: 0,
                    precision: 1,
                    desc: '面板在世界空间中的 Z 位置'
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
            defaults: {intensity: 3, color: 0xffffff, width: 4, height: 4, posX: 0, posY: 4.5, posZ: 0, showHelper: 1},
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
                        rectLight.lookAt(0, 0, 0);
                        rebuildHelper();
                        break;
                    case 'posY':
                        rectLight.position.y = value;
                        rectLight.lookAt(0, 0, 0);
                        rebuildHelper();
                        break;
                    case 'posZ':
                        rectLight.position.z = value;
                        rectLight.lookAt(0, 0, 0);
                        rebuildHelper();
                        break;
                    case 'showHelper':
                        showHelperVisible = value >= 0.5;
                        helper.visible = showHelperVisible;
                        break;
                }
            },
        });

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
            floor.geometry.dispose();
            (floor.material as THREE.Material).dispose();
            items.forEach(({geo, mat}) => {
                geo.dispose();
                mat.dispose();
            });
            helper.dispose();
            panel.remove();
        });
    },
};
