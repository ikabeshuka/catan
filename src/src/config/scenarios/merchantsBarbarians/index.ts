import { fishermenOfCatan, MBScenarioConfig } from './fishermenOfCatan';
import { riversOfCatan } from './riversOfCatan';
import { caravanRoute } from './caravanRoute';
import { barbarianAttack } from './barbarianAttack';
import { merchantsAndBarbarians } from './merchantsAndBarbarians';

export * from './fishermenOfCatan';
export * from './riversOfCatan';
export * from './caravanRoute';
export * from './barbarianAttack';
export * from './merchantsAndBarbarians';

export const MERCHANTS_BARBARIANS_SCENARIOS: MBScenarioConfig[] = [
  fishermenOfCatan,
  riversOfCatan,
  caravanRoute,
  barbarianAttack,
  merchantsAndBarbarians,
];
