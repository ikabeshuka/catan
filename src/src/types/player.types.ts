import { ResourceCards } from './resources.types';

export interface Player {
  id: string;
  name: string;
  color: string;        // קוד צבע ב-Hex (למשל: אדום, כחול, כתום, לבן)
  isBot: boolean;       // true אם מדובר בשחקן מחשב, false אם שחקן אנושי
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'SUPER_HARD';
  archetype?: 'BUILDER' | 'DEVELOPER';
  turnsPlayed?: number;
  botStrategy?: 'LONG_ROAD_EXPANSION' | 'CITY_DEV_BURST' | 'BALANCED_PORT_TRADE';
  resources: ResourceCards; // כמות הכרטיסים שיש לו ביד מכל משאב
  victoryPoints: number; // נקודות הניצחון הנוכחיות שלו
  developmentCards: {
    KNIGHT: number;
    MONOPOLY: number;
    ROAD_BUILDING: number;
    YEAR_OF_PLENTY?: number;
    VICTORY_POINT?: number;
  };
  knightsPlayed?: number;
}
