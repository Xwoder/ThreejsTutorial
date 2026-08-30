/**
 * 参数面板的配色「参数对象」：深色 / 浅色两套主题集中定义在一处。
 *
 * 切换主题时由 applyPanelTheme() 把当前主题写入根元素的 --pp-* CSS 变量，
 * 面板相关样式（style.css 中的 .camera-controls / .control-group / .view-tabs /
 * .transform-space-panel 等）统一通过 var(--pp-*) 引用，不再硬编码颜色。
 *
 * 需要在 JS 里单独指定颜色的地方（如按钮配色、按轴向着色的只读标签），
 * 直接传 'var(--pp-axis-x)' 这类变量字符串即可自动跟随主题变化。
 */

/** 单个主题下参数面板用到的全部配色 / 字体参数 */
export interface PanelTheme {
    /** 面板背景 */
    panelBg: string;
    /** 面板与输入控件的边框 */
    border: string;
    /** 强调态边框（hover 等） */
    borderStrong: string;
    /** 虚线分隔线 */
    divider: string;
    /** 面板投影 */
    shadow: string;

    /** 正文与标签文字 */
    text: string;
    /** 次要文字（参数说明、复选框标签） */
    textDim: string;
    /** 面板 / 分组标题 */
    title: string;
    /** 标题下方的分隔线 */
    titleRule: string;
    /** 数值文字 */
    value: string;

    /** 强调色（激活按钮、滑块、重置按钮） */
    accent: string;
    /** 强调色的 hover 态 */
    accentHover: string;
    /** 强调色背景之上的文字 */
    onAccent: string;

    /** 按钮 / 输入框背景 */
    surface: string;
    /** 次级控件背景（步进按钮等） */
    surfaceRaised: string;
    /** 控件 hover 背景 */
    surfaceHover: string;
    /** 控件按下背景 */
    surfacePressed: string;
    /** 按钮默认文字色 */
    surfaceFg: string;
    /** 分组包围框背景 */
    groupBg: string;

    /** 正文 / 标签字重 */
    textWeight: number;
    /** 标题字重 */
    titleWeight: number;
    /** 标题字间距 */
    titleTracking: string;
    /** 数值字重 */
    valueWeight: number;
    /** 数值字间距 */
    valueTracking: string;
    /** 按钮字重 */
    btnWeight: number;

    /** 语义色：X 轴 */
    axisX: string;
    /** 语义色：Y 轴 */
    axisY: string;
    /** 语义色：Z 轴 */
    axisZ: string;
    /** 语义色：危险 / 提醒类操作 */
    danger: string;
}

/** 主题名：深色 / 浅色 */
export type PanelThemeName = 'dark' | 'light';

/**
 * 两套主题的面板配色总表。
 * 深色沿用面板一贯的深蓝灰风格；浅色整体提亮，同时加深文字与强调色以保证对比度。
 */
export const PANEL_THEME: Record<PanelThemeName, PanelTheme> = {
    dark: {
        panelBg: 'rgba(30, 41, 59, 0.92)',
        border: '#334155',
        borderStrong: '#475569',
        divider: '#475569',
        shadow: '0 10px 30px rgba(0, 0, 0, 0.35)',

        text: '#e2e8f0',
        textDim: '#94a3b8',
        title: '#38bdf8',
        titleRule: 'rgba(56, 189, 248, 0.25)',
        value: '#38bdf8',

        accent: '#38bdf8',
        accentHover: '#7dd3fc',
        onAccent: '#0f172a',

        surface: '#0b1120',
        surfaceRaised: '#1e293b',
        surfaceHover: '#334155',
        surfacePressed: '#0f172a',
        surfaceFg: '#94a3b8',
        groupBg: 'rgba(15, 23, 42, 0.4)',

        textWeight: 500,
        titleWeight: 700,
        titleTracking: '0.5px',
        valueWeight: 600,
        valueTracking: '0',
        btnWeight: 600,

        axisX: '#ff5d5d',
        axisY: '#5dff8f',
        axisZ: '#5dc8ff',
        danger: '#ff5d5d',
    },
    light: {
        panelBg: 'rgba(255, 255, 255, 0.96)',
        border: '#cbd5e1',
        borderStrong: '#94a3b8',
        divider: '#cbd5e1',
        shadow: '0 10px 30px rgba(15, 23, 42, 0.14)',

        text: '#1e293b',
        textDim: '#64748b',
        title: '#0369a1',
        titleRule: 'rgba(3, 105, 161, 0.25)',
        value: '#0284c7',

        accent: '#0284c7',
        accentHover: '#0369a1',
        onAccent: '#ffffff',

        surface: '#f1f5f9',
        surfaceRaised: '#ffffff',
        surfaceHover: '#e2e8f0',
        surfacePressed: '#cbd5e1',
        surfaceFg: '#475569',
        groupBg: 'rgba(241, 245, 249, 0.9)',

        // 浅色下整体加粗、字间距放宽，与深色形成明显区分
        textWeight: 600,
        titleWeight: 800,
        titleTracking: '1px',
        valueWeight: 700,
        valueTracking: '0.2px',
        btnWeight: 700,

        axisX: '#dc2626',
        axisY: '#15803d',
        axisZ: '#0369a1',
        danger: '#dc2626',
    },
};

/** camelCase 的键名转成 kebab-case 的 CSS 变量名后缀 */
function kebab(key: string): string {
    return key.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

/** 把指定主题写入根元素的 --pp-* CSS 变量，供面板样式统一引用 */
export function applyPanelTheme(theme: PanelThemeName): void {
    const root = document.documentElement.style;
    for (const [key, value] of Object.entries(PANEL_THEME[theme])) {
        root.setProperty(`--pp-${kebab(key)}`, String(value));
    }
}
