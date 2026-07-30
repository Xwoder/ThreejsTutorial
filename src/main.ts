import './style.css';
import { chapters } from './lessons';
import type { Lesson } from './lessons/types';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="layout">
    <aside class="sidebar">
      <div class="sidebar-header">Three.js 教程</div>
      <nav id="toc"></nav>
    </aside>
    <main class="viewport" id="viewport">
      <div class="empty-tip">从左侧选择一节课开始学习</div>
    </main>
    <aside class="doc-panel" id="doc-panel">
      <div class="doc-placeholder">课程说明将显示在这里</div>
    </aside>
  </div>
`;

const toc = document.querySelector<HTMLElement>('#toc')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;
const docPanel = document.querySelector<HTMLElement>('#doc-panel')!;

let cleanup: (() => void) | null = null;
let activeLink: HTMLButtonElement | null = null;

function selectLesson(lesson: Lesson, link: HTMLButtonElement) {
  cleanup?.();
  viewport.innerHTML = '';
  activeLink?.classList.remove('active');
  link.classList.add('active');
  activeLink = link;

  docPanel.innerHTML = `<div class="doc-content">${lesson.description}</div>`;
  cleanup = lesson.create(viewport);
  history.replaceState(null, '', `/${lesson.id}`);
}

function buildToc() {
  chapters.forEach((chapter) => {
    const section = document.createElement('div');
    section.className = 'chapter';

    const header = document.createElement('button');
    header.className = 'chapter-header';
    header.innerHTML = `<span class="arrow">▸</span> ${chapter.title}`;
    section.appendChild(header);

    const list = document.createElement('div');
    list.className = 'lesson-list';
    chapter.lessons.forEach((lesson) => {
      const link = document.createElement('button');
      link.className = 'lesson-link';
      link.textContent = lesson.title;
      link.addEventListener('click', () => selectLesson(lesson, link));
      list.appendChild(link);
    });
    section.appendChild(list);

    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    toc.appendChild(section);
  });
}

buildToc();

// 从路径恢复或默认打开第一课
const initialId = location.pathname.slice(1);
let initial: { lesson: Lesson; index: number } | undefined;
const allLinks = toc.querySelectorAll<HTMLButtonElement>('.lesson-link');
const allLessons = chapters.flatMap((c) => c.lessons);
allLessons.forEach((lesson, i) => {
  if (lesson.id === initialId) initial = { lesson, index: i };
});
if (!initial) initial = { lesson: chapters[0].lessons[0], index: 0 };
selectLesson(initial.lesson, allLinks[initial.index] as HTMLButtonElement);
