/**
 * 通用「标题 + 一组按钮」控制面板分组。
 * 适用于任意需要一组互斥/可切换按钮的场景（如变换模式、坐标空间、显示开关等）。
 */

/** 「标题 + 一组按钮」的配置项 */
export interface ControlPanelButtonOptions {
    /** 分组标题，例如「模式」「坐标空间」 */
    title: string;
    /** 按钮定义 */
    items: ControlPanelButtonItem[];
}

/** 单个按钮的定义 */
export interface ControlPanelButtonItem {
    /** 按钮文字 */
    label: string;
    /** 点击回调 */
    onClick: () => void;
    /** 是否处于选中（高亮）状态 */
    active: () => boolean;
    /** 普通态配色（CSS 颜色值，如 '#ff5d5d'）。不传则使用 CSS 默认样式 */
    color?: string;
    /** 高亮（active）态配色（CSS 颜色值）。不传则使用 CSS 默认样式 */
    activeColor?: string;
}

export interface ControlPanelGroup {
    /** 分组 DOM 元素 */
    el: HTMLDivElement;
    /** 刷新按钮高亮状态 */
    sync: () => void;
}

/**
 * 创建一个「标题 + 一组按钮」的控制面板分组。
 * 返回分组 DOM 元素和用于刷新高亮状态的 sync 方法。
 */
export function createControlPanelGroup(
    options: ControlPanelButtonOptions,
): ControlPanelGroup {
    const group = document.createElement('div');
    group.className = 'control-group';

    const title = document.createElement('div');
    title.className = 'control-group-title';
    title.textContent = options.title;
    group.appendChild(title);

    const row = document.createElement('div');
    row.className = 'control-group-buttons';

    const buttons = options.items.map((item) => {
        const btn = document.createElement('button');
        btn.textContent = item.label;
        if (item.color) {
            btn.style.color = item.color;
            btn.style.borderColor = item.color;
        }
        btn.addEventListener('click', item.onClick);
        row.appendChild(btn);
        return btn;
    });
    group.appendChild(row);

    const sync = () => {
        buttons.forEach((btn, i) => {
            const item = options.items[i];
            const isActive = item.active();
            btn.classList.toggle('active', isActive);
            // activeColor 优先：高亮时覆盖文字/边框色，否则恢复普通态配色
            if (item.activeColor) {
                btn.style.color = isActive ? item.activeColor : (item.color ?? '');
                btn.style.borderColor = isActive ? item.activeColor : (item.color ?? '');
            }
        });
    };

    return {el: group, sync};
}
