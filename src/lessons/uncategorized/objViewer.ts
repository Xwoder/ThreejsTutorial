import * as THREE from 'three';
import {TrackballControls} from 'three/examples/jsm/controls/TrackballControls.js';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

export const objViewer: Lesson = {
    id: 'uncategorized/obj-viewer',
    title: 'OBJ 模型展示',
    description: `
    <h2>从本地加载并展示 OBJ 模型</h2>
    <p>点击右上角参数面板中的 <b>打开 OBJ 文件</b> 按钮，选择本地的 <code>.obj</code> 文件（可同时选中配套的 <code>.mtl</code> 材质库）。文件仅在浏览器本地解析，不会上传到任何服务器。</p>
    <h3>核心思路</h3>
    <ul>
      <li>使用 <code>OBJLoader</code> 解析 .obj 顶点/面数据；若选择 .mtl 则通过 <code>MTLLoader</code> 还原材质。</li>
      <li>通过 <code>URL.createObjectURL</code> 把本地 <code>File</code> 转成可加载的临时 URL。</li>
      <li>加载完成后自动计算包围盒，将模型<strong>居中</strong>并<strong>缩放到合适的观察视野</strong>，相机自动框定全部几何。</li>
    </ul>
    <h3>技术要点</h3>
    <ul>
      <li>若 OBJ 没有附带材质，会统一套用浅色 <code>MeshStandardMaterial</code>，便于观察明暗。</li>
      <li>鼠标拖动环绕、滚轮缩放、右键平移。</li>
    </ul>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100000);
        camera.position.set(0, 0, 10);

        // 光照
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.7));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4);
        sun.position.set(1, 1.5, 1);
        ctx.scene.add(sun);
        ctx.scene.add(new THREE.HemisphereLight(0xbcd4ff, 0x2a2438, 0.5));

        const controls = new TrackballControls(camera, ctx.renderer.domElement);
        controls.rotateSpeed = 3.0;
        controls.zoomSpeed = 1.2;
        controls.panSpeed = 0.8;
        controls.staticMoving = false;
        controls.dynamicDampingFactor = 0.15;

        // 当前加载的模型根节点
        let model: THREE.Object3D | null = null;
        // 居中后的模型容器（缩放作用于此）
        const modelHolder = new THREE.Group();
        ctx.scene.add(modelHolder);

        const defaultMaterial = new THREE.MeshStandardMaterial({
            color: 0x9ca3af,
            roughness: 0.8,
            metalness: 0.0,
            side: THREE.DoubleSide,
        });

        const state = {
            autoRotate: 0,
        };

        // 把模型居中并缩放，使相机能框定全部内容
        const frameModel = (root: THREE.Object3D) => {
            const box = new THREE.Box3().setFromObject(root);
            if (box.isEmpty()) return;
            const size = box.getSize(new THREE.Vector3());
            const center = box.getCenter(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z) || 1;

            // 先还原到原始变换，重新计算包围盒后再居中
            root.position.sub(center);

            // 相机距离：让 maxDim 充满约 60% 视高
            const fitDist = (maxDim / 2 / Math.tan((camera.fov * Math.PI) / 360)) * 1.6;
            camera.position.set(0, size.y * 0.25, fitDist);
            camera.near = fitDist / 100;
            camera.far = fitDist * 100;
            camera.updateProjectionMatrix();
            controls.target.set(0, 0, 0);
            controls.update();
        };

        const setModel = (root: THREE.Object3D) => {
            if (model) {
                modelHolder.remove(model);
                disposeObject(model);
            }
            model = root;
            modelHolder.add(model);
            frameModel(model);
        };

        // 递归释放（避免与 helper.disposeObject3D 重复引入，这里内联实现）
        const disposeObject = (root: THREE.Object3D) => {
            root.traverse((obj) => {
                const mesh = obj as THREE.Mesh;
                if (mesh.geometry) mesh.geometry.dispose();
                const mat = mesh.material;
                if (mat) {
                    const mats = Array.isArray(mat) ? mat : [mat];
                    for (const m of mats) {
                        // 默认共享材质不释放，仅释放非默认的
                        if (m !== defaultMaterial) m.dispose();
                    }
                }
            });
        };

        // 隐藏原生 file input，用面板按钮触发
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.obj,.mtl';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        container.appendChild(fileInput);

        const loadFromFiles = (files: FileList) => {
            const fileArr = Array.from(files);
            const objFile = fileArr.find((f) => f.name.toLowerCase().endsWith('.obj'));
            if (!objFile) {
                alert('请选择一个 .obj 文件');
                return;
            }
            const objUrl = URL.createObjectURL(objFile);
            const loader = new OBJLoader();

            // 尝试匹配同名/同批 mtl
            const mtlFile = fileArr.find((f) => f.name.toLowerCase().endsWith('.mtl'));
            const onLoaded = (group: THREE.Group) => {
                URL.revokeObjectURL(objUrl);
                // 没有材质的 mesh 套用默认材质
                group.traverse((o) => {
                    const mesh = o as THREE.Mesh;
                    if (mesh.isMesh && (!mesh.material || (Array.isArray(mesh.material) && mesh.material.length === 0))) {
                        mesh.material = defaultMaterial;
                    }
                });
                setModel(group);
                tip.textContent = `已加载：${objFile.name}（顶点网格 ${countMeshes(group)} 个）`;
            };

            if (mtlFile) {
                // 动态加载 MTLLoader 配合材质还原
                import('three/examples/jsm/loaders/MTLLoader.js').then(({MTLLoader}) => {
                    const mtlUrl = URL.createObjectURL(mtlFile);
                    const mtlLoader = new MTLLoader();
                    mtlLoader.load(
                        mtlUrl,
                        (materials) => {
                            materials.preload();
                            loader.setMaterials(materials);
                            loader.load(
                                objUrl,
                                (group) => {
                                    URL.revokeObjectURL(mtlUrl);
                                    onLoaded(group);
                                },
                                undefined,
                                () => {
                                    URL.revokeObjectURL(mtlUrl);
                                    tip.textContent = '加载失败：OBJ 解析出错';
                                },
                            );
                        },
                        undefined,
                        () => {
                            URL.revokeObjectURL(mtlUrl);
                            // MTL 失败则退回无材质加载
                            loader.load(objUrl, onLoaded, undefined, () => {
                                tip.textContent = '加载失败：文件可能损坏或格式不支持';
                            });
                        },
                    );
                });
            } else {
                loader.load(objUrl, onLoaded, undefined, () => {
                    tip.textContent = '加载失败：文件可能损坏或格式不支持';
                });
            }
        };

        const countMeshes = (root: THREE.Object3D) => {
            let count = 0;
            root.traverse((o) => {
                if ((o as THREE.Mesh).isMesh) count += 1;
            });
            return count;
        };

        fileInput.addEventListener('change', () => {
            if (fileInput.files && fileInput.files.length) loadFromFiles(fileInput.files);
            fileInput.value = '';
        });

        // 参数面板：打开文件按钮 + 调节项
        const openGroup = document.createElement('div');
        const openBtn = document.createElement('button');
        openBtn.className = 'camera-control-reset';
        openBtn.textContent = '打开 OBJ 文件';
        openBtn.style.width = '100%';
        openBtn.style.margin = '4px 0 10px';
        openBtn.addEventListener('click', () => fileInput.click());
        openGroup.appendChild(openBtn);

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'autoRotate',
                    label: '自动旋转',
                    type: 'checkbox',
                    min: 0,
                    max: 1,
                    step: 1,
                    value: state.autoRotate,
                    desc: '绕 Y 轴缓慢自转',
                },
            ],
          defaults: {autoRotate: 0},
            footer: openGroup,
            resettable: false,
            onChange(key, value) {
                switch (key) {
                    case 'autoRotate':
                        state.autoRotate = value >= 0.5 ? 1 : 0;
                        break;
                }
            },
        });

        const tip = document.createElement('div');
        tip.textContent = '点击右上角「打开 OBJ 文件」选择本地 .obj 文件';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            if (state.autoRotate >= 0.5 && model) modelHolder.rotation.y += 0.005;
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            if (model) disposeObject(model);
            defaultMaterial.dispose();
            panel.remove();
            openGroup.remove();
            tip.remove();
            fileInput.remove();
        });
    },
};
