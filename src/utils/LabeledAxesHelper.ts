import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

/** 生成带文字的精灵标签（用于坐标轴 X / Y / Z 标识） */
function makeAxisLabel(text: string, color: string): THREE.Sprite {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const c = canvas.getContext('2d')!;
    c.fillStyle = color;
    c.font = 'bold 84px sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, 64, 70);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({map: texture, transparent: true, depthTest: false}),
    );
    sprite.renderOrder = 999;
    return sprite;
}

/**
 * 创建一条加粗轴线（Line2 + 世界单位线宽，替代 WebGL 线宽受限的 AxesHelper）。
 * @param to 轴线终点（世界坐标，起点为原点）
 * @param color 颜色
 * @param width 线宽（世界单位）
 */
function makeAxisLine(to: THREE.Vector3, color: string, width: number): Line2 {
    const geometry = new LineGeometry();
    geometry.setPositions([0, 0, 0, to.x, to.y, to.z]);
    const material = new LineMaterial({color, linewidth: width, worldUnits: true, depthTest: false});
    const line = new Line2(geometry, material);
    line.computeLineDistances();
    // 避免短线段因包围球计算被错误裁剪
    line.frustumCulled = false;
    // 与标签一致：关闭深度测试，使轴线在任何视角（含从底部翻转）都能显示在最前
    line.renderOrder = 998;
    return line;
}

/**
 * 带 X/Y/Z 文字标签的坐标轴组件。
 * X 轴为红色、Y 轴为绿色、Z 轴为蓝色，标签紧贴各轴线末端并始终显示在最前。
 *
 * 用法：
 * ```ts
 * const axes = new LabeledAxesHelper(6);
 * scene.add(axes);
 * ```
 *
 * @param size 坐标轴长度
 */
export class LabeledAxesHelper extends THREE.Group {
    constructor(size = 6) {
        super();

        // 加粗的轴线：粗细随坐标轴尺寸等比缩放
        const lineWidth = size * 0.01;
        [
            {dir: new THREE.Vector3(size, 0, 0), color: '#ff453a'},
            {dir: new THREE.Vector3(0, size, 0), color: '#32d74b'},
            {dir: new THREE.Vector3(0, 0, size), color: '#0a84ff'},
        ].forEach(({dir, color}) => {
            this.add(makeAxisLine(dir, color, lineWidth));
        });

        // 标签紧贴轴末端，仅间隔很小一段距离
        const labelScale = size * 0.10;
        const d = size + labelScale * 0.25;
        // Y 轴竖直放置，视觉上容易贴着轴线，单独多留一点间距
        const dY = size + labelScale * 0.4;
        const labels: { text: string; color: string; pos: THREE.Vector3 }[] = [
            {text: 'X', color: '#ff453a', pos: new THREE.Vector3(d, 0, 0)},
            {text: 'Y', color: '#32d74b', pos: new THREE.Vector3(0, dY, 0)},
            {text: 'Z', color: '#0a84ff', pos: new THREE.Vector3(0, 0, d)},
        ];
        labels.forEach(({text, color, pos}) => {
            const sprite = makeAxisLabel(text, color);
            sprite.position.copy(pos);
            sprite.scale.set(labelScale, labelScale, labelScale);
            this.add(sprite);
        });
    }
}
