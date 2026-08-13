import type { Lesson } from '../types';
import { boxGeometry } from './boxGeometry';
import { sphereGeometry } from './sphereGeometry';
import { coneGeometry } from './coneGeometry';
import { torusGeometry } from './torusGeometry';
import { torusKnotGeometry } from './torusKnotGeometry';
import { cylinderGeometry } from './cylinderGeometry';
import { circleGeometry } from './circleGeometry';
import { capsuleGeometry } from './capsuleGeometry';
import { latheGeometry } from './latheGeometry';
import { extrudeGeometry } from './extrudeGeometry';
import { planeGeometry } from './planeGeometry';
import { polyhedron } from './polyhedronLesson';
import { ringGeometry } from './ringGeometry';
import { shapeGeometry } from './shapeGeometry';
import { tubeGeometry } from './tubeGeometry';

export const builtinGeometries: Lesson[] = [
  boxGeometry,
  sphereGeometry,
  coneGeometry,
  torusGeometry,
  torusKnotGeometry,
  cylinderGeometry,
  circleGeometry,
  capsuleGeometry,
  latheGeometry,
  extrudeGeometry,
  planeGeometry,
  polyhedron,
  ringGeometry,
  shapeGeometry,
  tubeGeometry,
];
