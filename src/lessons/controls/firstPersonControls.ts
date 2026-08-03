import type {Lesson} from '../types';

export const firstPersonControls: Lesson = {
    id: 'first-person-controls',
    title: 'FirstPersonControls 第一人称控制器',
    description: `
    <h2>第一人称漫游</h2>
    <p class="todo">本节内容尚未完成，敬请期待。</p>
  `,
    create(container) {
        container.innerHTML = '<div class="empty-tip">敬请期待</div>';
        return () => {
        };
    },
};
