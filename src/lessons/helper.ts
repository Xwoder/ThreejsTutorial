import * as THREE from 'three';
import {Line2} from 'three/examples/jsm/lines/Line2.js';
import {LineGeometry} from 'three/examples/jsm/lines/LineGeometry.js';
import {LineMaterial} from 'three/examples/jsm/lines/LineMaterial.js';

/**
 * 通用图片纹理加载器，统一设置各向异性 + 跨域。
 * @param url 图片地址
 * @param options.colorSpace 颜色空间：sRGB 颜色贴图 / NoColorSpace 高度/法线等数据贴图
 * @param options.flipY 是否翻转 Y（PNG 漫反射通常 true，高度图通常 false）
 */
export function loadTexture(
  url: string,
  onLoad: (tex: THREE.Texture) => void,
  onError?: (err: unknown) => void,
  options: { colorSpace?: THREE.ColorSpace; flipY?: boolean } = {},
): void {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  loader.load(
    url,
    (t) => {
      if (options.colorSpace) t.colorSpace = options.colorSpace;
      if (options.flipY !== undefined) t.flipY = options.flipY;
      t.anisotropy = 8;
      onLoad(t);
    },
    undefined,
    onError,
  );
}

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** 画布容器尺寸变化时自动更新 */
  onResize: (cb: (width: number, height: number) => void) => void;
  getSize: () => { width: number; height: number };
}

/** 创建渲染器并处理容器尺寸变化，返回清理函数由调用方组合 */
export function createContext(container: HTMLElement): SceneContext {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  container.appendChild(canvas);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const scene = new THREE.Scene();

  const resizeCallbacks: ((w: number, h: number) => void)[] = [];
  const getSize = () => ({
    width: container.clientWidth || 1,
    height: container.clientHeight || 1,
  });

  const resize = () => {
    const { width, height } = getSize();
    renderer.setSize(width, height, false);
    resizeCallbacks.forEach((cb) => cb(width, height));
  };
  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  return {
    renderer,
    scene,
    onResize: (cb) => resizeCallbacks.push(cb),
    getSize,
  };
}

/** 通用清理：停止动画循环并销毁渲染器 */
export function makeCleanup(
  ctx: SceneContext,
  extra?: () => void,
): () => void {
  return () => {
    extra?.();
    ctx.renderer.dispose();
    ctx.renderer.domElement.remove();
  };
}

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
    new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }),
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
  const material = new LineMaterial({color, linewidth: width, worldUnits: true});
  const line = new Line2(geometry, material);
  line.computeLineDistances();
  // 避免短线段因包围球计算被错误裁剪
  line.frustumCulled = false;
  return line;
}

/**
 * 创建带 X/Y/Z 文字标签的坐标轴辅助对象。
 * X 轴为红色、Y 轴为绿色、Z 轴为蓝色，标签紧贴各轴线末端并始终显示在最前。
 *
 * @param size 坐标轴长度
 */
export function createAxesWithLabels(size = 6): THREE.Group {
  const group = new THREE.Group();

  // 加粗的轴线：粗细随坐标轴尺寸等比缩放
  const lineWidth = size * 0.01;
  [
    {dir: new THREE.Vector3(size, 0, 0), color: '#ff453a'},
    {dir: new THREE.Vector3(0, size, 0), color: '#32d74b'},
    {dir: new THREE.Vector3(0, 0, size), color: '#0a84ff'},
  ].forEach(({dir, color}) => {
    group.add(makeAxisLine(dir, color, lineWidth));
  });

  // 标签中心仅略超出轴末端，避免离顶端过远
  const d = size + 0.2;
  const labelScale = size * 0.28;
  const labels: { text: string; color: string; pos: THREE.Vector3 }[] = [
    { text: 'X', color: '#ff453a', pos: new THREE.Vector3(d, 0, 0) },
    { text: 'Y', color: '#32d74b', pos: new THREE.Vector3(0, d, 0) },
    { text: 'Z', color: '#0a84ff', pos: new THREE.Vector3(0, 0, d) },
  ];
  labels.forEach(({ text, color, pos }) => {
    const sprite = makeAxisLabel(text, color);
    sprite.position.copy(pos);
    sprite.scale.set(labelScale, labelScale, labelScale);
    group.add(sprite);
  });
  return group;
}
