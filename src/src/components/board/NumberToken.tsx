import React from 'react';

interface NumberTokenProps {
  centerX: number;
  centerY: number;
  value: number | string;
  is3DMode?: boolean;
  onClick?: () => void;
}

// פונקציית עזר קטנה להחזרת כמות נקודות ההסתברות (לפי חוקי קטאן)
function getProbabilityDots(num: number | string): string {
  const dotsMap: Record<string, string> = {
    '2': '.', '12': '.',
    '3': '..', '11': '..',
    '4': '...', '10': '...',
    '5': '....', '9': '....',
    '6': '.....', '8': '.....',
    '2/3': '...',
    '11/12': '...'
  };
  return dotsMap[num.toString()] || '';
}

export const NumberToken: React.FC<NumberTokenProps> = ({ centerX, centerY, value, is3DMode, onClick }) => {
  const isHighProbability = value === 6 || value === 8;
  const dots = getProbabilityDots(value);

  return (
    <g 
      className={`select-none filter drop-shadow-md ${onClick ? 'cursor-pointer pointer-events-auto' : 'pointer-events-none'}`}
      onClick={onClick}
      style={is3DMode ? {
        transform: 'translateZ(16px)',
        transformStyle: 'preserve-3d',
        transition: 'all 0.3s ease'
      } : undefined}
    >
      {/* Outer elegant wooden/bronze ring for the token */}
      <circle
        cx={centerX}
        cy={centerY}
        r="24"
        fill="#fdfaf2"
        stroke="#854d0e"
        strokeWidth="1.5"
      />

      {/* Inner thin decorative ring */}
      <circle
        cx={centerX}
        cy={centerY}
        r="19.5"
        fill="none"
        stroke="#ca8a04"
        strokeWidth="0.5"
        strokeDasharray="1 1"
        opacity="0.7"
      />

      {/* Value Number */}
      <text
        x={centerX}
        y={centerY + 4.5} // Center alignment adjustment
        textAnchor="middle"
        fontSize={isHighProbability ? '21' : '18'}
        fontWeight={isHighProbability ? '900' : '800'}
        fontFamily="system-ui, -apple-system, sans-serif"
        fill={isHighProbability ? '#b91c1c' : '#1e293b'} // Prominent crimson red for 6/8, dark slate for others
      >
        {value}
      </text>

      {/* Probability dots */}
      <text
        x={centerX}
        y={centerY + 15.5}
        textAnchor="middle"
        fontSize="14"
        letterSpacing="1"
        fontWeight="bold"
        fill={isHighProbability ? '#b91c1c' : '#64748b'}
      >
        {dots}
      </text>
    </g>
  );
};
