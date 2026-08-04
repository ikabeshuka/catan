import { CityImprovementTrack } from '../types/citiesKnights.types';

export const PROGRESS_CARD_LABEL: Record<CityImprovementTrack, string> = {
  SCIENCE: 'מדע',
  POLITICS: 'פוליטיקה',
  TRADE: 'מסחר',
};

export type ProgressCardId =
  | 'ALCHEMIST' | 'CRANE' | 'ENGINEER' | 'INVENTOR' | 'IRRIGATION' | 'MEDICINE' | 'MINING' | 'PRINTER' | 'ROAD_BUILDING' | 'SMITH'
  | 'BISHOP' | 'CONSTITUTION' | 'DESERTER' | 'DIPLOMAT' | 'INTRIGUE' | 'SABOTEUR' | 'SPY' | 'WARLORD' | 'WEDDING'
  | 'COMMERCIAL_HARBOR' | 'MASTER_MERCHANT' | 'MERCHANT' | 'MERCHANT_FLEET' | 'RESOURCE_MONOPOLY' | 'TRADE_MONOPOLY';

/** Individual front art for every Cities & Knights progress-card type. */
export const PROGRESS_CARD_ART: Record<ProgressCardId, string> = {
  ALCHEMIST: '/progress_cards/science_alchemist.png',
  CRANE: '/progress_cards/science_crane.png',
  ENGINEER: '/progress_cards/science_engineer.png',
  INVENTOR: '/progress_cards/science_inventor.png',
  IRRIGATION: '/progress_cards/science_irrigation.png',
  MEDICINE: '/progress_cards/science_medicine.png',
  MINING: '/progress_cards/science_mining.png',
  PRINTER: '/progress_cards/science_printing_press.png',
  ROAD_BUILDING: '/progress_cards/science_road_building.png',
  SMITH: '/progress_cards/science_smith.png',
  BISHOP: '/progress_cards/politics_bishop.png',
  CONSTITUTION: '/progress_cards/politics_constitution.png',
  DESERTER: '/progress_cards/politics_deserter.png',
  DIPLOMAT: '/progress_cards/politics_diplomat.png',
  INTRIGUE: '/progress_cards/politics_intrigue.png',
  SABOTEUR: '/progress_cards/politics_saboteur.png',
  SPY: '/progress_cards/politics_spy.png',
  WARLORD: '/progress_cards/politics_warlord.png',
  WEDDING: '/progress_cards/politics_wedding.png',
  COMMERCIAL_HARBOR: '/progress_cards/trade_commercial_harbor.png',
  MASTER_MERCHANT: '/progress_cards/trade_master_merchant.png',
  MERCHANT: '/progress_cards/trade_merchant.png',
  MERCHANT_FLEET: '/progress_cards/trade_merchant_fleet.png',
  RESOURCE_MONOPOLY: '/progress_cards/trade_resource_monopoly.png',
  TRADE_MONOPOLY: '/progress_cards/trade_commodity_monopoly.png',
};

export interface ProgressCardDefinition {
  id: ProgressCardId;
  track: CityImprovementTrack;
  name: string;
  copies: number;
}

/** Official 2020 Cities & Knights card distribution: 18 cards in each stack. */
export const PROGRESS_CARD_DEFINITIONS: ProgressCardDefinition[] = [
  { id: 'ALCHEMIST', track: 'SCIENCE', name: 'אלכימאי', copies: 2 },
  { id: 'CRANE', track: 'SCIENCE', name: 'עגורן בנייה', copies: 2 },
  { id: 'ENGINEER', track: 'SCIENCE', name: 'מהנדס', copies: 1 },
  { id: 'INVENTOR', track: 'SCIENCE', name: 'ממציא', copies: 2 },
  { id: 'IRRIGATION', track: 'SCIENCE', name: 'השקיה', copies: 2 },
  { id: 'MEDICINE', track: 'SCIENCE', name: 'רפואה', copies: 2 },
  { id: 'MINING', track: 'SCIENCE', name: 'כרייה', copies: 2 },
  { id: 'PRINTER', track: 'SCIENCE', name: 'דפוס', copies: 1 },
  { id: 'ROAD_BUILDING', track: 'SCIENCE', name: 'סלילת דרכים', copies: 2 },
  { id: 'SMITH', track: 'SCIENCE', name: 'נפח', copies: 2 },
  { id: 'BISHOP', track: 'POLITICS', name: 'בישוף', copies: 2 },
  { id: 'CONSTITUTION', track: 'POLITICS', name: 'חוקה', copies: 1 },
  { id: 'DESERTER', track: 'POLITICS', name: 'עריק', copies: 2 },
  { id: 'DIPLOMAT', track: 'POLITICS', name: 'דיפלומט', copies: 2 },
  { id: 'INTRIGUE', track: 'POLITICS', name: 'תככים', copies: 2 },
  { id: 'SABOTEUR', track: 'POLITICS', name: 'מחבל', copies: 2 },
  { id: 'SPY', track: 'POLITICS', name: 'מרגל', copies: 3 },
  { id: 'WARLORD', track: 'POLITICS', name: 'מצביא', copies: 2 },
  { id: 'WEDDING', track: 'POLITICS', name: 'חתונה', copies: 2 },
  { id: 'COMMERCIAL_HARBOR', track: 'TRADE', name: 'נמל מסחרי', copies: 2 },
  { id: 'MASTER_MERCHANT', track: 'TRADE', name: 'סוחר ראשי', copies: 2 },
  { id: 'MERCHANT', track: 'TRADE', name: 'סוחר', copies: 6 },
  { id: 'MERCHANT_FLEET', track: 'TRADE', name: 'צי סוחר', copies: 2 },
  { id: 'RESOURCE_MONOPOLY', track: 'TRADE', name: 'מונופול משאבים', copies: 4 },
  { id: 'TRADE_MONOPOLY', track: 'TRADE', name: 'מונופול סחורות', copies: 2 },
];

export type ProgressDecks = Record<CityImprovementTrack, ProgressCardId[]>;

export const PROGRESS_CARD_BY_ID = Object.fromEntries(PROGRESS_CARD_DEFINITIONS.map(card => [card.id, card])) as Record<ProgressCardId, ProgressCardDefinition>;

export const createProgressDecks = (): ProgressDecks => Object.fromEntries(
  (['SCIENCE', 'POLITICS', 'TRADE'] as const).map(track => [track,
    PROGRESS_CARD_DEFINITIONS.filter(card => card.track === track).flatMap(card => Array.from({ length: card.copies }, () => card.id)),
  ])
) as ProgressDecks;
