interface DiceResult {
    dice1: number;
    dice2: number;
    total: number;
  }
  
  /**
   * מפעילה הגרלה של שתי קוביות (1-6) ומחזירה את התוצאות ואת הסכום שלהן
   */
  export function rollDice(): DiceResult {
    const dice1 = Math.floor(Math.random() * 6) + 1;
    const dice2 = Math.floor(Math.random() * 6) + 1;
    
    return {
      dice1,
      dice2,
      total: dice1 + dice2
    };
  }