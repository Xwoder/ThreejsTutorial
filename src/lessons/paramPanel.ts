export interface ParamSlider {
  key: string;
  label: string;
  /** 控件类型：'range' 为滑块（默认），'checkbox' 为勾选框，适用于布尔型参数 */
  type?: 'range' | 'checkbox';
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

export interface ParamPanelOptions {
  /** 面板挂载容器 */
  container: HTMLElement;
  /** 滑块定义列表，由页面自行定义与控制 */
  controls: ParamSlider[];
  /** 默认值，用于「重置参数」按钮 */
  defaults: Record<string, number>;
  /** 滑块数值变化回调（用户拖动或重置时触发） */
  onChange?: (key: string, value: number) => void;
  /** 渲染在滑块行与重置按钮之间的自定义内容（如复选框） */
  footer?: HTMLElement;
  /** 自定义重置逻辑；提供后「重置参数」按钮将只调用它，不再执行默认重置 */
  onReset?: () => void;
}

export interface ParamPanel {
  /** 面板根元素 */
  el: HTMLElement;
  /** 更新某个参数行的显示值（不改变禁用等状态，仅刷新数值） */
  setDisplay(key: string, value: number): void;
  /** 获取某个参数行的滑块元素 */
  getInput(key: string): HTMLInputElement | undefined;
  /** 从 DOM 中移除面板 */
  remove(): void;
}

/** 构建统一的参数调节面板，样式与相机控制面板一致，供各页面复用 */
export function createParamPanel(opts: ParamPanelOptions): ParamPanel {
  const { container, controls, defaults, onChange, footer, onReset } = opts;

  const el = document.createElement('div');
  el.className = 'camera-controls';
  el.innerHTML = `<div class="camera-controls-title">参数 <span>CONTROLS</span></div>`;

  const rows = new Map<string, { input: HTMLInputElement; value: HTMLElement }>();

  controls.forEach((c) => {
    const isCheckbox = c.type === 'checkbox';

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
      row.appendChild(input);
    }

    row.appendChild(header);

    if (c.desc) {
      const desc = document.createElement('div');
      desc.className = 'camera-control-desc';
      desc.textContent = c.desc;
      row.appendChild(desc);
    }

    el.appendChild(row);
    rows.set(c.key, { input, value: valueEl });
  });

  if (footer) el.appendChild(footer);

  const resetBtn = document.createElement('button');
  resetBtn.className = 'camera-control-reset';
  resetBtn.textContent = '重置参数';
  resetBtn.addEventListener('click', () => {
    if (onReset) {
      onReset();
      return;
    }
    controls.forEach((c) => {
      const def = defaults[c.key];
      if (def === undefined) return;
      const row = rows.get(c.key)!;
      if (c.type === 'checkbox') {
        row.input.checked = def >= 0.5;
      } else {
        row.input.value = String(def);
        row.value.textContent = Number(def).toFixed(c.precision ?? 2);
      }
      onChange?.(c.key, def);
    });
  });
  el.appendChild(resetBtn);

  container.appendChild(el);

  return {
    el,
    setDisplay(key, value) {
      const row = rows.get(key);
      if (!row) return;
      const c = controls.find((x) => x.key === key);
      const precision = c?.precision ?? 2;
      if (c?.type === 'checkbox') {
        row.input.checked = value >= 0.5;
      } else {
        row.input.value = String(value);
        row.value.textContent = Number(value).toFixed(precision);
      }
    },
    getInput(key) {
      return rows.get(key)?.input;
    },
    remove() {
      el.remove();
    },
  };
}
