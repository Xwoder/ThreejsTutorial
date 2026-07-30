export interface Lesson {
  id: string;
  title: string;
  /** 右侧说明栏内容（HTML） */
  description: string;
  /** 在容器中创建场景，返回清理函数 */
  create: (container: HTMLElement) => () => void;
}

export interface Chapter {
  id: string;
  title: string;
  lessons: Lesson[];
}
