export interface LobbyPlayer {
  id: string;
  name: string;
  color: string;
  isBot: boolean;
  difficulty?: 'קל' | 'בינוני' | 'קשה' | 'סופר קשה';
}

export const CATAN_COLORS = [
  { name: 'אדום', hex: '#e53935' },
  { name: 'כחול', hex: '#1e88e5' },
  { name: 'צהוב', hex: '#fdd835' },
  { name: 'ירוק', hex: '#43a047' },
];
