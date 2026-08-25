import {
  createControlPanelGroup,
  type ControlPanelButtonOptions,
  type ControlPanelGroup,
} from './controlPanel.ts';

export interface ParamSlider {
  key: string;
  label: string;
  /** 控件类型：'range' 为滑块（默认），'checkbox' 为勾选框，'color' 为颜色选择器（value 为 0xRRGGBB）；分组统一用 type:'group' 包裹 */
  type?: 'range' | 'checkbox' | 'color';
  min: number;
  max: number;
  step: number;
  value: number;
  /** 参数说明，显示在控件下方 */
  desc?: string;
  /** 数值显示小数位数（默认 2），仅 'range' 类型生效 */
  precision?: number;
  /** 是否禁用滑块，用于由外部逻辑而非用户直接控制的参数（如随画布变化的 aspect） */
  disabled?: boolean;
}

export interface ParamReadonly {
  /** 只读数值控件：仅展示 label + value，不渲染滑块 */
  type: 'readonly';
  key: string;
  label: string;
  value: number;
  /** 数值显示小数位数（默认 2） */
  precision?: number;
  /** 标签文字颜色（CSS 颜色值，如 '#ff5d5d'），用于按轴向等区分 */
  labelColor?: string;
}

export interface ParamGroup {
  /** 分组：自带圆角矩形包围框，并把 children 内的控件显式收纳进该框内部 */
  type: 'group';
  /** 分组标题文字（如 '波 2'） */
  label: string;
  /** 归属于该分组的控件列表，渲染时会被放入同一个包围框内 */
  children: ParamControl[];
}

export type ParamControl = ParamSlider | ParamReadonly | ParamGroup;

export interface ParamPanelOptions {
  /** 面板挂载容器 */
  container: HTMLElement;
  /** 控件定义列表，由页面自行定义与控制（支持滑块、只读数值、分组标题等） */
  controls: ParamControl[];
  /** 默认值，用于「重置参数」按钮 */
  defaults: Record<string, number>;
  /** 滑块数值变化回调（用户拖动或重置时触发） */
  onChange?: (key: string, value: number) => void;
  /** 渲染在滑块行与重置按钮之间的自定义内容（如复选框） */
  footer?: HTMLElement;
  /** 自定义重置逻辑；提供后「重置参数」按钮将只调用它，不再执行默认重置 */
  onReset?: () => void;
  /** 是否显示「重置参数」按钮（默认 true）；纯只读面板可设为 false */
  resettable?: boolean;
}

export interface ParamPanel {
  /** 面板根元素 */
  el: HTMLElement;
  /** 更新某个参数行的显示值（不改变禁用等状态，仅刷新数值） */
  setDisplay(key: string, value: number): void;
  /** 获取某个参数行的滑块元素 */
  getInput(key: string): HTMLInputElement | undefined;
  /** 在面板末尾追加一个「标题 + 按钮组」分组（见 createControlPanelGroup） */
  addControlGroup(options: ControlPanelButtonOptions): ControlPanelGroup;
  /** 从 DOM 中移除面板 */
  remove(): void;
}

