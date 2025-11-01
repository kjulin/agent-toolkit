import { createFileSystem } from './src/core/index.js';

const workspace = '/Users/klausjulin/code/introist/introist-gen2/agents/toolkits/filesystem/evals/scenarios/easy-search/workspace';
const fs = createFileSystem(workspace);

const result = await fs.grep({
  pattern: 'import.*fs',
  type: 'ts',
  output_mode: 'files_with_matches'
});

console.log('Grep result:', JSON.stringify(result, null, 2));
