import type { FishermenScenarioState } from '../../types/scenarioState.types';

export const FISH_ACTION_COSTS = {
  MOVE_ROBBER: 2,
  STEAL_CARD: 3,
  TAKE_BANK_RESOURCE: 4,
  FREE_ROAD: 5,
  FREE_DEV_CARD: 7,
} as const;

export type FishActionType = keyof typeof FISH_ACTION_COSTS;

/** Returns one legal, exact payment. Fish chits may never be broken for change. */
export const findFishPayment = (tokens: number[], cost: number): number[] | null => {
  const selected: number[] = [];
  let best: number[] | null = null;
  const search = (index: number, total: number): void => {
    if (total === cost) {
      if (!best || selected.length < best.length) best = [...selected];
      return;
    }
    if (total > cost || index >= tokens.length || (best && selected.length >= best.length)) return;
    selected.push(index);
    search(index + 1, total + tokens[index]);
    selected.pop();
    search(index + 1, total);
  };
  search(0, 0);
  return best;
};

export const canPayFish = (tokens: number[] | undefined, action: FishActionType): boolean =>
  Boolean(findFishPayment(tokens || [], FISH_ACTION_COSTS[action]));

export const recycleFishTokens = (state: FishermenScenarioState): FishermenScenarioState => {
  if (state.fishDrawPile.length > 0 || state.fishDiscardPile.length === 0) return state;
  const drawPile = [...state.fishDiscardPile];
  for (let index = drawPile.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [drawPile[index], drawPile[swapIndex]] = [drawPile[swapIndex], drawPile[index]];
  }
  return { ...state, fishDrawPile: drawPile, fishDiscardPile: [] };
};
