import {
  createControlPanelGroup,
  type ControlPanelButtonOptions,
  type ControlPanelGroup,
} from './controlPanel.ts';

export interface ParamSlider {
  key: string;
  label: string;
  /** 控件类型：'range' 为滑块（默认），'checkbox' 为勾选框，'color' 为颜色选择器（value 为 0xRRGGBB），'stepper' 为加减步进器；分组统一用 type:'group' 包裹 */
  type?: 'range' | 'checkbox' | 'color' | 'stepper';
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

/** 加减步进器：标题与「减号 / 输入框 / 加号」同行显示，点击按钮按 step 调节 */
export interface ParamStepper {
  key: string;
  label: string;
  type: 'stepper';
  min: number;
  max: number;
  step: number;
  value: number;
  /** 参数说明，显示在控件下方 */
  desc?: string;
  /** 数值显示小数位数（默认 2） */
  precision?: number;
  /** 是否禁用步进器 */
  disabled?: boolean;
}

/** 分段按钮组的一个选项 */
export interface ParamSegmentedOption {
  /** 按钮文字 */
  label: string;
  /** 选中该按钮时回调给 onChange 的数值 */
  value: number;
  /** 鼠标悬停提示，可选 */
  title?: string;
}

/** 分段按钮组：标题与若干互斥按钮同行显示，点击按钮直接切换到对应数值（视觉同左上角视图选项卡） */
export interface ParamSegmented {
  /** 控件类型：'segmented' 为分段按钮组 */
  type: 'segmented';
  key: string;
  label: string;
  /** 初始值，应为 options 中某一项的 value */
  value: number;
  /** 可选项，至少两项；不限于两项 */
  options: ParamSegmentedOption[];
  /** 参数说明，显示在控件下方 */
  desc?: string;
  /** 是否禁用该组按钮 */
  disabled?: boolean;
}

export interface ParamReadonly {
  /** 只读数值控件：仅展示 label + value，不渲染滑块 */
  type: 'readonly';
  key: string;
  label: string;
  /** 数值或自定义字符串；传字符串时按原样展示（如位置 '(x, y, z)'），忽略 precision */
  value: number | string;
  /** 数值显示小数位数（默认 2），仅当 value 为 number 时生效 */
  precision?: number;
  /**
   * 标签文字颜色（CSS 颜色值），用于按轴向等区分。
   * 传 'var(--pp-axis-x)' 这类主题变量可自动跟随浅色 / 深色主题变化。
   */
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

export type ParamControl =
    | ParamSlider
    | ParamReadonly
    | ParamGroup
    | ParamStepper
    | ParamSegmented;

export interface ParamPanelOptions {
  /** 面板挂载容器 */
  container: HTMLElement;
  /** 控件定义列表，由页面自行定义与控制（支持滑块、只读数值、分组标题等） */
  controls: ParamControl[];
  /** 默认值，用于「重置参数」按钮 */
  defaults: Record<string, number | string>;
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
  setDisplay(key: string, value: number | string): void;
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

  const rows = new Map<
      string,
      { input?: HTMLInputElement; value: HTMLElement; setValue?: (v: number) => void }
  >();

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

    let row: HTMLElement;
    let input: HTMLInputElement | undefined;
    /** 无 input 的控件（分段按钮组）用它回写选中态 */
    let setValue: ((v: number) => void) | undefined;

    switch (c.type) {
      case 'readonly':
        row = createReadonly(c);
        break;
      case 'checkbox':
        [row, input] = createCheckboxRow(c);
        break;
      case 'color':
        [row, input] = createColorRow(c);
        break;
      case 'stepper':
        [row, input] = createStepper(c as ParamStepper);
        break;
      case 'segmented':
        [row, , setValue] = createSegmented(c as ParamSegmented);
        break;
      case 'range':
      default:
        [row, input] = createSliderRow(c);
        break;
    }

    parent.appendChild(row);
    const valueEl = row.querySelector<HTMLElement>('.camera-control-value')!;
    rows.set(c.key, {input, value: valueEl, setValue});
  };

