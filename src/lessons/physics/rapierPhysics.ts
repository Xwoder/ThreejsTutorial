import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import {createContext, makeCleanup} from '../helper';
import type {Lesson} from '../types';
import type RAPIER from '@dimforge/rapier3d-compat';

const rapierDescription = `
  <h2>Rapier 物理引擎</h2>
  <p>本例演示在 Three.js 中集成 <b>Rapier</b>（基于 Rust/wasm 的高性能物理引擎）。</p>
  <p>逻辑流程：</p>
  <ol>
    <li>调用 <code>await RAPIER.init()</code> 异步加载物理引擎内核；</li>
    <li>创建 <code>World</code> 并设置重力 <code>world.gravity = { x:0, y:-9.81, z:0 }</code>；</li>
    <li>为每个 Three.js 网格创建对应的刚体（<code>RigidBodyDesc</code>）与碰撞体（<code>ColliderDesc</code>）；</li>
    <li>每帧调用 <code>world.step()</code> 推进物理，再把刚体的 <code>translation / rotation</code> 同步到网格。</li>
  </ol>
  <p>场景中：地面为<b>固定刚体</b>（static），彩色立方体为<b>动态刚体</b>（dynamic），受重力下落并相互堆叠碰撞。点击「重置」可让所有方块重新从高处落下。</p>
  <p>使用 <code>@dimforge/rapier3d-compat</code> 包，wasm 已内联为 base64，无需额外 Vite 配置即可直接运行。</p>
`;

