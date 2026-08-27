import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {RoomEnvironment} from 'three/examples/jsm/environments/RoomEnvironment.js';
import type {Lesson} from '../types';
import {createContext, makeCleanup, setSceneBackground} from '../helper';

;
import {createParamPanel} from '../../utils/paramPanel.ts';

/** 生成带文字的小标签 sprite（用于显示材质参数） */
function makeLabelSprite(
    text: string,
    color = '#e2e8f0',
    fontSize = 30,
    width = 256,
    framed = true,
): { sprite: THREE.Sprite; texture: THREE.CanvasTexture } {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 64;
    const c = canvas.getContext('2d')!;
    if (framed) {
        c.fillStyle = 'rgba(15, 23, 42, 0.72)';
        c.fillRect(0, 0, canvas.width, canvas.height);
        c.strokeStyle = 'rgba(148, 163, 184, 0.5)';
        c.lineWidth = 2;
        c.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    }
    c.fillStyle = color;
    c.font = `bold ${fontSize}px monospace`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false}),
    );
    sprite.renderOrder = 999;
    return {sprite, texture};
}

export const meshStandardMaterial: Lesson = {
    id: 'material/mesh-standard-material',
    title: 'MeshStandardMaterial 标准材质',
    description: `
    <h2>MeshStandardMaterial</h2>
    <p>基于物理的渲染（PBR）材质，模拟真实世界的材质属性，是目前最常用的材质。两个核心参数：</p>
    <ul>
      <li><b>metalness（金属度）</b>：0 = 非金属（塑料、木头），1 = 纯金属（铁、金）</li>
      <li><b>roughness（粗糙度）</b>：0 = 镜面般光滑，1 = 完全粗糙（漫反射）</li>
    </ul>
    <pre><code>new THREE.MeshStandardMaterial({
  color: 0x60a5fa,
  metalness: 0.6,  // 0 ~ 1
  roughness: 0.2,  // 0 ~ 1
})</code></pre>
    <h3>为什么金属需要环境贴图？</h3>
    <p>纯金属几乎没有漫反射，光泽全部来自环境反射。本例用 <code>RoomEnvironment</code> + <code>PMREMGenerator</code> 生成了环境贴图（<code>scene.environment</code>），金属球才能反射出周围的房间。</p>
    <h3>本例说明</h3>
    <p>3×3 网格排列 9 个球体：<b>每行从左到右 metalness 从 0 到 1 递增</b>，<b>每列从上到下 roughness 从 0 到 1 递增</b>。可以清楚看到：金属度越高越像金属、反射越强；粗糙度越低越光滑、高光越锐利。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        setSceneBackground(ctx, 0x111827);

        // 程序化环境贴图，为金属材质提供反射来源，产生光泽感
        const pmrem = new THREE.PMREMGenerator(ctx.renderer);
        const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
        ctx.scene.environment = envTex;
        ctx.scene.environmentIntensity = 0.8;

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(0, 1.5, 6);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const cols = 3;
        const rows = 3;
        const spacing = 2.8;
        const meshes: THREE.Mesh[] = [];
        const labelTextures: THREE.CanvasTexture[] = [];
        const labelSprites: THREE.Sprite[] = [];
        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                // 列方向（横向）metalness 从 0 到 1 递增
                const metalness = col / (cols - 1);
                // 行方向（纵向）roughness 从 0 到 1 递增
                const roughness = row / (rows - 1);
                const mesh = new THREE.Mesh(
                    new THREE.SphereGeometry(0.8, 48, 24),
                    new THREE.MeshStandardMaterial({
                        color: 0x60a5fa,
                        metalness,
                        roughness,
                    }),
                );
                mesh.position.set(
                    (col - (cols - 1) / 2) * spacing,
                    -(row - (rows - 1) / 2) * spacing,
                    0,
                );
                meshes.push(mesh);
                ctx.scene.add(mesh);

                // 球体下方显示参数标签
                const {sprite, texture} = makeLabelSprite(
                    `M ${metalness.toFixed(1)}  R ${roughness.toFixed(1)}`,
                );
                sprite.position.set(mesh.position.x, mesh.position.y - 1.15, mesh.position.z);
                sprite.scale.set(1.7, 0.42, 1);
                ctx.scene.add(sprite);
                labelTextures.push(texture);
                labelSprites.push(sprite);
            }
        }

        // 两个轴向箭头：在左上角球外围交点汇合，形成坐标轴式交角，不穿过球体
        // 第一球（左上角）：col 0, row 0 => x = -(cols-1)/2*spacing, y = +(rows-1)/2*spacing
        const firstX = -((cols - 1) / 2) * spacing;
        const firstY = ((rows - 1) / 2) * spacing;
        const axisSpan = (cols - 1) * spacing; // 跨过整排/整列的长度
        const radius = 0.8; // 球半径
        const offset = radius + 0.35; // 箭头离球面的外侧距离
        // 两轴交点：左上角球左上方外围角点
        const origin = new THREE.Vector3(firstX - offset, firstY + offset, 0);
        const extra = 0.9; // 超出最后一球球边缘外的额外延伸
        // 交点向右直到最后一球右边缘外再延伸 extra
        const spanX = axisSpan + offset + extra;
        // 交点向下直到最后一球下边缘外再延伸 extra
        const spanY = axisSpan + offset + extra;

        // metalness：沿 X 正方向（向右），位于第一行球上方外围
        const arrowM = new THREE.ArrowHelper(
            new THREE.Vector3(1, 0, 0),
            origin,
            spanX,
            0x38bdf8,
            0.3,
            0.18,
        );
        // roughness：沿 Y 负方向（向下），位于第一列球左侧外围
        const arrowR = new THREE.ArrowHelper(
            new THREE.Vector3(0, -1, 0),
            origin,
            spanY,
            0x34d399,
            0.3,
            0.18,
        );
        ctx.scene.add(arrowM, arrowR);

        // 交点向负方向各延伸一小段（不带箭头），让相交更明显（形成 L 形）
        const tailLen = 0.8;
        const mTailGeo = new THREE.BufferGeometry().setFromPoints([
            origin.clone().add(new THREE.Vector3(-tailLen, 0, 0)),
            origin.clone(),
        ]);
        const mTail = new THREE.Line(
            mTailGeo,
            new THREE.LineBasicMaterial({color: 0x38bdf8}),
        );
        const rTailGeo = new THREE.BufferGeometry().setFromPoints([
            origin.clone().add(new THREE.Vector3(0, tailLen, 0)),
            origin.clone(),
        ]);
        const rTail = new THREE.Line(
            rTailGeo,
            new THREE.LineBasicMaterial({color: 0x34d399}),
        );
        ctx.scene.add(mTail, rTail);

        // 轴中间只显示标签名
        const {sprite: mSprite, texture: mTex} = makeLabelSprite(
            'metalness',
            '#38bdf8',
            28,
            300,
            false,
        );
        mSprite.position.set(origin.x + spanX / 2, firstY + offset + 0.3, 0);
        mSprite.scale.set(2.0, 0.5, 1);
        ctx.scene.add(mSprite);

        const {sprite: rSprite, texture: rTex} = makeLabelSprite(
            'roughness',
            '#34d399',
            28,
            300,
            false,
        );
        rSprite.position.set(firstX - offset - 0.85, origin.y - spanY / 2, 0);
        rSprite.scale.set(2.0, 0.5, 1);
        ctx.scene.add(rSprite);

        // 各自轴的远端显示 "1"，紧贴箭头头部，位于轴线外侧（与轴名同侧）
        const {sprite: mOne, texture: mOneTex} = makeLabelSprite('1', '#38bdf8', 30, 256, false);
        mOne.position.set(origin.x + spanX - 0.3, firstY + offset + 0.3, 0);
        mOne.scale.set(0.85, 0.28, 1);
        ctx.scene.add(mOne);

        const {sprite: rOne, texture: rOneTex} = makeLabelSprite('1', '#34d399', 30, 256, false);
        rOne.position.set(firstX - offset - 0.35, origin.y - spanY + 0.3, 0);
        rOne.scale.set(0.85, 0.28, 1);
        ctx.scene.add(rOne);

        // 共用一个 "0"：显示在交点（原点）左上角负方向区域
        const {sprite: zeroSprite, texture: zeroTex} = makeLabelSprite(
            '0',
            '#e2e8f0',
            30,
            256,
            false,
        );
        zeroSprite.position.set(origin.x - 0.3, origin.y + 0.3, 0);
        zeroSprite.scale.set(0.85, 0.28, 1);
        ctx.scene.add(zeroSprite);

        const ambient = new THREE.AmbientLight(0xffffff, 0.3);
        ctx.scene.add(ambient);
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(3, 5, 4);
        ctx.scene.add(dirLight);

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'ambientIntensity',
                    label: '环境光强度',
                    type: 'range',
                    min: 0,
                    max: 3,
                    step: 0.05,
                    value: 0.3,
                    precision: 2,
                    desc: '环境光整体亮度，调为 0 时只剩平行光照明',
                },
                {
                    key: 'dirIntensity',
                    label: '平行光强度',
                    type: 'range',
                    min: 0,
                    max: 5,
                    step: 0.05,
                    value: 1,
                    precision: 2,
                    desc: '平行光亮度，调为 0 时球体失去明暗层次',
                },
            ],
            defaults: {ambientIntensity: 0.3, dirIntensity: 1},
            onChange(key, value) {
                switch (key) {
                    case 'ambientIntensity':
                        ambient.intensity = value;
                        break;
                    case 'dirIntensity':
                        dirLight.intensity = value;
                        break;
                }
            },
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
            meshes.forEach((m) => (m.rotation.y += 0.01));
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            envTex.dispose();
            pmrem.dispose();
            labelTextures.forEach((t) => t.dispose());
            labelSprites.forEach((s) => s.material.dispose());
            arrowM.dispose();
            arrowR.dispose();
            mTailGeo.dispose();
            rTailGeo.dispose();
            (mTail.material as THREE.Material).dispose();
            (rTail.material as THREE.Material).dispose();
            mTex.dispose();
            rTex.dispose();
            mSprite.material.dispose();
            rSprite.material.dispose();
            mOneTex.dispose();
            rOneTex.dispose();
            mOne.material.dispose();
            rOne.material.dispose();
            zeroTex.dispose();
            zeroSprite.material.dispose();
            panel.remove();
        });
    },
};
