import * as THREE from 'three';
import {OBJLoader} from 'three/examples/jsm/loaders/OBJLoader.js';
import {MTLLoader} from 'three/examples/jsm/loaders/MTLLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {setSceneBackground, createContext, makeCleanup, disposeObject3D} from './helper';
import {createParamPanel} from '../utils/paramPanel';
import type {Lesson} from './types';
// 从磁盘读取真实生成的文件：?url 拿到可加载地址，?raw 拿到文本内容
import objUrl from '../assets/OBJFormat/box-from-code.obj?url';
import objRaw from '../assets/OBJFormat/box-from-code.obj?raw';
import mtlRaw from '../assets/OBJFormat/box-from-code.mtl?raw';

/**
 * 演示：用代码直接生成 OBJ 文本 → 再解析回 Three.js 网格显示；
 * 并提供复选框，勾选时用 MTLLoader 加载配套的 MTL 材质文件。
 */

let raf = 0;

function create(container: HTMLElement): () => void {
    const ctx = createContext(container);
    const {scene, renderer} = ctx;

    setSceneBackground(ctx, 0x111418);

    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    camera.position.set(3, 2.5, 4);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(5, 8, 6);
    scene.add(dir);

    // 1) 直接加载磁盘上生成的 OBJ 文件（box-from-code.obj）
    //    注意：每次运行 `npm run gen:obj_and_mtl` 后刷新页面，形状都会跟着变化。
    let currentObj: THREE.Object3D | null = null;

    // 给模型所有网格开启双面渲染（从内部也能看到面）
    const applyDoubleSide = (root: THREE.Object3D) => {
        root.traverse((o) => {
            const mesh = o as THREE.Mesh;
            if (mesh.isMesh) {
                const mat = mesh.material as THREE.Material | THREE.Material[];
                if (Array.isArray(mat)) mat.forEach((m) => (m.side = THREE.DoubleSide));
                else if (mat) mat.side = THREE.DoubleSide;
            }
        });
    };

    // 默认：加载磁盘 OBJ（不套 MTL，Three.js 给默认白色）
    const loader = new OBJLoader();
    loader.load(objUrl, (loaded) => {
        currentObj = loaded;
        applyDoubleSide(currentObj);
        scene.add(currentObj);
    });

    // 2) 右上角参数面板：勾选「加载 MTL 材质」时加载配套 MTL 并应用到模型
    let mtlLoaded = false;

    const loadMtlModel = () => {
        const mtlLoader = new MTLLoader();
        mtlLoader.load(objUrl.replace(/\.obj(\?.*)?$/, '.mtl'), (materials) => {
            materials.preload();
            // 关键：仍然加载「同一份磁盘 OBJ」文件，只是套上 MTL 材质，
            // 这样形状与默认显示完全一致，只是换了材质颜色。
            const objLoader = new OBJLoader();
            objLoader.setMaterials(materials);
            objLoader.load(objUrl, (loaded) => {
                if (currentObj) {
                    scene.remove(currentObj);
                    disposeObject3D(currentObj);
                }
                currentObj = loaded;
                applyDoubleSide(currentObj);
                scene.add(currentObj);
                mtlLoaded = true;
            });
        });
    };

    const loadPlainModel = () => {
        loader.load(objUrl, (loaded) => {
            if (currentObj) {
                scene.remove(currentObj);
                disposeObject3D(currentObj);
            }
            currentObj = loaded;
            applyDoubleSide(currentObj);
            scene.add(currentObj);
            mtlLoaded = false;
        });
    };

    const paramPanel = createParamPanel({
        container,
        controls: [
            {
                key: 'loadMtl',
                label: '加载 MTL 材质',
                type: 'checkbox',
                min: 0,
                max: 1,
                step: 1,
                value: 0,
                desc: '勾选后用 MTLLoader 加载 box-from-code.mtl 并应用到模型',
            },
        ],
        defaults: {loadMtl: 0},
        resettable: false,
        onChange: (key, value) => {
            if (key !== 'loadMtl') return;
            if (value >= 0.5 && !mtlLoaded) loadMtlModel();
            else if (value < 0.5 && mtlLoaded) loadPlainModel();
        },
    });

    // 2.5) 把生成的 OBJ 源码渲染到右侧说明面板
    const objMount = document.querySelector<HTMLElement>('#obj-source-mount');
    if (objMount) {
        const pre = document.createElement('pre');
        pre.textContent = objRaw;
        pre.style.cssText =
            'background:#0d1117;color:#c9d1d9;padding:12px;border-radius:6px;' +
            'overflow:auto;max-height:320px;font-size:12px;line-height:1.5;margin:8px 0;';
        objMount.appendChild(pre);
    }
    // 把 MTL 源码渲染到右侧说明面板
    const mtlMount = document.querySelector<HTMLElement>('#mtl-source-mount');
    if (mtlMount) {
        const pre = document.createElement('pre');
        pre.textContent = mtlRaw;
        pre.style.cssText =
            'background:#0d1117;color:#c9d1d9;padding:12px;border-radius:6px;' +
            'overflow:auto;max-height:320px;font-size:12px;line-height:1.5;margin:8px 0;';
        mtlMount.appendChild(pre);
    }

    function onResize(w: number, h: number) {
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
    }

    ctx.onResize(onResize);
    onResize(ctx.getSize().width, ctx.getSize().height);

    const tick = () => {
        raf = requestAnimationFrame(tick);
        controls.update();
        renderer.render(scene, camera);
    };
    tick();

    return makeCleanup(ctx, () => {
        cancelAnimationFrame(raf);
        controls.dispose();
        paramPanel.remove();
        if (currentObj) disposeObject3D(currentObj);
    });
}

export const objFromCode: Lesson = {
    id: 'obj_and_mtl_loader',
    title: 'OBJ 与 MTL 格式',
    description: `
    <h3>OBJ 与 MTL 格式</h3>
    <p>OBJ 是 Wavefront 的纯文本 3D 模型格式，核心元素：</p>
    <ul>
      <li><code>v x y z</code> 顶点位置</li>
      <li><code>vt u v</code> 纹理坐标（可选）</li>
      <li><code>vn x y z</code> 顶点法线（可选）</li>
      <li><code>f a b c</code> 面（索引从 1 开始）</li>
      <li><code>mtllib</code> 引用材质库（.mtl 文件）</li>
      <li><code>usemtl</code> 为后续面指定材质名</li>
    </ul>
    <p>MTL 是与 OBJ 配套的材质库文件，用 <code>newmtl</code> 定义材质，字段如
      <code>Ka</code>/<code>Kd</code>/<code>Ks</code>（环境/漫反射/高光色）、<code>Ns</code>（高光指数）、<code>d</code>（不透明度）。</p>
    <p>因为本质是文本，<b>任何代码都能直接拼出 OBJ / MTL</b>。本例：</p>
    <ol>
      <li>运行生成脚本（<code>scripts/generate-obj-and-mtl.mjs</code>，即 <code>npm run gen:obj_and_mtl</code>）由代码构造一个立方体的 OBJ 文本；</li>
      <li>用官方 <code>OBJLoader</code> 把该文本解析回 Three.js 网格并实时显示；</li>
      <li>勾选左上角"加载 MTL 材质"复选框，用 <code>MTLLoader</code> 加载配套的
        <code>box-from-code.mtl</code> 并应用到模型（漫反射蓝色）。</li>
    </ol>
    <h4>生成的 OBJ 源码</h4>
    <div id="obj-source-mount"></div>
    <h4>配套的 MTL 源码</h4>
    <div id="mtl-source-mount"></div>
  `,
    create,
};
