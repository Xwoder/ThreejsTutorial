/**
 * 各光源的强度管理：集中配置初始值 + 分光源独立保存运行时值。
 * 不同光源之间完全隔离：改一个光源的初始强度或拖动滑块，都不会影响其他光源。
 */

/**
 * 各光源的初始强度，集中在此配置（改这里即可，互不影响）。
 * key 为课程的 id。
 */
export const DEFAULT_INTENSITY: Record<string, number> = {
    'lights/directional-light': 3,  // 平行光
    'lights/point-light': 6,        // 点光源
    'lights/spot-light': 15,        // 聚光灯
};

/** 运行时强度，按光源 id 分别保存，切换走再切回可恢复各自上次的值 */
const store = new Map<string, number>();

/** 读取某光源的初始强度（来自集中配置） */
export function getDefaultIntensity(lessonId: string): number {
    return DEFAULT_INTENSITY[lessonId] ?? 1;
}

/** 读取某光源的当前强度，未调节过时回退到其初始强度 */
export function getIntensity(lessonId: string): number {
    const v = store.get(lessonId);
    return v === undefined ? getDefaultIntensity(lessonId) : v;
}

/** 写入某光源的当前强度，只影响该光源 */
export function setIntensity(lessonId: string, value: number): void {
    store.set(lessonId, value);
}

/** 清除某光源已保存的运行时强度，使其回到初始强度 */
export function resetIntensity(lessonId: string): void {
    store.delete(lessonId);
}