  const createReadonly = (c: ParamReadonly): HTMLElement => {
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
    valueEl.textContent = typeof c.value === 'string'
        ? c.value
        : Number(c.value).toFixed(c.precision ?? 2);
    header.append(label, valueEl);
    row.appendChild(header);
    return row;
  };

  const createSliderRow = (c: ParamSlider): [HTMLElement, HTMLInputElement] => {
    const row = document.createElement('div');
    row.className = 'camera-control-row';
    row.dataset.key = c.key;

    const header = document.createElement('div');
    header.className = 'camera-control-header';
    const label = document.createElement('span');
    label.textContent = c.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'camera-control-value';
    valueEl.textContent = Number(c.value).toFixed(c.precision ?? 2);
    header.append(label, valueEl);

    const input = document.createElement('input');
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

    row.append(header, input);
    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }
    return [row, input];
  };

  const createCheckboxRow = (c: ParamSlider): [HTMLElement, HTMLInputElement] => {
    const row = document.createElement('div');
    row.className = 'camera-control-row';
    row.dataset.key = c.key;

    const header = document.createElement('div');
    header.className = 'camera-control-header';
    const label = document.createElement('span');
    label.textContent = c.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'camera-control-value';
    valueEl.style.display = 'none';
    header.append(label, valueEl);

    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = c.value >= 0.5;
    if (c.disabled) input.disabled = true;
    input.addEventListener('change', () => {
      const v = input.checked ? 1 : 0;
      onChange?.(c.key, v);
    });
    // 勾选框与标题同行显示
    header.appendChild(input);

    row.appendChild(header);
    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }
    return [row, input];
  };

  const createColorRow = (c: ParamSlider): [HTMLElement, HTMLInputElement] => {
    const row = document.createElement('div');
    row.className = 'camera-control-row';
    row.dataset.key = c.key;

    const header = document.createElement('div');
    header.className = 'camera-control-header';
    const label = document.createElement('span');
    label.textContent = c.label;
    const valueEl = document.createElement('span');
    valueEl.className = 'camera-control-value';
    valueEl.textContent = hexStr(c.value).toUpperCase();
    header.append(label, valueEl);

    const input = document.createElement('input');
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

    row.appendChild(header);
    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }
    return [row, input];
  };

  const createStepper = (c: ParamStepper): [HTMLElement, HTMLInputElement] => {
    const row = document.createElement('div');
    row.className = 'camera-control-row camera-control-stepper-row';
    row.dataset.key = c.key;

    const header = document.createElement('div');
    header.className = 'camera-control-header camera-control-stepper-header';
    const label = document.createElement('span');
    label.className = 'camera-control-label';
    label.textContent = c.label;
    header.appendChild(label);

    const stepper = document.createElement('div');
    stepper.className = 'camera-control-stepper';

    const minusBtn = document.createElement('button');
    minusBtn.type = 'button';
    minusBtn.className = 'camera-control-step-btn';
    minusBtn.textContent = '−';
    const valueInput = document.createElement('input');
    valueInput.type = 'text';
    valueInput.className = 'camera-control-step-input';
    valueInput.value = Number(c.value).toFixed(c.precision ?? 2);
    valueInput.inputMode = 'decimal';
    const plusBtn = document.createElement('button');
    plusBtn.type = 'button';
    plusBtn.className = 'camera-control-step-btn';
    plusBtn.textContent = '+';
    stepper.append(minusBtn, valueInput, plusBtn);
    header.appendChild(stepper);

    const valueEl = document.createElement('span');
    valueEl.className = 'camera-control-value';
    valueEl.style.display = 'none';
    header.appendChild(valueEl);

    const clamp = (v: number) => Math.min(c.max, Math.max(c.min, v));

    const commit = (v: number) => {
      const cv = clamp(v);
      valueInput.value = Number(cv).toFixed(c.precision ?? 2);
      valueEl.textContent = Number(cv).toFixed(c.precision ?? 2);
      onChange?.(c.key, cv);
    };

    minusBtn.addEventListener('click', () => {
      if (c.disabled) return;
      commit(Number(valueInput.value) - c.step);
    });
    plusBtn.addEventListener('click', () => {
      if (c.disabled) return;
      commit(Number(valueInput.value) + c.step);
    });
    valueInput.addEventListener('change', () => {
      let v = Number(valueInput.value);
      if (!isFinite(v)) v = c.value;
      commit(v);
    });
    valueInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') valueInput.blur();
    });

    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }
    row.insertBefore(header, row.firstChild);
    return [row, valueInput];
  };

  const createSegmented = (
      c: ParamSegmented,
  ): [HTMLElement, undefined, (v: number) => void] => {
    const row = document.createElement('div');
    row.className = 'camera-control-row camera-control-segmented-row';
    row.dataset.key = c.key;

    const header = document.createElement('div');
    header.className = 'camera-control-header camera-control-segmented-header';
    const label = document.createElement('span');
    label.className = 'camera-control-label';
    label.textContent = c.label;
    header.appendChild(label);

    const group = document.createElement('div');
    group.className = 'camera-control-segmented';

    let current = c.value;
    const btns: { el: HTMLButtonElement; value: number }[] = [];
    // 只刷新按钮高亮，不触发 onChange（供外部回写与「重置参数」复用）
    const sync = () => {
      btns.forEach((b) => b.el.classList.toggle('active', b.value === current));
    };

    c.options.forEach((opt) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'camera-control-segmented-btn';
      btn.textContent = opt.label;
      if (opt.title) btn.title = opt.title;
      if (c.disabled) btn.disabled = true;
      btn.addEventListener('click', () => {
        if (c.disabled || opt.value === current) return;
        current = opt.value;
        sync();
        onChange?.(c.key, opt.value);
      });
      group.appendChild(btn);
      btns.push({el: btn, value: opt.value});
    });
    sync();
    header.appendChild(group);

    const valueEl = document.createElement('span');
    valueEl.className = 'camera-control-value';
    valueEl.style.display = 'none';
    header.appendChild(valueEl);

    row.appendChild(header);
    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }
    return [row, undefined, (v) => {
      current = v;
      sync();
      valueEl.textContent = String(v);
    }];
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
        if (c.type === 'readonly') {
          row.value.textContent = typeof def === 'string'
              ? def
              : Number(def).toFixed(c.precision ?? 2);
          onChange?.(c.key, def as number);
        } else {
          const defNum = def as number;
          if (c.type === 'checkbox') {
            row.input!.checked = defNum >= 0.5;
          } else if (c.type === 'color') {
            row.input!.value = hexStr(defNum);
            row.value.textContent = hexStr(defNum).toUpperCase();
          } else if (c.type === 'stepper') {
            row.input!.value = Number(defNum).toFixed(c.precision ?? 2);
          } else if (c.type === 'segmented') {
            row.setValue?.(defNum);
          } else {
            row.input!.value = String(defNum);
            row.value.textContent = Number(defNum).toFixed(c.precision ?? 2);
          }
          onChange?.(c.key, defNum);
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
      const findControl = (
          list: ParamControl[],
      ): Exclude<ParamControl, ParamGroup> | undefined => {
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
      const precision = c && 'precision' in c ? c.precision ?? 2 : 2;
      if (c?.type === 'readonly') {
        row.value.textContent = typeof value === 'string'
            ? value
            : Number(value).toFixed(precision);
      } else {
        const valueNum = value as number;
        if (c?.type === 'checkbox') {
          row.input!.checked = valueNum >= 0.5;
        } else if (c?.type === 'color') {
          row.input!.value = hexStr(valueNum);
          row.value.textContent = hexStr(valueNum).toUpperCase();
        } else if (c?.type === 'segmented') {
          row.setValue?.(valueNum);
        } else {
          row.input!.value = String(valueNum);
          row.value.textContent = Number(valueNum).toFixed(precision);
        }
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
