import type { Chapter } from './types';
import { scene } from './basics/scene.ts';
import { coordinates } from './basics/coordinates';
import { perspectiveCamera } from './camera/perspectiveCamera';
import { orthographicCamera } from './camera/orthographicCamera';
import { stereoCamera } from './camera/stereoCamera';
import { cubeCamera } from './camera/cubeCamera';
import { builtinGeometries } from './geometry/builtinGeometries';
import { customGeometry } from './geometry/customGeometry';
import { materialTypes } from './material/materialTypes';
import { textures } from './material/textures';
import { ambientDirectional } from './light/ambientDirectional';
import { pointSpot } from './light/pointSpot';
import { animationLoop } from './animation/animationLoop';
import { orbitControls } from './animation/orbitControls';
import { trackballControls } from './controls/trackballControls';
import { flyControls } from './controls/flyControls';
import { firstPersonControls } from './controls/firstPersonControls';
import { pointerLockControls } from './controls/pointerLockControls';
import { dragControls } from './controls/dragControls';
import { arcballControls } from './controls/arcballControls';
import { mapControls } from './controls/mapControls';
import { transformControls } from './controls/transformControls';
import { mercedes } from './examples/mercedes';
import { ferrari } from './examples/ferrari';
import { airco } from './examples/airco';
import { meshTextured } from './examples/meshTextured';
import { rubiksCube } from './examples/rubiksCube';
import { solarSystem } from './examples/solarSystem';

export const chapters: Chapter[] = [
  {
    id: 'basics',
    title: '基础入门',
    lessons: [scene, coordinates],
  },
  {
    id: 'camera',
    title: '相机',
    lessons: [perspectiveCamera, orthographicCamera, stereoCamera, cubeCamera],
  },
  {
    id: 'geometry',
    title: '几何',
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
    lessons: [animationLoop],
  },
  {
    id: 'controls',
    title: '控制器',
    lessons: [orbitControls, trackballControls, arcballControls, flyControls, firstPersonControls, pointerLockControls, dragControls, mapControls, transformControls],
  },
  {
    id: 'examples',
    title: '示例',
    lessons: [mercedes, ferrari, airco, meshTextured, rubiksCube, solarSystem],
  },
];
