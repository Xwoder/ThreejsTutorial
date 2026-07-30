import type { Chapter } from './types';
import { firstScene } from './basics/firstScene';
import { coordinates } from './basics/coordinates';
import { perspectiveCamera } from './camera/perspectiveCamera';
import { orthographicCamera } from './camera/orthographicCamera';
import { builtinGeometries } from './geometry/builtinGeometries';
import { customGeometry } from './geometry/customGeometry';
import { materialTypes } from './material/materialTypes';
import { textures } from './material/textures';
import { ambientDirectional } from './light/ambientDirectional';
import { pointSpot } from './light/pointSpot';
import { animationLoop } from './animation/animationLoop';
import { orbitControls } from './animation/orbitControls';

export const chapters: Chapter[] = [
  {
    id: 'basics',
    title: '基础入门',
    lessons: [firstScene, coordinates],
  },
  {
    id: 'camera',
    title: '相机',
    lessons: [perspectiveCamera, orthographicCamera],
  },
  {
    id: 'geometry',
    title: '几何体',
    lessons: [...builtinGeometries, customGeometry],
  },
  {
    id: 'material',
    title: '材质',
    lessons: [materialTypes, textures],
  },
  {
    id: 'light',
    title: '灯光',
    lessons: [ambientDirectional, pointSpot],
  },
  {
    id: 'animation',
    title: '动画与交互',
    lessons: [animationLoop, orbitControls],
  },
];
