import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {Lesson} from '../types';
import {createAxesWithLabels, createContext, makeCleanup} from '../helper';
import {createParamPanel} from '../paramPanel';

export const arrowHelper: Lesson = {
    id: 'arrow-helper',
    title: 'ArrowHelper 辅助箭头',
    description: `
    <h2>ArrowHelper 辅助箭头</h2>
    <p><code>ArrowHelper</code> 用一段带箭头头的线段在三维空间中直观表示<b>方向</b>与<b>长度</b>，常用于可视化向量、光线方向、力的方向等。</p>
    <h3>构造参数</h3>
    <pre><code>new THREE.ArrowHelper(
  direction,   // 方向（Vector3，内部会自动归一化）
  origin,      // 起点位置（Vector3）
  length,      // 总长度
  color,       // 颜色
  headLength,  // 箭头头部长度
  headWidth,   // 箭头头部宽度
)</code></pre>
    <h3>常用方法</h3>
    <ul>
      <li><code>setDirection(dir)</code>：修改方向</li>
      <li><code>setLength(length, headLength, headWidth)</code>：修改长度与头部尺寸</li>
      <li><code>setColor(color)</code>：修改颜色</li>
    </ul>
    <p>画布中黄色箭头会随「方向 X/Y/Z」参数改变指向，拖动参数面板即可体验上述方法的效果。</p>
  `,
    create(container) {
        const ctx = createContext(container);
        ctx.scene.background = new THREE.Color(0x111827);

        const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 100);
        camera.position.set(5, 4, 7);
        camera.lookAt(0, 0, 0);
        ctx.onResize((w, h) => {
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        });

        const controls = new OrbitControls(camera, ctx.renderer.domElement);
        controls.enableDamping = true;

        ctx.scene.add(createAxesWithLabels(3));
        ctx.scene.add(new THREE.GridHelper(10, 10, 0x475569, 0x1e293b));

        // 可动态修改的主箭头：方向随参数变化
        const mainArrow = new THREE.ArrowHelper(
            new THREE.Vector3(1, 1, 1).normalize(),
            new THREE.Vector3(0, 0, 0),
            3,
            0xffd60a,
            0.6,
            0.35,
        );
        ctx.scene.add(mainArrow);

        // 参数状态
        const state = {
            length: 3,
            headLength: 0.6,
            headWidth: 0.35,
          dirX: 1,
          dirY: 1,
          dirZ: 1,
        };

        const panel = createParamPanel({
            container,
            controls: [
                {
                    key: 'length',
                    label: '长度',
                    type: 'range',
                    min: 0.5,
                    max: 6,
                    step: 0.1,
                    value: state.length,
                    precision: 1
                },
                {
                    key: 'headLength',
                    label: '箭头长度',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    value: state.headLength,
                    precision: 2
                },
                {
                    key: 'headWidth',
                    label: '箭头宽度',
                    type: 'range',
                    min: 0,
                    max: 2,
                    step: 0.05,
                    value: state.headWidth,
                    precision: 2
                },
                {
                  key: 'dirX',
                  label: '方向 X',
                    type: 'range',
                  min: -2,
                  max: 2,
                  step: 0.05,
                  value: state.dirX,
                  precision: 2,
                  desc: '方向向量的 X 分量（内部自动归一化）'
                },
              {
                key: 'dirY',
                label: '方向 Y',
                type: 'range',
                min: -2,
                max: 2,
                step: 0.05,
                value: state.dirY,
                precision: 2,
                desc: '方向向量的 Y 分量（内部自动归一化）'
              },
              {
                key: 'dirZ',
                label: '方向 Z',
                type: 'range',
                min: -2,
                max: 2,
                    step: 0.05,
                value: state.dirZ,
                    precision: 2,
                desc: '方向向量的 Z 分量（内部自动归一化）'
                },
            ],
            defaults: {
                length: 3,
                headLength: 0.6,
                headWidth: 0.35,
              dirX: 1,
              dirY: 1,
              dirZ: 1,
            },
            onChange(key, value) {
                switch (key) {
                    case 'length':
                    case 'headLength':
                    case 'headWidth':
                        state[key] = value;
                        mainArrow.setLength(state.length, state.headLength, state.headWidth);
                        break;
                  case 'dirX':
                  case 'dirY':
                  case 'dirZ':
                    state[key] = value;
                        break;
                }
            },
        });

        // 提示
        const tip = document.createElement('div');
        tip.textContent = '拖动环绕观察 · 滚轮缩放 · 右侧参数面板控制箭头';
        tip.style.cssText =
            'position:absolute;left:16px;bottom:14px;color:#94a3b8;font-size:13px;pointer-events:none;';
        container.appendChild(tip);

        let raf = 0;
        const loop = () => {
            raf = requestAnimationFrame(loop);
          // 通过 setDirection 让主箭头指向三个方向分量组成的向量
          const dir = new THREE.Vector3(state.dirX, state.dirY, state.dirZ).normalize();
            mainArrow.setDirection(dir);
            controls.update();
            ctx.renderer.render(ctx.scene, camera);
        };
        loop();

        return makeCleanup(ctx, () => {
            cancelAnimationFrame(raf);
            controls.dispose();
            panel.remove();
            tip.remove();
        });
    },
};
