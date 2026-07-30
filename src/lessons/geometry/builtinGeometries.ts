import type { Lesson } from '../types';
import { boxGeometry } from './boxGeometry';
import { sphereGeometry } from './sphereGeometry';
import { coneGeometry } from './coneGeometry';
import { torusGeometry } from './torusGeometry';
import { torusKnotGeometry } from './torusKnotGeometry';
import { cylinderGeometry } from './cylinderGeometry';

export const builtinGeometries: Lesson[] = [
  boxGeometry,
  sphereGeometry,
  coneGeometry,
  torusGeometry,
  torusKnotGeometry,
  cylinderGeometry,
];
