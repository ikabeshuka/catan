import React, { Suspense, useRef } from 'react';
import { useGame } from '../../context/GameContext';
import { validateRoadPlacement } from '../../utils/validation/validateRoadPlacement';
import { validateShipPlacement } from '../../utils/validation/validateShipPlacement';
import { WoodIcon, BrickIcon, SheepIcon, WheatIcon, OreIcon } from '../common/Icons';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { useTurnManager } from '../../hooks/useTurnManager';
import { useBoardInteraction } from '../../hooks/useBoardInteraction';
import { Board3DScene } from './Board3DScene';
import { getHarborDescription, getTileTooltipInfo } from '../../utils/boardTooltipHelpers';

export const GameBoard3D: React.FC = () => {
  const orbitControlsRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      console.log('[GameBoard3D Canvas Wrapper Dimensions]', {
        width: rect.width,
        height: rect.height,
        clientWidth: containerRef.current.clientWidth,
        clientHeight: containerRef.current.clientHeight
      });
    }
  }, []);

  const handleResetCamera = () => {
    if (orbitControlsRef.current) {
      orbitControlsRef.current.reset();
    }
  };

  const { 
    tiles, 
    vertices, 
    edges, 
    is3DMode, 
    setIs3DMode, 
    buildingToast, 
    setBuildingToast,
    players, 
    currentPlayerIndex, 
    isMovingWagon,
    activeExpansion,
    gamePhase,
    addLog,
    showBuildingCostToast
  } = useGame();

  useTurnManager();

  React.useEffect(() => {
    const updateCamera = () => {
      if (orbitControlsRef.current) {
        const controls = orbitControlsRef.current;
        const camera = controls.object as THREE.PerspectiveCamera;
        if (camera) {
          const isSeafarers = activeExpansion === 'SEAFARERS' || tiles.length === 37;
          if (!is3DMode) {
            camera.position.set(0, 0, isSeafarers ? 58 : 46);
            camera.fov = isSeafarers ? 35 : 30;
            camera.updateProjectionMatrix();
            controls.target.set(0, 0, 0);
            controls.update();
          } else {
            camera.position.set(0, isSeafarers ? -38 : -29, isSeafarers ? 54 : 41);
            camera.fov = isSeafarers ? 35 : 30;
            camera.updateProjectionMatrix();
            controls.target.set(0, 0, 0);
            controls.update();
          }
        }
      }
    };

    updateCamera();
    const timer = setTimeout(updateCamera, 50);
    const timer2 = setTimeout(updateCamera, 150);
    return () => {
      clearTimeout(timer);
      clearTimeout(timer2);
    };
  }, [is3DMode, activeExpansion, tiles.length]);

  const {
    hoveredTile,
    setHoveredTile,
    hoveredHarbor,
    setHoveredHarbor,
    coastlinePopupEdge,
    setCoastlinePopupEdge,
    buildRoadOnEdge,
    buildShipOnEdge,
    handleTileClick,
    handleVertexClick,
    handleEdgeClick,
    getVertexConfig,
    getEdgeConfig,
    isSelectableForRobber,
  } = useBoardInteraction();

  if (tiles.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-white text-xl">
        המשחק עוד לא התחיל. היכנס ללובי ולחץ על התחלה!
      </div>
    );
  }

  return (
    <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
      {/* תצוגת עלות הבנייה בכל לחיצה - Toast מרהיב */}
      {buildingToast && (
        <div 
          className={`absolute top-16 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border backdrop-blur-lg shadow-2xl text-center select-none cursor-pointer transition-all duration-300 transform scale-100 hover:scale-105 active:scale-95 animate-pulse
            ${buildingToast.success 
              ? 'bg-emerald-950/85 border-emerald-500/50 text-emerald-200 shadow-emerald-500/20' 
              : 'bg-red-950/85 border-red-500/50 text-red-200 shadow-red-500/20'
            }`}
          onClick={() => setBuildingToast(null)}
          dir="rtl"
        >
          <div className="text-xs font-black flex items-center gap-1.5 justify-center">
            <span>{buildingToast.success ? '🎉 הבנייה הושלמה בהצלחה!' : (buildingToast.errorMessage ? '❌ שגיאת בנייה!' : '❌ חסרים משאבים לבנייה זו!')}</span>
          </div>
          <div className="text-xs font-extrabold opacity-95">
            {buildingToast.errorMessage ? (
              <span className="text-red-400 font-extrabold">{buildingToast.errorMessage}</span>
            ) : (
              <>
                {buildingToast.type === 'ROAD' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות בניית כביש:</span>
                {buildingToast.isFree ? (
                  <span className="text-emerald-400 font-extrabold">חינם! (שלב הקמה / קלף בניית כבישים)</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1"><WoodIcon size={12} /> עץ x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><BrickIcon size={12} /> לבנה x1</span>
                  </>
                )}
              </span>
            )}
            {buildingToast.type === 'SETTLEMENT' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות בניית יישוב:</span>
                {buildingToast.isFree ? (
                  <span className="text-emerald-400 font-extrabold">חינם! (שלב הקמה)</span>
                ) : (
                  <>
                    <span className="inline-flex items-center gap-1"><WoodIcon size={12} /> עץ x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><BrickIcon size={12} /> לבנה x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><SheepIcon size={12} /> כבש x1</span>
                    <span>,</span>
                    <span className="inline-flex items-center gap-1"><WheatIcon size={12} /> חיטה x1</span>
                  </>
                )}
              </span>
            )}
            {buildingToast.type === 'CITY' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות שדרוג לעיר:</span>
                <span className="inline-flex items-center gap-1"><OreIcon size={12} /> ברזל x3</span>
                <span>,</span>
                <span className="inline-flex items-center gap-1"><WheatIcon size={12} /> חיטה x2</span>
              </span>
            )}
            {buildingToast.type === 'SHIP' && (
              <span className="inline-flex items-center gap-1.5 flex-wrap justify-center">
                <span>עלות בניית ספינה:</span>
                <span className="inline-flex items-center gap-1"><WoodIcon size={12} /> עץ x1</span>
                <span>,</span>
                <span className="inline-flex items-center gap-1"><SheepIcon size={12} /> כבש x1</span>
              </span>
            )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Premium Integrated Controls Container */}
      <div className="absolute top-4 left-4 z-20 flex items-center gap-2">
        {/* Premium Integrated 3D Toggle Switch */}
        <div className="group relative">
          <button
            onClick={() => setIs3DMode(!is3DMode)}
            className={`relative flex items-center w-20 h-9 p-1 rounded-full cursor-pointer select-none transition-all duration-300 ease-in-out border outline-none
              ${is3DMode 
                ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                : 'bg-slate-950/80 border-slate-800/80 shadow-[0_4px_12px_rgba(0,0,0,0.5)]'
              }`}
            aria-label="שנה זווית ראייה ללוח"
          >
            {/* Knob / Slider track */}
            <div 
              className={`absolute top-0.5 bottom-0.5 w-7 rounded-full flex items-center justify-center transition-all duration-500 cubic-bezier(0.34, 1.56, 0.64, 1) shadow-md
                ${is3DMode 
                  ? 'left-[46px] bg-gradient-to-br from-amber-400 to-orange-500 text-slate-950 shadow-amber-500/30' 
                  : 'left-1 bg-gradient-to-br from-slate-700 to-slate-800 text-slate-300'
                }`}
            >
              {is3DMode ? (
                /* Isometric Box SVG */
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  {/* Top face */}
                  <polygon points="12,2 22,7 12,12 2,7" fill="currentColor" fillOpacity="0.25" />
                  {/* Left & Right vertical lines / faces */}
                  <path d="M2,7 L2,17 M22,7 L22,17 M12,12 L12,22 M2,17 L12,22 L22,17" />
                  <path d="M12,2 L12,12" />
                </svg>
              ) : (
                /* Hexagon SVG */
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="12,2 21,7 21,17 12,22 3,17 3,7" fill="currentColor" fillOpacity="0.2" />
                </svg>
              )}
            </div>

            {/* Static labels inside track */}
            <div className="w-full flex justify-between text-[10px] font-black px-2.5 text-slate-400 select-none pointer-events-none">
              <span className={`transition-all duration-300 ${!is3DMode ? 'text-slate-200 opacity-100 scale-100' : 'opacity-40 scale-90'}`}>2D</span>
              <span className={`transition-all duration-300 ${is3DMode ? 'text-amber-400 font-bold opacity-100 scale-100' : 'opacity-40 scale-90'}`}>3D</span>
            </div>
          </button>

          {/* Premium Tooltip */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 border border-slate-800 text-slate-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xl pointer-events-none opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-30" dir="rtl">
            שנה זווית ראייה ללוח
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950/95"></div>
          </div>
        </div>

        {/* Refresh / Reset Button */}
        <div className="group relative">
          <button
            onClick={handleResetCamera}
            className="flex items-center justify-center w-9 h-9 rounded-full bg-slate-950/80 border border-slate-800/80 hover:bg-slate-800/80 hover:border-slate-700 text-lg transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.5)] cursor-pointer outline-none active:scale-95"
            aria-label="איפוס סיבוב הלוח"
          >
            🔁
          </button>
          {/* Tooltip for Reset */}
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-950/95 border border-slate-800 text-slate-200 text-[11px] font-bold px-2.5 py-1.5 rounded-lg shadow-2xl pointer-events-none opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 transition-all duration-200 z-30" dir="rtl">
            איפוס סיבוב הלוח
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-slate-950/95"></div>
          </div>
        </div>
      </div>

      {/* Main canvas viewport */}
      <div ref={containerRef} className="absolute inset-0 w-full h-full" style={{ touchAction: 'none' }}>
        <Canvas camera={{ position: [0, 0, 44], fov: 30 }} style={{ touchAction: 'none' }}>
          <ambientLight intensity={1.2} />
          <directionalLight position={[10, 10, 20]} intensity={1.5} />
          <OrbitControls 
            ref={orbitControlsRef} 
            enableZoom={true} 
            enablePan={true}
            enableRotate={is3DMode}
            target={[0, 0, 0]} 
            mouseButtons={{
              LEFT: THREE.MOUSE.PAN,
              MIDDLE: THREE.MOUSE.DOLLY,
              RIGHT: THREE.MOUSE.ROTATE
            }}
            touches={{
              ONE: THREE.TOUCH.PAN,
              TWO: THREE.TOUCH.DOLLY_PAN
            }}
          />
          <Suspense fallback={null}>
            <Board3DScene 
              tiles={tiles} 
              vertices={vertices} 
              edges={edges} 
              players={players}
              currentPlayerIndex={currentPlayerIndex}
              onTileClick={handleTileClick}
              onVertexClick={handleVertexClick}
              onEdgeClick={handleEdgeClick}
              onTileHover={(tile, x, y) => setHoveredTile({ tile, x, y })}
              onTileLeave={() => setHoveredTile(null)}
              onHarborHover={(harbor, x, y) => setHoveredHarbor({ harbor, x, y })}
              onHarborLeave={() => setHoveredHarbor(null)}
              is3DMode={is3DMode}
              isMovingWagon={isMovingWagon}
              getVertexConfig={getVertexConfig}
              getEdgeConfig={getEdgeConfig}
              isSelectableForRobber={isSelectableForRobber}
            />
          </Suspense>
        </Canvas>
      </div>

      {/* hoveredHarbor Glassmorphic Balloon Overlay */}
      {hoveredHarbor && (
        <div
          className="fixed pointer-events-none z-50 flex flex-col gap-1 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-opacity duration-150 animate-fade-in text-right font-sans"
          style={{
            left: hoveredHarbor.x + 18,
            top: hoveredHarbor.y + 18,
            maxWidth: '280px',
            backgroundColor: 'rgba(15, 23, 42, 0.93)', // slate-900 with high opacity
            borderColor: 'rgba(51, 65, 85, 0.6)',      // slate-700/60
            ...(() => {
              const info = getHarborDescription(hoveredHarbor.harbor.harborType);
              return {
                backgroundImage: `linear-gradient(135deg, ${info.color.split(' ')[0].replace('from-', '')}, ${info.color.split(' ')[1].replace('to-', '')})`,
              };
            })()
          }}
          dir="rtl"
        >
          {(() => {
            const info = getHarborDescription(hoveredHarbor.harbor.harborType);
            return (
              <>
                {/* Header with Icon & Name */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <img src={info.img} className="h-5 w-5 object-contain ml-1 inline-block align-middle" alt={info.title} />
                    <span className="text-sm font-black text-white leading-none">{info.title}</span>
                  </div>
                  <div className="bg-slate-950/50 px-2.5 py-1 rounded-lg border border-white/5 shadow flex items-center justify-center font-black text-xs text-amber-400">
                    {info.ratio}
                  </div>
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-200 leading-relaxed font-extrabold mt-1">
                  {info.description}
                </p>
                <span className="text-[10px] text-slate-400 mt-1 opacity-75 font-bold">
                  לחץ כאן במהלך תורך לביצוע מסחר נמל מהיר!
                </span>
              </>
            );
          })()}
        </div>
      )}

      {/* Hover Tooltip / Explanation Balloon */}
      {hoveredTile && (
        <div
          className="fixed pointer-events-none z-50 flex flex-col gap-1 px-4 py-3 rounded-2xl border backdrop-blur-xl shadow-2xl transition-opacity duration-150 animate-fade-in text-right"
          style={{
            left: hoveredTile.x + 18,
            top: hoveredTile.y + 18,
            maxWidth: '280px',
            backgroundColor: 'rgba(15, 23, 42, 0.93)', // slate-900 with high opacity
            borderColor: 'rgba(51, 65, 85, 0.6)',      // slate-700/60
            ...(() => {
              const info = getTileTooltipInfo(hoveredTile.tile.type);
              return {
                backgroundImage: `linear-gradient(135deg, ${info.color.split(' ')[0].replace('from-', '')}, ${info.color.split(' ')[1].replace('to-', '')})`,
              };
            })()
          }}
          dir="rtl"
        >
          {(() => {
            const info = getTileTooltipInfo(hoveredTile.tile.type);
            return (
              <>
                {/* Header with Icon & Name */}
                <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <img src={info.img} className="h-5 w-5 object-contain ml-1 inline-block align-middle" alt={info.name} />
                    <span className="text-sm font-black text-white leading-none">{info.name}</span>
                  </div>
                  {/* Small SVG Resource Icon */}
                  <div className="bg-slate-950/50 p-1.5 rounded-lg border border-white/5 shadow flex items-center justify-center">
                    {hoveredTile.tile.type === 'WOOD' && <WoodIcon size={14} />}
                    {hoveredTile.tile.type === 'BRICK' && <BrickIcon size={14} />}
                    {hoveredTile.tile.type === 'SHEEP' && <SheepIcon size={14} />}
                    {hoveredTile.tile.type === 'WHEAT' && <WheatIcon size={14} />}
                    {hoveredTile.tile.type === 'ORE' && <OreIcon size={14} />}
                    {hoveredTile.tile.type === 'DESERT' && <span className="text-xs leading-none">🏜️</span>}
                  </div>
                </div>

                {/* Production Info */}
                <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
                  <span className="opacity-75">תוצרת:</span>
                  <span className="text-white bg-slate-950/40 px-2 py-0.5 rounded border border-white/5 font-extrabold">
                    {info.produces}
                  </span>
                  {hoveredTile.tile.numberToken !== null && (
                    <span className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 text-[10px] font-mono">
                      מספר: {hoveredTile.tile.numberToken}
                    </span>
                  )}
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 leading-relaxed font-medium mt-1">
                  {info.description}
                </p>
              </>
            );
          })()}
        </div>
      )}

      {/* Coastline Placement Choice Popup */}
      {coastlinePopupEdge && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-50 flex items-center justify-center pointer-events-auto">
          <div className="bg-slate-900/95 border border-slate-700/80 rounded-2xl p-6 shadow-2xl max-w-sm w-full flex flex-col gap-4 text-center font-sans animate-fade-in" dir="rtl">
            <div className="flex flex-col gap-1.5">
              <span className="text-xl font-black text-white">בנייה בקו החוף 🌊</span>
              <span className="text-sm text-slate-300">בחר איזה מבנה ברצונך להקים על קו חוף זה:</span>
            </div>
            
            <div className="flex flex-col gap-2.5 my-2">
              <button
                onClick={() => {
                  const currentPlayer = players[currentPlayerIndex];
                  const isValid = currentPlayer && validateRoadPlacement(
                    coastlinePopupEdge.id,
                    currentPlayer.id,
                    vertices,
                    edges,
                    tiles,
                    gamePhase
                  );
                  if (!isValid) {
                    const errorMsg = "חוקי המשחק אוסרים על חיבור דרך ישירות לספינה ללא יישוב/עיר בצומת המקשרת!";
                    addLog(`❌ ${errorMsg}`);
                    showBuildingCostToast('ROAD', false, false, errorMsg);
                    setCoastlinePopupEdge(null);
                    return;
                  }
                  buildRoadOnEdge(coastlinePopupEdge);
                  setCoastlinePopupEdge(null);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <span>בנה כביש 🛣️</span>
              </button>
              
              <button
                onClick={() => {
                  const currentPlayer = players[currentPlayerIndex];
                  const isValid = currentPlayer && validateShipPlacement(
                    coastlinePopupEdge.id,
                    currentPlayer.id,
                    vertices,
                    edges,
                    tiles || [],
                    gamePhase
                  );
                  if (!isValid) {
                    const errorMsg = "חוקי המשחק אוסרים על חיבור ספינה ישירות לדרך ללא יישוב/עיר בצומת המקשרת!";
                    addLog(`❌ ${errorMsg}`);
                    showBuildingCostToast('SHIP', false, false, errorMsg);
                    setCoastlinePopupEdge(null);
                    return;
                  }
                  buildShipOnEdge(coastlinePopupEdge);
                  setCoastlinePopupEdge(null);
                }}
                className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-blue-950/50 transition-all active:scale-95 cursor-pointer"
              >
                <span>בנה ספינה ⛵</span>
              </button>
            </div>
            
            <button
              onClick={() => setCoastlinePopupEdge(null)}
              className="text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 font-semibold cursor-pointer"
            >
              ביטול מהלך
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
