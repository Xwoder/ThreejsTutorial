import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Lesson} from '../types';
import {createContext, loadTexture, makeCleanup} from '../helper';
import {createParamPanel} from '../../utils/paramPanel.ts';

import albedoUrl from '../../assets/PbrTexture/leafy-grass2-bl/leafy-grass2-albedo.png?url';
import normalUrl from '../../assets/PbrTexture/leafy-grass2-bl/leafy-grass2-normal-ogl.png?url';
import roughnessUrl from '../../assets/PbrTexture/leafy-grass2-bl/leafy-grass2-roughness.png?url';
import metallicUrl from '../../assets/PbrTexture/leafy-grass2-bl/leafy-grass2-metallic.png?url';
import aoUrl from '../../assets/PbrTexture/leafy-grass2-bl/leafy-grass2-ao.png?url';
import heightUrl from '../../assets/PbrTexture/leafy-grass2-bl/leafy-grass2-height.png?url';

export const pbrGrass: Lesson = {
    id: 'material/textures/pbr-grass',
    title: 'PBR 草地材质（平面）',
    description: `
    <h2>PBR 贴图链演示：leafy-grass2</h2>
    <p>用一张<strong>平面</strong>演示一套完整的 PBR 材质贴图（<code>src/assets/PbrTexture/leafy-grass2-bl/</code>）。草叶材质最常用的贴图有：</p>
    <ul>
      <li><b>albedo（漫反射）</b>：决定颜色，需声明 <code>SRGBColorSpace</code>。</li>
      <li><b>normal（法线）</b>：模拟草叶表面的微小凹凸与光照细节。</li>
      <li><b>roughness（粗糙度）</b>：控制表面光滑程度（0 光滑 / 1 粗糙）。</li>
      <li><b>metallic（金属度）</b>：草叶通常为全黑（非金属），此处用于观察贴图效果。</li>
      <li><b>ao（环境光遮蔽）</b>：加深叶缝、根部的暗部，增强立体感。</li>
      <li><b>height（高度）</b>：作为 <code>bumpMap</code> 提供更细腻的凹凸。</li>
    </ul>
    <pre><code>const material = new THREE.MeshStandardMaterial({
  map: albedoTexture,            // 漫反射（sRGB）
  normalMap: normalTexture,      // 法线
  roughnessMap: roughnessTexture,
  metalnessMap: metallicTexture,
  aoMap: aoTexture,              // 注意 ao 需要几何体提供 uv2
  bumpMap: heightTexture,
});</code></pre>
    <p>由于设置了贴图，材质最终值 = 贴图采样值 × 右侧面板对应参数，拖动滑块即可实时观察每张贴图的贡献。</p>
    <p>本示例将平面<strong>平放在地面上</strong>（绕 X 轴旋转 90°），并使用 <code>side: THREE.DoubleSide</code> 双面渲染，可旋转到地面下方查看背面。</p>
    <p>鼠标拖动环绕观察，滚轮缩放。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        // 程序化环境贴图，为 PBR 材质提供基于图像的照明
        const pmrem = new THREE.PMREMGenerator(ctx.renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        ctx.scene.environment = envTex;
        ctx.scene.environmentIntensity = 0.6;

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        // 初始视角：站在高处俯视地面
        camera.position.set(0, 6, 4);
        camera.lookAt(0, 0, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;
        controls.target.set(0, 0, 0);

        ctx.scene.add(new THREE.GridHelper(8, 8, 0x475569, 0x1e293b));
        ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.4));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
        dirLight.position.set(3, 5, 4);
        ctx.scene.add(dirLight);

        // 平面：细分 32×32，并复制 uv 到 uv2 以支持 aoMap
        const geometry = new THREE.PlaneGeometry(3, 3, 32, 32);
        geometry.setAttribute('uv2', geometry.getAttribute('uv').clone());

        const material = new THREE.MeshStandardMaterial({
            roughness: 1,
            metalness: 0,
            normalScale: new THREE.Vector2(1, 1),
            aoMapIntensity: 1,
            bumpScale: 0.05,
            side: THREE.DoubleSide,
        });
        const mesh = new THREE.Mesh(geometry, material);
        // 平放在地面上（XZ 平面），略微抬高避免与网格线 z-fighting
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = 0.001;
        ctx.scene.add(mesh);

        // 各贴图加载完成后统一应用到材质
        const tex: {
            albedo?: THREE.Texture;
            normal?: THREE.Texture;
            roughness?: THREE.Texture;
            metallic?: THREE.Texture;
            ao?: THREE.Texture;
            height?: THREE.Texture;
        } = {};

        const tryApply = () => {
            if (!tex.albedo || !tex.normal || !tex.roughness || !tex.metallic || !tex.ao || !tex.height) return;
            material.map = tex.albedo;
            material.normalMap = tex.normal;
            material.roughnessMap = tex.roughness;
            material.metalnessMap = tex.metallic;
            material.aoMap = tex.ao;
            material.bumpMap = tex.height;
            material.needsUpdate = true;
            tip.remove();
        };

        loadTexture(albedoUrl, (t) => {
            t.colorSpace = THREE.SRGBColorSpace;
            t.anisotropy = 8;
            tex.albedo = t;
            tryApply();
        });
        loadTexture(normalUrl, (t) => {
            t.colorSpace = THREE.NoColorSpace;
            tex.normal = t;
            tryApply();
        });
        loadTexture(roughnessUrl, (t) => {
            t.colorSpace = THREE.NoColorSpace;
            tex.roughness = t;
            tryApply();
        });
        loadTexture(metallicUrl, (t) => {
            t.colorSpace = THREE.NoColorSpace;
            tex.metallic = t;
            tryApply();
        });
        loadTexture(aoUrl, (t) => {
            t.colorSpace = THREE.NoColorSpace;
            tex.ao = t;
            tryApply();
        });
        loadTexture(heightUrl, (t) => {
            t.colorSpace = THREE.NoColorSpace;
            tex.height = t;
            tryApply();
        });

        // 加载提示
        const tip = document.createElement('div');
        tip.textContent = 'PBR 贴图加载中…';
        tip.style.cssText =
            'position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);color:#94a3b8;font-size:14px;background:rgba(0,0,0,0.4);padding:10px 16px;border-radius:6px;';
        container.appendChild(tip);

        // 参数面板
        const state = {
            normalStrength: 1,
            roughness: 1,
            metalness: 0,
            aoIntensity: 1,
            bumpScale: 0.05,
        };
        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'normalStrength',
                    label: '法线强度',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    value: state.normalStrength,
                    precision: 2,
                    desc: 'normalMap 的强度系数（normalScale），0 关闭法线细节',
                },
                {
                    key: 'roughness',
                    label: '粗糙度强度',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    value: state.roughness,
                    precision: 2,
                    desc: '最终粗糙度 = roughnessMap × 该值',
                },
                {
                    key: 'metalness',
                    label: '金属度强度',
                    type: 'range',
                    min: 0,
                    max: 1,
                    step: 0.01,
                    value: state.metalness,
                    precision: 2,
                    desc: '最终金属度 = metalnessMap × 该值',
                },
                {
                    key: 'aoIntensity',
                    label: 'AO 强度',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    value: state.aoIntensity,
                    precision: 2,
                    desc: '环境光遮蔽强度（aoMapIntensity）',
                },
                {
                    key: 'bumpScale',
                    label: '凹凸强度',
                    type: 'range',
                    min: 0,
                    max: 0.5,
                    step: 0.005,
                    value: state.bumpScale,
                    precision: 3,
                    desc: 'bumpMap（height）的起伏强度，0 关闭',
                },
            ],
            defaults: {...state},
            onChange(key, value) {
                switch (key) {
                    case 'normalStrength':
                        material.normalScale.set(value, value);
                        break;
                    case 'roughness':
                        material.roughness = value;
                        break;
                    case 'metalness':
                        material.metalness = value;
                        break;
                    case 'aoIntensity':
                        material.aoMapIntensity = value;
                        break;
                    case 'bumpScale':
                        material.bumpScale = value;
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
            pmrem.dispose();
            envTex.dispose();
            geometry.dispose();
            material.dispose();
            Object.values(tex).forEach((t) => t?.dispose());
            panel.remove();
            tip.remove();
        });
    },
};