export const rapierPhysics: Lesson = {
    id: 'physics/rapier',
    title: 'Rapier 物理引擎',
    description: rapierDescription,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x0f172a);

        const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
        camera.position.set(7, 6, 9);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const orbit = new OrbitControls(camera, ctx.renderer.domElement);
        orbit.enableDamping = true;
        orbit.target.set(0, 1, 0);

        // 光照：环境光提供整体基础亮度，平行光模拟主光源（太阳光）
        const ambient = new THREE.AmbientLight(0xffffff, 0.9);
        ctx.scene.add(ambient);
        const dir = new THREE.DirectionalLight(0xffffff, 1.8);
        dir.position.set(6, 10, 4);
        ctx.scene.add(dir);
        // 让主平行光跟随相机方向，保证正对视角的面始终被照亮，
        // 避免滚轮拉近/旋转后看到背光暗面而显得「变暗」
        const syncLightToCamera = () => {
            const dirVec = new THREE.Vector3();
            camera.getWorldDirection(dirVec);
            dir.position.copy(camera.position).addScaledVector(dirVec, -10);
            dir.target.position.copy(camera.position).addScaledVector(dirVec, 10);
            dir.target.updateMatrixWorld();
        };
        syncLightToCamera();

        // 地面网格（仅用于显示）
      const groundGeo = new THREE.BoxGeometry(20, 0.5, 20);
        const groundMat = new THREE.MeshStandardMaterial({color: 0x999999, roughness: 0.9});
        const groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.position.y = -0.25;
        ctx.scene.add(groundMesh);

        let raf = 0;
        // 在 `create` 返回之后全局可见，供清理逻辑判断资源归属
        let world: RAPIER.World | null = null;
        let infoPanel: HTMLDivElement | null = null;
        const dynamicObjs: { body: RAPIER.RigidBody; mesh: THREE.Mesh }[] = [];

        const run = async () => {
            await import('@dimforge/rapier3d-compat').then((m) => m.init());
            const RAPIER_NS = await import('@dimforge/rapier3d-compat');
            const R = RAPIER_NS;

            const w = new R.World({x: 0, y: -9.81, z: 0});
            world = w;

            // 右上角只读面板：固定显示重力向量 (gx, gy, gz)，不可修改
            const gravity = w.gravity;
            infoPanel = document.createElement('div');
            infoPanel.className = 'gravity-info';
            infoPanel.innerHTML =
                `<div class="gravity-info__title">重力向量 (固定)</div>` +
                `<div class="gravity-info__row">` +
                `<span class="gravity-info__dot gravity-info__dot--x"></span>` +
                `<span class="gravity-info__axis">X</span>` +
                `<span class="gravity-info__value">${gravity.x.toFixed(2)}</span>` +
                `<span class="gravity-info__unit">m/s²</span></div>` +
                `<div class="gravity-info__row">` +
                `<span class="gravity-info__dot gravity-info__dot--y"></span>` +
                `<span class="gravity-info__axis">Y</span>` +
                `<span class="gravity-info__value">${gravity.y.toFixed(2)}</span>` +
                `<span class="gravity-info__unit">m/s²</span></div>` +
                `<div class="gravity-info__row">` +
                `<span class="gravity-info__dot gravity-info__dot--z"></span>` +
                `<span class="gravity-info__axis">Z</span>` +
                `<span class="gravity-info__value">${gravity.z.toFixed(2)}</span>` +
                `<span class="gravity-info__unit">m/s²</span></div>`;
            container.appendChild(infoPanel);

            // 地面：固定刚体 + 立方体碰撞体
            const groundBody = w.createRigidBody(R.RigidBodyDesc.fixed().setTranslation(0, -0.25, 0));
          w.createCollider(R.ColliderDesc.cuboid(10, 0.25, 10), groundBody);

            const colors = [0xff5d5d, 0xffb84d, 0xffe65d, 0x5dff8f, 0x5dc8ff, 0xb45dff, 0xff5dd6];
            const spawn = (count: number) => {
                for (let i = 0; i < count; i++) {
                    const size = 0.8 + Math.random() * 0.6;
                    const x = (Math.random() - 0.5) * 6;
                    const z = (Math.random() - 0.5) * 6;
                    const y = 4 + i * 1.2;

                    const geo = new THREE.BoxGeometry(size, size, size);
                    const mat = new THREE.MeshStandardMaterial({
                        color: colors[i % colors.length],
                        roughness: 0.4,
                        metalness: 0.1,
                    });
                    const mesh = new THREE.Mesh(geo, mat);
                    ctx.scene.add(mesh);

                    const body = w.createRigidBody(
                        R.RigidBodyDesc.dynamic().setTranslation(x, y, z).setRotation(randomQuat()),
                    );
                    w.createCollider(R.ColliderDesc.cuboid(size / 2, size / 2, size / 2), body);

                    dynamicObjs.push({body, mesh});
                }
            };

            const reSpawn = () => {
                for (const {body} of dynamicObjs) w.removeRigidBody(body);
                dynamicObjs.forEach(({mesh}) => {
                    ctx.scene.remove(mesh);
                    mesh.geometry.dispose();
                    (mesh.material as THREE.Material).dispose();
                });
                dynamicObjs.length = 0;
                spawn(7);
            };

            spawn(7);

          // 在参数面板的「重置参数」按钮下方新增「重放」按钮，功能等同于原重置按钮
          const replayBtn = document.createElement('button');
          replayBtn.type = 'button';
          replayBtn.className = 'camera-control-reset';
          replayBtn.style.marginTop = '8px';
          replayBtn.textContent = '重放';
          replayBtn.addEventListener('click', reSpawn);
            infoPanel.appendChild(replayBtn);

            const clock = new THREE.Clock();
            const loop = () => {
                raf = requestAnimationFrame(loop);
                const dt = Math.min(clock.getDelta(), 1 / 30);
                w.step();
                for (const {body, mesh} of dynamicObjs) {
                    const t = body.translation();
                    const r = body.rotation();
                    mesh.position.set(t.x, t.y, t.z);
                    mesh.quaternion.set(r.x, r.y, r.z, r.w);
                }
                orbit.update();
                syncLightToCamera();
                ctx.renderer.render(ctx.scene, camera);
                void dt;
            };
            loop();
        };

        run();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            orbit.dispose();
            infoPanel?.remove();
            world?.free();
            for (const {mesh} of dynamicObjs) {
                ctx.scene.remove(mesh);
                mesh.geometry.dispose();
                (mesh.material as THREE.Material).dispose();
            }
            dynamicObjs.length = 0;
        });
    },
};

/** 生成随机初始朝向四元数（防止方块完美对齐，碰撞更自然） */
function randomQuat(): { x: number; y: number; z: number; w: number } {
    const ax = Math.random();
    const ay = Math.random();
    const az = Math.random();
    const angle = Math.random() * Math.PI;
    const s = Math.sin(angle / 2);
    return {x: ax * s, y: ay * s, z: az * s, w: Math.cos(angle / 2)};
}
