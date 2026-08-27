import './style.css';
import { chapters } from './lessons';
import type { Lesson } from './lessons/types';

const app = document.querySelector<HTMLDivElement>('#app')!;

app.innerHTML = `
  <div class="layout">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-header">
        <span class="sidebar-title">Three.js 教程</span>
        <button class="theme-toggle" id="theme-toggle" title="切换浅色/深色主题" aria-label="切换主题">🌙</button>
        <button class="sidebar-collapse" id="sidebar-collapse" title="收起教程栏" aria-label="收起教程栏">⟨</button>
      </div>
      <nav id="toc"></nav>
    </aside>
    <button class="sidebar-expand" id="sidebar-expand" title="展开教程栏" aria-label="展开教程栏">☰</button>
    <main class="viewport" id="viewport">
      <div class="empty-tip">从左侧选择一节课开始学习</div>
    </main>
    <aside class="doc-panel" id="doc-panel">
      <div class="doc-panel-header">
        <span class="doc-panel-title">课程说明</span>
        <button class="doc-collapse" id="doc-collapse" title="收起说明栏" aria-label="收起说明栏">⟩</button>
      </div>
      <div class="doc-content" id="doc-content">
        <div class="doc-placeholder">课程说明将显示在这里</div>
      </div>
    </aside>
    <button class="doc-expand" id="doc-expand" title="展开说明栏" aria-label="展开说明栏">☰</button>
  </div>
`;

const toc = document.querySelector<HTMLElement>('#toc')!;
const viewport = document.querySelector<HTMLElement>('#viewport')!;
const docContent = document.querySelector<HTMLElement>('#doc-content')!;

let cleanup: (() => void) | null = null;
let activeLink: HTMLButtonElement | null = null;

function selectLesson(lesson: Lesson, link: HTMLButtonElement) {
  cleanup?.();
  viewport.innerHTML = '';
  activeLink?.classList.remove('active');
  link.classList.add('active');
  activeLink = link;

  docContent.innerHTML = lesson.description;
  cleanup = lesson.create ? lesson.create(viewport) : () => {};
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
      renderLesson(lesson, list, 1);
    });
    section.appendChild(list);

    header.addEventListener('click', () => {
      section.classList.toggle('collapsed');
    });

    toc.appendChild(section);
  });
}

/** 递归渲染课时：含子章节时渲染为可折叠的标题分组，否则渲染为可点击的课时链接 */
function renderLesson(lesson: Lesson, parent: HTMLElement, depth: number) {
  if (lesson.children && lesson.children.length > 0) {
    const group = document.createElement('div');
    group.className = 'lesson-group';

    const header = document.createElement('button');
    header.className = 'lesson-group-header';
    header.style.paddingLeft = `${16 + depth * 18}px`;
    header.innerHTML = `<span class="arrow">▸</span> ${lesson.title}`;
    group.appendChild(header);

    const childList = document.createElement('div');
    childList.className = 'lesson-sublist';
    lesson.children.forEach((child) => renderLesson(child, childList, depth + 1));
    group.appendChild(childList);

    header.addEventListener('click', () => {
      group.classList.toggle('collapsed');
    });

    parent.appendChild(group);
  } else {
    const link = document.createElement('button');
    link.className = 'lesson-link';
    link.style.paddingLeft = `${16 + depth * 18}px`;
    link.textContent = lesson.title;
    link.addEventListener('click', () => selectLesson(lesson, link));
    parent.appendChild(link);
  }
}

buildToc();

const layout = document.querySelector<HTMLElement>('.layout')!;
const sidebar = document.querySelector<HTMLElement>('#sidebar')!;
const sidebarCollapse = document.querySelector<HTMLButtonElement>('#sidebar-collapse')!;
const sidebarExpand = document.querySelector<HTMLButtonElement>('#sidebar-expand')!;

/** 收起/展开教程栏，带先后顺序的动画 */
function setSidebar(collapsed: boolean) {
  if (collapsed) {
    // 先收起侧栏（整体左移），等其消失后再让展开按钮滑入
    layout.classList.add('sidebar-collapsed');
    sidebar.addEventListener(
        'transitionend',
        () => sidebarExpand.classList.add('visible'),
        {once: true}
    );
  } else {
    // 先让展开按钮消失，再展开侧栏
    sidebarExpand.classList.remove('visible');
    sidebarExpand.addEventListener(
        'transitionend',
        () => layout.classList.remove('sidebar-collapsed'),
        {once: true}
    );
  }
}

sidebarCollapse.addEventListener('click', () => setSidebar(true));
sidebarExpand.addEventListener('click', () => setSidebar(false));

// 浅色 / 深色主题切换，并持久化到 localStorage
const themeToggle = document.querySelector<HTMLButtonElement>('#theme-toggle')!;
const rootEl = document.documentElement;

function applyTheme(light: boolean) {
  rootEl.classList.toggle('light', light);
  themeToggle.textContent = light ? '☀️' : '🌙';
  themeToggle.title = light ? '切换到深色主题' : '切换到浅色主题';
  localStorage.setItem('threejs-tutorial-theme', light ? 'light' : 'dark');
}

applyTheme(localStorage.getItem('threejs-tutorial-theme') === 'light');
themeToggle.addEventListener('click', () => applyTheme(!rootEl.classList.contains('light')));

// 右侧说明栏：同样的折叠/展开逻辑
const docPanelEl = document.querySelector<HTMLElement>('#doc-panel')!;
const docCollapse = document.querySelector<HTMLButtonElement>('#doc-collapse')!;
const docExpand = document.querySelector<HTMLButtonElement>('#doc-expand')!;

function setDoc(collapsed: boolean) {
  if (collapsed) {
    layout.classList.add('doc-collapsed');
    docPanelEl.addEventListener(
        'transitionend',
        () => docExpand.classList.add('visible'),
        {once: true}
    );
  } else {
    docExpand.classList.remove('visible');
    docExpand.addEventListener(
        'transitionend',
        () => layout.classList.remove('doc-collapsed'),
        {once: true}
    );
  }
}

docCollapse.addEventListener('click', () => setDoc(true));
docExpand.addEventListener('click', () => setDoc(false));

/** 收集所有可打开的叶子课时（忽略仅作为标题分组的父课时） */
function collectLeaves(): Lesson[] {
  const out: Lesson[] = [];
  const walk = (lessons: Lesson[]) => {
    lessons.forEach((l) => {
      if (l.children && l.children.length) walk(l.children);
      else out.push(l);
    });
  };
  chapters.forEach((c) => walk(c.lessons));
  return out;
}

// 从路径恢复或默认打开第一课
const initialId = location.pathname.slice(1);
let initial: { lesson: Lesson; index: number } | undefined;
const allLinks = toc.querySelectorAll<HTMLButtonElement>('.lesson-link');
const allLessons = collectLeaves();
allLessons.forEach((lesson, i) => {
  if (lesson.id === initialId) initial = { lesson, index: i };
});
if (!initial) initial = { lesson: allLessons[0], index: 0 };
selectLesson(initial.lesson, allLinks[initial.index] as HTMLButtonElement);
