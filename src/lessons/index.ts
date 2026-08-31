import type { Chapter } from './types';
import { scene } from './basics/scene.ts';
import { coordinates } from './basics/coordinates';
import { perspectiveCamera } from './camera/perspectiveCamera';
import { orthographicCamera } from './camera/orthographicCamera';
import {cameraCompare} from './camera/cameraCompare';
import { stereoCamera } from './camera/stereoCamera';
import { cubeCamera } from './camera/cubeCamera';
import { builtinGeometries } from './geometry/builtinGeometries';
import { customGeometry } from './geometry/customGeometry';
import { materialTypes } from './material/materialTypes';
import {textures} from './material/texturesGroup';
import {ambientLight} from './light/ambientLight';
import {pointLight} from './light/pointLight';
import {spotLight} from './light/spotLight';
import {directionalLight} from './light/directionalLight';
import {hemisphereLightHelper} from './light/hemisphereLightHelper';
import {rectAreaLight} from './light/rectAreaLight';
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
import { rubiksCube } from './examples/rubiksCube';
import { solarSystem } from './examples/solarSystem';
import { canyonTerrain } from './examples/canyonTerrain';
import { mountainRangeTerrain } from './examples/mountainRangeTerrain';
import {arrowHelper} from './uncategorized/arrowHelper';
import {axesHelper} from './uncategorized/axesHelper';
import {cameraHelper} from './uncategorized/cameraHelper';
import {gridHelper} from './uncategorized/gridHelper';
import {shadow} from './uncategorized/shadow';
import {sineTerrain} from './uncategorized/sineTerrain';
import {worldToLocal} from './uncategorized/worldToLocal';
import {objViewer} from './uncategorized/objViewer';
import {objFromCode} from './objFromCode';
import {rapierPhysics} from './physics/rapier-free-fall';
import {bouncing} from './physics/rapier-bouncing';
import {sliding} from './physics/rapier-sliding';
import {linearDamping} from './physics/rapier-linear-damping';
import {angularDamping} from './physics/rapier-angular-damping';

export const chapters: Chapter[] = [
  {
    id: 'basics',
    title: '基础入门',
    lessons: [scene, coordinates],
  },
  {
    id: 'camera',
    title: '相机',
    lessons: [cameraCompare, perspectiveCamera, orthographicCamera, stereoCamera, cubeCamera],
  },
  {
    id: 'geometry',
    title: '几何',
    lessons: [...builtinGeometries, customGeometry],
  },
  {
    id: 'material',
    title: '材质',
    lessons: [...materialTypes, textures],
  },
  {
    id: 'lights',
    title: '光',
    lessons: [ambientLight, pointLight, spotLight, directionalLight, hemisphereLightHelper, rectAreaLight],
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
    lessons: [mercedes, ferrari, airco, rubiksCube, solarSystem, canyonTerrain, mountainRangeTerrain],
  },
  {
    id: 'uncategorized',
    title: '未分类',
    lessons: [arrowHelper, axesHelper, cameraHelper, gridHelper, shadow, sineTerrain, worldToLocal, objViewer, objFromCode],
  },
  {
    id: 'physics',
    title: 'Rapier 物理引擎',
    lessons: [rapierPhysics, bouncing, sliding, linearDamping, angularDamping],
  },
];
