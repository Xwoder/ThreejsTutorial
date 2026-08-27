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
 * 课程切换后加载才完成时（alive() 返回 false），自动释放已下载的纹理，避免显存泄漏。
 * @param url - 纹理图片的 URL 地址
 * @param onLoad - 纹理加载成功后的回调，接收加载完成的 Texture 对象
 * @param onError - 可选，纹理加载失败时的回调
 * @param options - 可选配置项
 * @param options.colorSpace - 可选，纹理的颜色空间（如 SRGBColorSpace）
 * @param options.flipY - 可选，是否翻转纹理的 Y 轴
 * @param options.alive - 可选，判断课程是否仍存活；返回 false 时丢弃结果并释放纹理
 */
export function loadTexture(
  url: string,
  onLoad: (tex: THREE.Texture) => void,
  onError?: (err: unknown) => void,
  options: { colorSpace?: THREE.ColorSpace; flipY?: boolean; alive?: () => boolean } = {},
): void {
  const loader = new THREE.TextureLoader();
  loader.setCrossOrigin('anonymous');
  const isAlive = options.alive ?? (() => true);
  loader.load(
    url,
    (t) => {
      if (!isAlive()) {
        t.dispose();
        return;
      }
      if (options.colorSpace) t.colorSpace = options.colorSpace;
      if (options.flipY !== undefined) t.flipY = options.flipY;
      t.anisotropy = 8;
      onLoad(t);
    },
    undefined,
      (err) => {
        // 课程已切换时静默丢弃，避免操作已移除的 DOM / 失效对象
        if (isAlive()) onError?.(err);
      },
  );
}

export interface SceneContext {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  /** 画布容器尺寸变化时自动更新 */
  onResize: (cb: (width: number, height: number) => void) => void;
  getSize: () => { width: number; height: number };
  /** 释放内部资源（ResizeObserver 等），由 makeCleanup 自动调用 */
  dispose: () => void;
}

/** 场景背景色常量：集中管理，避免各课程散落魔法数字 */
/** 通用深灰底（绝大多数课程默认背景） */
export const BG_DARK = 0x111827;
/** 偏蓝深底（物理、部分控制器课程） */
export const BG_DARK_BLUE = 0x0f172a;
/** 深海军蓝（灯光类课程） */
export const BG_DARK_NAVY = 0x0d1b2a;
/** 深石板色（方向光、飞行/立方相机） */
export const BG_DARK_SLATE = 0x0b1120;
/** 深墨色（魔方课程） */
export const BG_DARK_INK = 0x0b1020;
/** 深面板色（地图控制器） */
export const BG_DARK_PANEL = 0x0b1220;
/** 峡谷暖深底（峡谷示例，保留为命名常量） */
export const BG_CANYON = 0x1b1f24;
/** 晴空蓝（山脉地形示例，模拟天空） */
export const BG_SKY = 0x87ceeb;
/** 星空黑（太阳系示例） */
export const BG_SPACE = 0x05070f;

/**
 * 统一设置场景背景色。仅负责设置背景，不参与主题切换——
 * 各课程传入自己的深色/黑色底色，浅色模式下也保持该深色。
 */
export function setSceneBackground(ctx: SceneContext, hex: number): void {
  ctx.scene.background = new THREE.Color(hex);
}

/** 为没有 ctx 的独立场景（如对比课程共用一个 scene）统一设置背景色 */
export function setSceneBackgroundForScene(scene: THREE.Scene, hex: number): void {
  scene.background = new THREE.Color(hex);
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

    const ctx: SceneContext = {
    renderer,
    scene,
    onResize: (cb) => resizeCallbacks.push(cb),
    getSize,
    dispose: () => {
      observer.disconnect();
      resizeCallbacks.length = 0;
    },
  };
    return ctx;
}

/** 材质上可能持有纹理的全部标准属性名（含 newer PBR 扩展贴图） */
const MATERIAL_TEXTURE_PROPS = [
  'map', 'normalMap', 'roughnessMap', 'metalnessMap', 'aoMap',
  'displacementMap', 'bumpMap', 'alphaMap', 'emissiveMap', 'envMap',
  'lightMap', 'specularMap', 'gradientMap', 'matcap',
  'sheenColorMap', 'sheenRoughnessMap', 'clearcoatMap',
  'clearcoatRoughnessMap', 'clearcoatNormalMap', 'iridescenceMap',
  'iridescenceThicknessMap', 'specularIntensityMap', 'specularColorMap',
  'transmissionMap', 'thicknessMap', 'anisotropyMap',
] as const;

/** 释放单个材质及其引用的全部纹理（含自定义 ShaderMaterial uniforms 中的纹理） */
export function disposeMaterial(material: THREE.Material): void {
  const target = material as unknown as Record<string, unknown>;
  for (const key of MATERIAL_TEXTURE_PROPS) {
    const tex = target[key];
    if (tex instanceof THREE.Texture) tex.dispose();
  }
  // ShaderMaterial / RawShaderMaterial uniforms 中的纹理
  const uniforms = (material as THREE.ShaderMaterial).uniforms;
  if (uniforms) {
    for (const name in uniforms) {
      const value = uniforms[name]?.value;
      if (value instanceof THREE.Texture) {
        value.dispose();
      } else if (Array.isArray(value)) {
        for (const item of value) {
          if (item instanceof THREE.Texture) item.dispose();
        }
      }
    }
  }
  material.dispose();
}

/** 递归释放 Object3D 树上的几何体、材质及其纹理（dispose 幂等，可安全重复调用） */
export function disposeObject3D(root: THREE.Object3D): void {
  root.traverse((obj) => {
    const sprite = obj as THREE.Sprite;
    // Sprite 使用模块级共享几何体，不释放
    if (!sprite.isSprite) {
      const mesh = obj as THREE.Mesh;
      if (mesh.geometry) mesh.geometry.dispose();
      // InstancedMesh 的实例数据单独持有，需显式释放
      const instanced = obj as THREE.InstancedMesh;
      if (instanced.isInstancedMesh) {
        instanced.instanceMatrix?.dispose();
        instanced.instanceColor?.dispose();
      }
    }
    // 材质（单个或材质数组）
    const material = (obj as THREE.Mesh).material;
    if (material) {
      const materials = Array.isArray(material) ? material : [material];
      for (const m of materials) {
        if (m) disposeMaterial(m);
      }
    }
  });
}

/**
 * 通用清理：停止动画循环、释放场景内全部 GPU 资源并销毁渲染器。
 * 课程自定义清理（取消 rAF、销毁控件、移除 DOM）通过 extra 传入，先于资源释放执行。
 */
export function makeCleanup(
  ctx: SceneContext,
  extra?: () => void,
): () => void {
  return () => {
    extra?.();
    // 断开 ResizeObserver，停止对容器尺寸变化的监听
    ctx.dispose();
    // 释放场景中的几何体、材质与纹理
    disposeObject3D(ctx.scene);
    // 释放场景级资源（背景 / 环境贴图）
    if (ctx.scene.background instanceof THREE.Texture) ctx.scene.background.dispose();
    if (ctx.scene.environment instanceof THREE.Texture) ctx.scene.environment.dispose();
    ctx.renderer.dispose();
    ctx.renderer.domElement.remove();
  };
}


