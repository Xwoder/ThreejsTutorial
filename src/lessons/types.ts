export interface Lesson {
  id: string;
  title: string;
  /** 右侧说明栏内容（HTML） */
  description: string;
  /** 在容器中创建场景，返回清理函数；含子章节（children）的父标题可不提供 */
  create?: (container: HTMLElement) => () => void;
  /** 子章节，存在时本课时作为标题分组 */
  children?: Lesson[];
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}
