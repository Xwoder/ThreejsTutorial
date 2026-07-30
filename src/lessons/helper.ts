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
