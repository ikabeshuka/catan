export const getHarborDescription = (type: string) => {
  switch (type) {
    case 'GENERIC':
      return {
        title: 'נמל כללי (Generic Port)',
        ratio: '3:1',
        description: 'החלף 3 משאבים זהים עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-blue-500/20 to-blue-950/40 border-blue-500/40 text-blue-300',
        img: '/favicon.svg'
      };
    case 'WOOD':
      return {
        title: 'נמל עץ (Wood Port)',
        ratio: '2:1',
        description: 'החלף 2 עץ עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/40 text-emerald-300',
        img: '/wood1.png'
      };
    case 'BRICK':
      return {
        title: 'נמל לבנים (Brick Port)',
        ratio: '2:1',
        description: 'החלף 2 לבנים עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-red-500/20 to-red-950/40 border-red-500/40 text-red-300',
        img: '/brick1.png'
      };
    case 'SHEEP':
      return {
        title: 'נמל כבשים (Sheep Port)',
        ratio: '2:1',
        description: 'החלף 2 כבשים עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-lime-500/20 to-lime-950/40 border-lime-500/40 text-lime-300',
        img: '/wool1.png'
      };
    case 'WHEAT':
      return {
        title: 'נמל חיטה (Wheat Port)',
        ratio: '2:1',
        description: 'החלף 2 חיטה עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-amber-500/20 to-amber-950/40 border-amber-500/40 text-amber-300',
        img: '/wheat1.png'
      };
    case 'ORE':
      return {
        title: 'נמל ברזל (Ore Port)',
        ratio: '2:1',
        description: 'החלף 2 ברזל עבור משאב 1 לבחירתך מהבנק.',
        color: 'from-slate-400/20 to-slate-800/40 border-slate-500/40 text-slate-300',
        img: '/rock1.png'
      };
    default:
      return {
        title: 'נמל מסחר',
        ratio: '3:1',
        description: 'החלף משאבים עם הבנק ביחס מועדף.',
        color: 'from-slate-500/20 to-slate-950/40 border-slate-500/40 text-slate-300',
        img: '/favicon.svg'
      };
  }
};

// Alias to match getHarborTooltipInfo if anything relies on it
export const getHarborTooltipInfo = getHarborDescription;

export const getTileTooltipInfo = (type: string) => {
  switch (type) {
    case 'WOOD':
      return {
        name: 'יער (Forest)',
        produces: 'עץ (Wood)',
        img: '/wood1.png',
        description: 'מייצר עץ יקר ערך לבניית כבישים ויישובים.',
        color: 'from-emerald-500/20 to-emerald-950/40 border-emerald-500/40 text-emerald-300'
      };
    case 'BRICK':
      return {
        name: 'גבעת חמר (Clay Pit)',
        produces: 'לבנים (Brick)',
        img: '/brick1.png',
        description: 'מייצר לבני חמר לבניית כבישים ויישובים.',
        color: 'from-red-500/20 to-red-950/40 border-red-500/40 text-red-300'
      };
    case 'SHEEP':
      return {
        name: 'מרעה כבשים (Pasture)',
        produces: 'צמר (Wool)',
        img: '/wool1.png',
        description: 'מייצר צמר רך ועשיר להקמת יישובים וקניית קלפי פיתוח.',
        color: 'from-lime-500/20 to-lime-950/40 border-lime-500/40 text-lime-300'
      };
    case 'WHEAT':
      return {
        name: 'שדה חיטה (Fields)',
        produces: 'חיטה (Wheat)',
        img: '/wheat1.png',
        description: 'מייצר חיטה מזינה להקמת יישובים, שדרוג ערים וקניית קלפי פיתוח.',
        color: 'from-amber-500/20 to-amber-950/40 border-amber-500/40 text-amber-300'
      };
    case 'ORE':
      return {
        name: 'הרים (Mountains)',
        produces: 'ברזל (Ore)',
        img: '/rock1.png',
        description: 'מפיק עפרת ברזל חזקה לשדרוג ערים וקניית קלפי פיתוח.',
        color: 'from-slate-400/20 to-slate-800/40 border-slate-500/40 text-slate-300'
      };
    case 'DESERT':
      return {
        name: 'מדבר (Desert)',
        produces: 'אין (Desert)',
        img: '/robber.png',
        description: 'מדבר שומם וצחיח שאינו מייצר משאבים. מקום מושבו של השודד.',
        color: 'from-orange-500/10 to-amber-950/20 border-orange-700/20 text-orange-200'
      };
    case 'WATER':
      return {
        name: 'ים',
        produces: 'אין',
        img: '',
        description: 'מים פתוחים וסוערים שניתן לשוט בהם באמצעות ספינות.',
        color: 'from-blue-500/20 to-blue-950/40 border-blue-500/40 text-blue-300'
      };
    default:
      return {
        name: 'אריח משאב',
        produces: 'משאב',
        img: '/favicon.svg',
        description: 'מייצר משאבים עבור השחקנים.',
        color: 'from-slate-500/20 to-slate-950/40 border-slate-500/40 text-slate-300'
      };
  }
};
