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
import { latheGeometry } from './latheGeometry';
import { extrudeGeometry } from './extrudeGeometry';
import { icosahedronGeometry } from './icosahedronGeometry';
import { octahedronGeometry } from './octahedronGeometry';
import { planeGeometry } from './planeGeometry';
import { polyhedronGeometry } from './polyhedronGeometry';
import { ringGeometry } from './ringGeometry';
import { shapeGeometry } from './shapeGeometry';
import { tetrahedronGeometry } from './tetrahedronGeometry';
import { tubeGeometry } from './tubeGeometry';
import { edgesGeometry } from './edgesGeometry';
import { wireframeGeometry } from './wireframeGeometry';

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
  latheGeometry,
  extrudeGeometry,
  icosahedronGeometry,
  octahedronGeometry,
  planeGeometry,
  polyhedronGeometry,
  ringGeometry,
  shapeGeometry,
  tetrahedronGeometry,
  tubeGeometry,
  edgesGeometry,
  wireframeGeometry,
];
