import { easyColumnFetchScenario } from './easy-column-fetch/scenario';
import { mediumJsonbNavigationScenario } from './medium-jsonb-navigation/scenario';
import type { EvalScenario } from '../types';

export const scenarios: Record<string, EvalScenario> = {
  [easyColumnFetchScenario.id]: easyColumnFetchScenario,
  [mediumJsonbNavigationScenario.id]: mediumJsonbNavigationScenario,
};

export function getScenario(id: string): EvalScenario | undefined {
  return scenarios[id];
}

export function listScenarios(): EvalScenario[] {
  return Object.values(scenarios);
}
