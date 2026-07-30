import type { Lesson } from '../types';
import { boxGeometry } from './boxGeometry';
import { sphereGeometry } from './sphereGeometry';
import { coneGeometry } from './coneGeometry';
import { torusGeometry } from './torusGeometry';
import { torusKnotGeometry } from './torusKnotGeometry';
import { cylinderGeometry } from './cylinderGeometry';
import { circleGeometry } from './circleGeometry';
import { dodecahedronGeometry } from './dodecahedronGeometry';
import { capsuleGeometry } from './capsuleGeometry';

export const builtinGeometries: Lesson[] = [
  boxGeometry,
  sphereGeometry,
  coneGeometry,
  torusGeometry,
  torusKnotGeometry,
  cylinderGeometry,
  circleGeometry,
  dodecahedronGeometry,
  capsuleGeometry,
];