/** 构建统一的参数调节面板，样式与相机控制面板一致，供各页面复用 */
export function createParamPanel(opts: ParamPanelOptions): ParamPanel {
  const { container, controls, defaults, onChange, footer, onReset } = opts;

  const el = document.createElement('div');
  el.className = 'camera-controls';
  el.innerHTML = `<div class="camera-controls-title">参数 <span>CONTROLS</span></div>`;

  const rows = new Map<string, { input?: HTMLInputElement; value: HTMLElement }>();

  const hexStr = (n: number) => '#' + (n & 0xffffff).toString(16).padStart(6, '0');

  // 将单个控件渲染并挂载到 parent 下（group 的 children 也通过它递归挂载到框内）
  const appendControl = (parent: HTMLElement, c: ParamControl) => {
    // 分组：自身就是一个圆角包围框对象，children 显式收纳进该框内部
    if (c.type === 'group') {
      const box = document.createElement('div');
      box.className = 'camera-control-group';
      const titleEl = document.createElement('div');
      titleEl.className = 'camera-control-group-title';
      titleEl.textContent = c.label;
      box.appendChild(titleEl);
      c.children.forEach((child) => appendControl(box, child));
      parent.appendChild(box);
      return;
    }

    const isCheckbox = c.type === 'checkbox';
    const isColor = c.type === 'color';

    // 只读数值：仅渲染 label + value，不创建 input
    if (c.type === 'readonly') {
      const row = document.createElement('div');
      row.className = 'camera-control-row';
      row.dataset.key = c.key;
      const header = document.createElement('div');
      header.className = 'camera-control-header';
      const label = document.createElement('span');
      label.textContent = c.label;
      if (c.labelColor) label.style.color = c.labelColor;
      const valueEl = document.createElement('span');
      valueEl.className = 'camera-control-value';
      valueEl.textContent = Number(c.value).toFixed(c.precision ?? 2);
      header.append(label, valueEl);
      row.appendChild(header);
      parent.appendChild(row);
      rows.set(c.key, {value: valueEl});
      return;
    }

    const row = document.createElement('div');
    row.className = 'camera-control-row';
    row.dataset.key = c.key;

    const header = document.createElement('div');
    header.className = 'camera-control-header';
    const label = document.createElement('span');
    label.textContent = c.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'camera-control-value';
    valueEl.textContent = isColor
        ? hexStr(c.value).toUpperCase()
        : Number(c.value).toFixed(c.precision ?? 2);
    header.append(label, valueEl);
    if (isCheckbox) valueEl.style.display = 'none';

    const input = document.createElement('input');
    if (isCheckbox) {
      input.type = 'checkbox';
      input.checked = c.value >= 0.5;
      if (c.disabled) input.disabled = true;
      input.addEventListener('change', () => {
        const v = input.checked ? 1 : 0;
        onChange?.(c.key, v);
      });
      // 勾选框与标题同行显示
      header.appendChild(input);
    } else if (isColor) {
      input.type = 'color';
      input.value = hexStr(c.value);
      if (c.disabled) input.disabled = true;
      input.addEventListener('input', () => {
        const v = parseInt(input.value.slice(1), 16);
        valueEl.textContent = hexStr(v).toUpperCase();
        onChange?.(c.key, v);
      });
      // 颜色选择器与标题同行显示
      header.appendChild(input);
    } else {
      input.type = 'range';
      input.min = String(c.min);
      input.max = String(c.max);
      input.step = String(c.step);
      input.value = String(c.value);
      if (c.disabled) input.disabled = true;
      input.addEventListener('input', () => {
        const v = Number(input.value);
        valueEl.textContent = v.toFixed(c.precision ?? 2);
        onChange?.(c.key, v);
      });
    }

    row.appendChild(header);

    // 勾选框与颜色选择器已放进 header，其余类型（滑块）放在 header 之后
    if (!isCheckbox && !isColor) {
      row.appendChild(input);
    }

    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }

    parent.appendChild(row);
    rows.set(c.key, { input, value: valueEl });
  };

  controls.forEach((c) => appendControl(el, c));

  if (footer) el.appendChild(footer);

  if (opts.resettable !== false) {
    const resetBtn = document.createElement('button');
    resetBtn.className = 'camera-control-reset';
    resetBtn.textContent = '重置参数';
    resetBtn.addEventListener('click', () => {
      if (onReset) {
        onReset();
        return;
      }
      const resetControl = (c: ParamControl) => {
        if (c.type === 'group') {
          c.children.forEach(resetControl);
          return;
        }
        const def = defaults[c.key];
        if (def === undefined) return;
        const row = rows.get(c.key)!;
        if (c.type === 'checkbox') {
          row.input!.checked = def >= 0.5;
        } else if (c.type === 'color') {
          row.input!.value = hexStr(def);
          row.value.textContent = hexStr(def).toUpperCase();
        } else if (c.type === 'readonly') {
          row.value.textContent = Number(def).toFixed(c.precision ?? 2);
          onChange?.(c.key, def);
        } else {
          row.input!.value = String(def);
          row.value.textContent = Number(def).toFixed(c.precision ?? 2);
          onChange?.(c.key, def);
        }
      };
      controls.forEach(resetControl);
    });
    el.appendChild(resetBtn);
  }

  container.appendChild(el);

  return {
    el,
    setDisplay(key, value) {
      const row = rows.get(key);
      if (!row) return;
      const findControl = (list: ParamControl[]): ParamSlider | ParamReadonly | undefined => {
        for (const item of list) {
          if (item.type === 'group') {
            const found = findControl(item.children);
            if (found) return found;
          } else if (item.key === key) {
            return item;
          }
        }
        return undefined;
      };
      const c = findControl(controls);
      const precision = c?.precision ?? 2;
      if (c?.type === 'checkbox') {
        row.input!.checked = value >= 0.5;
      } else if (c?.type === 'color') {
        row.input!.value = hexStr(value);
        row.value.textContent = hexStr(value).toUpperCase();
      } else if (c?.type === 'readonly') {
        row.value.textContent = Number(value).toFixed(precision);
      } else {
        row.input!.value = String(value);
        row.value.textContent = Number(value).toFixed(precision);
      }
    },
    getInput(key) {
      return rows.get(key)?.input;
    },
    addControlGroup(options) {
      const group = createControlPanelGroup(options);
      el.appendChild(group.el);
      return group;
    },
    remove() {
      el.remove();
    },
  };
}
