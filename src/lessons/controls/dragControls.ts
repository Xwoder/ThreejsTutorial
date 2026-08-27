import * as THREE from 'three';
import { DragControls } from 'three/examples/jsm/controls/DragControls.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Lesson } from '../types';
import {setSceneBackground, createContext, makeCleanup} from '../helper';

export const dragControls: Lesson = {
  id: 'controls/drag-controls',
  title: 'DragControls 拖拽控制器',
  description: `
    <h2>用鼠标直接拖动物体</h2>
    <p><code>DragControls</code> 让你能够<b>直接用鼠标在场景中拖动网格物体</b>，常用于搭建、编辑或交互式演示。它操作的是物体本身的位置，而不是相机：</p>
    <pre><code>import { DragControls } from 'three/examples/jsm/controls/DragControls.js';

const controls = new DragControls(objects, camera, renderer.domElement);

// 拖拽开始时关闭相机控制，避免冲突
controls.addEventListener('dragstart', () => orbit.enabled = false);
controls.addEventListener('dragend',   () => orbit.enabled = true);</code></pre>
    <h3>事件与属性</h3>
    <ul>
      <li><b>dragstart / drag / dragend</b>：拖拽生命周期事件</li>
      <li><b>hoveron / hoveroff</b>：鼠标悬停到可拖拽物体上/离开时触发</li>
      <li><code>controls.recursive = true</code>：递归检测子对象（默认仅检测传入数组本身）</li>
      <li><code>controls.transformGroup = true</code>：把传入数组整体当作一个组拖动</li>
      <li><code>controls.mode = 'translate' | 'rotate' | 'scale'</code>：拖拽变换模式</li>
    </ul>
    <h3>操作方式</h3>
    <ul>
      <li><b>左键按住物体拖动</b>：在平行于相机的平面内移动该物体</li>
      <li><b>OrbitControls 仍可用</b>：在不按住物体时旋转/缩放查看场景</li>
    </ul>
    <p>试试在画布中拖动不同的彩色立方体，松手后即可继续用鼠标旋转视角。</p>
  `,
  create(container) {
    const ctx = createContext(container);
      setSceneBackground(ctx, 0x0f172a);

    const { width, height } = ctx.getSize();
    const camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 100);
    camera.position.set(6, 6, 8);
    ctx.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });

    ctx.scene.add(new THREE.GridHelper(14, 14, 0x475569, 0x1e293b));

    const colors = [0xc084fc, 0x22c55e, 0x38bdf8, 0xf59e0b, 0xef4444];
    const draggables: THREE.Mesh[] = [];
    const boxGeo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    colors.forEach((color, i) => {
      const mesh = new THREE.Mesh(
        boxGeo,
        new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.5 }),
      );
      const angle = (i / colors.length) * Math.PI * 2;
      mesh.position.set(Math.cos(angle) * 3.5, 0.6, Math.sin(angle) * 3.5);
      ctx.scene.add(mesh);
      draggables.push(mesh);
    });

    ctx.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight.position.set(5, 8, 4);
    ctx.scene.add(dirLight);

    const orbit = new OrbitControls(camera, ctx.renderer.domElement);
    orbit.enableDamping = true;
    orbit.target.set(0, 0.6, 0);

    const drag = new DragControls(draggables, camera, ctx.renderer.domElement);
    drag.addEventListener('dragstart', () => {
      orbit.enabled = false;
    });
    drag.addEventListener('dragend', () => {
      orbit.enabled = true;
    });
    // 拖拽时夹紧到地面之上，避免物体沉入网格
    drag.addEventListener('drag', (event) => {
      const obj = event.object as THREE.Object3D;
      obj.position.y = Math.max(0.6, obj.position.y);
    });

    let raf = 0;
    const loop = () => {
      raf = requestAnimationFrame(loop);
      orbit.update();
      ctx.renderer.render(ctx.scene, camera);
    };
    loop();

    return makeCleanup(ctx, () => {
      cancelAnimationFrame(raf);
      drag.dispose();
      orbit.dispose();
    });
  },
};
