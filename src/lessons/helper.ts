import * as THREE from 'three';

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
 * 创建带 X/Y/Z 文字标签的坐标轴辅助对象。
 * X 轴为红色、Y 轴为绿色、Z 轴为蓝色，标签放在各轴线末端并始终显示在最前。
 *
 * @param size 坐标轴长度
 */
export function createAxesWithLabels(size = 6): THREE.Group {
  const group = new THREE.Group();
  group.add(new THREE.AxesHelper(size));

  const d = size + 0.6;
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
