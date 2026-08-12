import * as THREE from 'three';

/**
 * 通用图片纹理加载器，统一设置各向异性 + 跨域。
 * @param url 图片地址
 * @param onLoad
 * @param onError
 * @param options
 * @param options.colorSpace 颜色空间：sRGB 颜色贴图 / NoColorSpace 高度/法线等数据贴图
 * @param options.flipY 是否翻转 Y（PNG 漫反射通常 true，高度图通常 false）
 */
/**
 * 加载纹理资源，支持自定义颜色空间、Y 轴翻转和各项异性过滤。
 * @param url - 纹理图片的 URL 地址
 * @param onLoad - 纹理加载成功后的回调，接收加载完成的 Texture 对象
 * @param onError - 可选，纹理加载失败时的回调
 * @param options - 可选配置项
 * @param options.colorSpace - 可选，纹理的颜色空间（如 SRGBColorSpace）
 * @param options.flipY - 可选，是否翻转纹理的 Y 轴
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


