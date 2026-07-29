import React from 'react';
import { ResourceType } from '../../types/resources.types';

interface ResourceCardProps {
  type: ResourceType;
  count: number;
  className?: string;
  style?: React.CSSProperties;
}

const CARD_IMAGES: Record<string, string> = {
  WOOD: '/card_wood.png',
  BRICK: '/card_brick.png',
  SHEEP: '/card_sheep.png',
  WHEAT: '/card_wheat.png',
  ORE: '/card_ore.png',
};

const CARD_LABELS: Record<string, string> = {
  WOOD: 'עץ',
  BRICK: 'לבנה',
  SHEEP: 'כבש',
  WHEAT: 'חיטה',
  ORE: 'ברזל',
};

export const ResourceCard: React.FC<ResourceCardProps> = ({ type, count, className = '', style }) => {
  // נתעלם מהמדבר, כי הוא לא משאב שמחזיקים ביד
  if (type === 'DESERT') return null;

  const cardImage = CARD_IMAGES[type];
  const label = CARD_LABELS[type] || '';

  // If no hover translate is passed in className, provide the default hover effect
  const hasHoverTransform = className.includes('hover:translate') || className.includes('hover:-translate');
  const hoverClass = hasHoverTransform ? '' : 'hover:-translate-y-3';

  return (
    <div
      id={`resource-card-${type}`}
      style={style}
      className={`relative flex flex-col items-center justify-between w-28 h-44 rounded-2xl border border-slate-700/50 bg-slate-900 shadow-2xl transition-all duration-300 hover:shadow-amber-500/20 group cursor-pointer overflow-hidden ${hoverClass} ${className}`}
    >
      {/* Real Card Image */}
      {cardImage && (
        <img
          src={cardImage}
          alt={label}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105 pointer-events-none select-none"
        />
      )}

      {/* Dark overlay at the top to make the digital counter stand out more clearly */}
      <div className="absolute top-0 left-0 right-0 h-10 bg-gradient-to-b from-black/40 to-transparent pointer-events-none" />

      {/* Glowing digital counter in the top corner */}
      <div className="absolute top-2.5 right-2.5 flex items-center justify-center min-w-8 h-8 px-1.5 rounded-lg bg-slate-950/90 border border-amber-500/40 shadow-lg text-amber-400 font-mono text-sm font-black tracking-tight group-hover:border-amber-400 transition-all duration-300 z-10">
        {count}
      </div>

      {/* Dark gradient at the bottom for readability of label if needed, or overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />

      {/* Resource Label and Card Branding at bottom */}
      <div className="mt-auto w-full flex flex-col items-center pb-2 z-10 pointer-events-none">
        <span className="text-xs tracking-widest text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] font-bold">
          {label}
        </span>
        <span className="text-[7px] tracking-[0.25em] text-slate-300/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] font-extrabold mt-0.5">
          CATAN
        </span>
      </div>
    </div>
  );
};
