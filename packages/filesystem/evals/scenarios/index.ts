import { easySearchScenario } from './easy-search/scenario';
import { mediumRefactorScenario } from './medium-refactor/scenario';
import type { EvalScenario } from '../types';

/**
 * Registry of all available evaluation scenarios
 */
export const scenarios: Record<string, EvalScenario> = {
  [easySearchScenario.id]: easySearchScenario,
  [mediumRefactorScenario.id]: mediumRefactorScenario,
};

/**
 * Get a scenario by ID
 */
export function getScenario(id: string): EvalScenario | undefined {
  return scenarios[id];
}

/**
 * Get all available scenario IDs
 */
export function getAvailableScenarios(): string[] {
  return Object.keys(scenarios);
}
