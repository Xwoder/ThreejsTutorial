import type { Lesson } from '../types';
import {meshBasicMaterial} from './meshBasicMaterial';
import {meshNormalMaterial} from './meshNormalMaterial';
import {meshStandardMaterial} from './meshStandardMaterial';
import {meshPhongMaterial} from './meshPhongMaterial';
import {meshToonMaterial} from './meshToonMaterial';

export const materialTypes: Lesson[] = [
    meshBasicMaterial,
    meshNormalMaterial,
    meshStandardMaterial,
    meshPhongMaterial,
    meshToonMaterial,
];
