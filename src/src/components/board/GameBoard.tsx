import React from 'react';
import { useGame } from '../../context/GameContext';
import { useGameUI } from '../../context/GameUIContext';
import { HexTile } from './HexTile';
import { EdgeLine } from './EdgeLine';
import { VertexNode } from './VertexNode';

export const GameBoard: React.FC = () => {
  const { isAlternativeTheme } = useGameUI();
  const {
    tiles,
    vertices,
    edges,
    players,
    currentPlayerIndex,
    setEdges,
    setPlayers,
    is3DMode,
    showBuildingCostToast,
    addLog,
    roadBuildingRemaining,
    gamePhase,
    setVertices,
    setActivePortTrade,
    boardRenderCache,
  } = useGame();

  // אם הלוח עדיין לא אותחל (למשל, אנחנו עדיין בלובי), לא נציג כלום
  if (tiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white text-xl">
        המשחק עוד לא התחיל. היכנס ללובי ולחץ על התחלה!
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center w-full h-full bg-blue-950/20 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden p-6 shadow-2xl">
      {/* הגדרת רכיב ה-SVG הראשי.
        ה-viewBox מוגדר מ-300- עד 300 (רוחב וגובה כולל של 600) כדי שנקודת ה-0,0 תהיה בדיוק במרכז החלון.
      */}
      <svg 
        viewBox="-300 -300 600 600" 
        className="w-full h-full max-w-[900px] max-h-[900px] drop-shadow-2xl filter"
        style={{ transformStyle: 'preserve-3d', perspective: '1000px' }}
      >
        <defs>
          {/* Textures for Hexagons */}
          <pattern id="tex-WOOD" patternUnits="objectBoundingBox" width="1" height="1">
            <image href={isAlternativeTheme ? "/wood1.jpg" : "/wood.jpg"} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-BRICK" patternUnits="objectBoundingBox" width="1" height="1">
            <image href={isAlternativeTheme ? "/brick1.jpg" : "/brick.jpg"} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-SHEEP" patternUnits="objectBoundingBox" width="1" height="1">
            <image href={isAlternativeTheme ? "/wool1.jpg" : "/wool.jpg"} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-WHEAT" patternUnits="objectBoundingBox" width="1" height="1">
            <image href={isAlternativeTheme ? "/wheat1.jpg" : "/wheat.jpg"} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-ORE" patternUnits="objectBoundingBox" width="1" height="1">
            <image href={isAlternativeTheme ? "/rock1.jpg" : "/rock.jpg"} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-DESERT" patternUnits="objectBoundingBox" width="1" height="1">
            <image href={isAlternativeTheme ? "/desert1.jpg" : "/desert.jpg"} x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-SEA" patternUnits="objectBoundingBox" width="1" height="1">
            <image href="/see.jpg" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-GOLD_FIELD" patternUnits="objectBoundingBox" width="1" height="1">
            <image href="/gold.jpg" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>
          <pattern id="tex-FOG" patternUnits="objectBoundingBox" width="1" height="1">
            <image href="/fog.jpg" x="0" y="0" width="100%" height="100%" preserveAspectRatio="xMidYMid slice" />
          </pattern>

          {/* Luxurious Gradient Defs - Linear & Radial SVG Gradients for each resource */}
          <radialGradient id="grad-WOOD" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="45%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#052e16" />
          </radialGradient>
          
          <radialGradient id="grad-BRICK" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#f87171" />
            <stop offset="50%" stopColor="#b91c1c" />
            <stop offset="100%" stopColor="#450a0a" />
          </radialGradient>
          
          <radialGradient id="grad-SHEEP" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#a3e635" />
            <stop offset="45%" stopColor="#4d7c0f" />
            <stop offset="100%" stopColor="#1a2e05" />
          </radialGradient>
          
          <radialGradient id="grad-WHEAT" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="40%" stopColor="#eab308" />
            <stop offset="85%" stopColor="#854d0e" />
            <stop offset="100%" stopColor="#422006" />
          </radialGradient>
          
          <radialGradient id="grad-ORE" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="35%" stopColor="#64748b" />
            <stop offset="75%" stopColor="#334155" />
            <stop offset="100%" stopColor="#0f172a" />
          </radialGradient>
          
          <radialGradient id="grad-DESERT" cx="50%" cy="50%" r="75%">
            <stop offset="0%" stopColor="#fef3c7" />
            <stop offset="50%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          {/* Glowing filters for structures */}
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComponentTransfer in="blur" result="glow1">
              <feFuncA type="linear" slope="0.6" />
            </feComponentTransfer>
            <feMerge>
              <feMergeNode in="glow1" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          {/* Player color filters for tinting settlements, cities and roads */}
          {players.map((player) => (
            <React.Fragment key={player.id}>
              {/* Filter for Settlements and Cities (transparent PNGs) */}
              <filter id={`tint-${player.id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feFlood flood-color={player.color} flood-opacity="0.78" result="flood" />
                <feBlend mode="multiply" in="SourceGraphic" in2="flood" result="blend" />
                <feComposite in="blend" in2="SourceAlpha" operator="in" />
              </filter>

              {/* Filter for Roads (removes white bg & tints in player color) */}
              <filter id={`tint-road-${player.id}`} x="-20%" y="-20%" width="140%" height="140%">
                <feColorMatrix type="matrix" in="SourceGraphic" values="
                  0 0 0 0 0
                  0 0 0 0 0
                  0 0 0 0 0
                  -0.2126 -0.7152 -0.0722 0 1"
                  result="mask"
                />
                <feFlood flood-color={player.color} flood-opacity="0.78" result="flood" />
                <feComposite in="flood" in2="mask" operator="in" />
              </filter>
            </React.Fragment>
          ))}
        </defs>

        {/* רקע הים ההיקפי - טבעת היקפית גדולה */}
        <circle cx="0" cy="0" r="285" fill="url(#tex-SEA)" />

        {/* קבוצת תוכן הלוח עם סקייל מוגדל בצורה משמעותית וחלקת תלת-מימד */}
        <g transform="scale(1.25)" style={{ transformStyle: 'preserve-3d' }}>
          {/* שכבה 1: אריחי המשושים (הקרקע והמשאבים) והמספרים עליהם */}
          <g id="tiles-layer" style={{ transformStyle: 'preserve-3d' }}>
            {tiles.map((tile) => (
              <HexTile key={tile.id} tile={tile} />
            ))}
          </g>

          {/* שכבה 2: קצוות הלוח (הנתיבים שבהם אפשר לבנות כבישים) */}
          <g id="edges-layer" style={{ transformStyle: 'preserve-3d' }}>
            {edges.map((edge) => (
              <EdgeLine
                key={edge.id}
                edge={edge}
                vertices={vertices}
                edges={edges}
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                setEdges={setEdges}
                setPlayers={setPlayers}
                is3DMode={is3DMode}
                showBuildingCostToast={showBuildingCostToast}
                addLog={addLog}
                roadBuildingRemaining={roadBuildingRemaining}
                tiles={tiles}
              />
            ))}
          </g>

          {/* שכבה 3: צמתי הלוח (הנקודות שבהן בונים יישובים וערים) - נמצאים למעלה כדי שיהיה קל ללחוץ עליהם */}
          <g id="vertices-layer" style={{ transformStyle: 'preserve-3d' }}>
            {vertices.filter((vertex) => boardRenderCache.edgesByVertexId.has(vertex.id)).map((vertex) => (
              <VertexNode
                key={vertex.id}
                vertex={vertex}
                vertices={vertices}
                edges={edges}
                players={players}
                currentPlayerIndex={currentPlayerIndex}
                gamePhase={gamePhase}
                setVertices={setVertices}
                setPlayers={setPlayers}
                is3DMode={is3DMode}
                showBuildingCostToast={showBuildingCostToast}
                addLog={addLog}
                setActivePortTrade={setActivePortTrade}
              />
            ))}
          </g>
        </g>
      </svg>
    </div>
  );
};
