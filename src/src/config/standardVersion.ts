import { ResourceType } from '../types/resources.types';

export interface GameConfig {
  boardRadius: number;
  resourcePool: ResourceType[];
  tokenPool: number[];
}

export const standardCatanConfig: GameConfig = {
  boardRadius: 2, // רדיוס 2 אומר מרכז + 2 שכבות של משושים (סך הכל 19 אריחים)
  
  // מלאי המשאבים המדויק בקטאן קלאסי
  resourcePool: [
    'DESERT',
    'WOOD', 'WOOD', 'WOOD', 'WOOD',
    'BRICK', 'BRICK', 'BRICK',
    'SHEEP', 'SHEEP', 'SHEEP', 'SHEEP',
    'WHEAT', 'WHEAT', 'WHEAT', 'WHEAT',
    'ORE', 'ORE', 'ORE'
  ],
  
  // מספרי האסימונים (לפי החוקים, למדבר אין מספר ולכן יש 18 מספרים עבור 18 אריחי משאבים)
  tokenPool: [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12]
};