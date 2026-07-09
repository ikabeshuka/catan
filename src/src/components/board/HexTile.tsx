import React from 'react';
import { useGame } from '../../context/GameContext';
import { HexTile as HexTileType } from '../../types/hex.types';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';
import { getHexPointsString } from '../../utils/hexMath/getHexPointsString';
import { NumberToken } from './NumberToken';
import { moveRobber } from '../../utils/gameEngine/moveRobber';
import { getEligibleRobberyTargets } from '../../utils/gameEngine/robberSteal';

interface HexTileProps {
  tile: HexTileType;
}

const HEX_SIZE = 60;

const RESOURCE_COLORS: Record<string, string> = {
  WOOD: '#15803d',   // ירוק כהה בשביל יער
  BRICK: '#dc2626',  // אדום בשביל לבנים
  SHEEP: '#a3e635',  // ירוק בהיר בשביל מרעה כבשים
  WHEAT: '#eab308',  // צהוב בשביל חיטה
  ORE: '#64748b',    // אפור בשביל ברזל (סלעים)
  DESERT: '#8b5a2b', // חום בשביל מדבר
};

const RESOURCE_TEXTURES: Record<string, string> = {
  WOOD: 'url(#tex-WOOD)',
  BRICK: 'url(#tex-BRICK)',
  SHEEP: 'url(#tex-SHEEP)',
  WHEAT: 'url(#tex-WHEAT)',
  ORE: 'url(#tex-ORE)',
  DESERT: 'url(#tex-DESERT)',
};

export const HexTile: React.FC<HexTileProps> = ({ tile }) => {
  const { turnSubPhase, setTiles, setTurnSubPhase, players, currentPlayerIndex, addLog, is3DMode, vertices, setRobberyState } = useGame();
  
  const center = cubeToPixel(tile.coord, HEX_SIZE);
  const pointsString = getHexPointsString(center.x, center.y, HEX_SIZE);
  const tileColor = RESOURCE_TEXTURES[tile.type] || RESOURCE_COLORS[tile.type] || '#ffffff';

  // השודד ניתן להזזה רק אם אנחנו בשלב המתאים, וזהו תורו של שחקן אנושי, והשודד לא נמצא שם כבר
  const isSelectableForRobber = turnSubPhase === 'ROBBER_PLACEMENT' && 
                                !players[currentPlayerIndex]?.isBot && 
                                !tile.hasRobber;

  const handleTileClick = () => {
    if (!isSelectableForRobber) return;

    // 1. הפעלת מנוע הזזת השודד ועדכון הסטייט
    setTiles(prevTiles => moveRobber(tile.id, prevTiles));
    
    // 2. רישום הפעולה בלוג המשחק
    const currentPlayerName = players[currentPlayerIndex]?.name || 'השחקן';
    addLog(`${currentPlayerName} הזיז את השודד לאריח מסוג ${tile.type}.`);

    // 3. בדיקה אם יש שחקנים יריבים לגנוב מהם
    const currentPlayingPlayer = players[currentPlayerIndex];
    const eligibleTargets = getEligibleRobberyTargets(tile, vertices, players, currentPlayingPlayer.id);

    if (eligibleTargets.length > 0) {
      setRobberyState({ tile, targets: eligibleTargets });
    } else {
      addLog(`[שודד] אין שחקנים יריבים עם קלפים באריח זה.`);
      setTurnSubPhase('TRADE_AND_BUILD');
    }
  };

  return (
    <g 
      id={`tile-${tile.id}`} 
      onClick={handleTileClick}
      style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
    >
      <polygon
        points={pointsString}
        fill={tileColor}
        stroke="rgba(212, 175, 55, 0.7)"
        strokeWidth="1.2"
        className={`transition-all duration-300 ${
          isSelectableForRobber 
            ? 'animate-pulse brightness-110 cursor-pointer stroke-amber-400 stroke-[3px]' 
            : 'hover:brightness-105'
        }`}
        style={is3DMode ? { transform: 'translateZ(0px)', transformStyle: 'preserve-3d' } : undefined}
      />

      {/* renderTerrainFeatures is omitted so the raw background image texture is fully visible and not drawn over */}
      {/* {renderTerrainFeatures()} */}

      {tile.numberToken !== null && (
        <NumberToken centerX={center.x} centerY={center.y} value={tile.numberToken} is3DMode={is3DMode} />
      )}

      {tile.hasRobber && (
        <g transform={`translate(${center.x}, ${center.y + 13})`} className="drop-shadow-lg filter pointer-events-none">
          {/* Outer glowing shield border (Robber icon) */}
          <path
            d="M -11,-12 L 11,-12 L 11,-3 C 11,4 0,14 0,14 C 0,14 -11,4 -11,-3 Z"
            fill="#1e1b4b"
            stroke="#fbbf24"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          {/* Inner shield decoration */}
          <path
            d="M -7,-8 L 7,-8 L 7,-2 C 7,3 0,10 0,10 C 0,10 -7,3 -7,-2 Z"
            fill="#312e81"
            stroke="#f59e0b"
            strokeWidth="1"
            strokeLinejoin="round"
          />
          {/* Dark emblem/cross inside */}
          <path
            d="M -3,-2 L 3,-2 M 0,-5 L 0,1"
            stroke="#f43f5e"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>
      )}
    </g>
  );
};