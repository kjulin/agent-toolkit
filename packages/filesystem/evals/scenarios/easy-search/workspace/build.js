import fs from 'fs';
import { build } from 'esbuild';

build({ entryPoints: ['src/index.ts'] });
