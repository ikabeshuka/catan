import React, { useEffect, useState } from 'react';
import * as THREE from 'three';
import { useGame } from '../../context/GameContext';
import { cubeToPixel } from '../../utils/hexMath/cubeToPixel';

interface ActiveAnimation {
  id: string;
  resourceType: 'WOOD' | 'BRICK' | 'SHEEP' | 'WHEAT' | 'ORE';
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  isHuman: boolean;
  playerName: string;
}

export const ResourceFlowOverlay: React.FC = () => {
  const { resourceFlows, setResourceFlows, resourcePosition, isResourceCollapsed } = useGame();
  const [activeAnimations, setActiveAnimations] = useState<ActiveAnimation[]>([]);
  const animationDuration = 1200; // in ms

  useEffect(() => {
    if (!resourceFlows || resourceFlows.length === 0) return;

    const newAnims: ActiveAnimation[] = resourceFlows.map((flow) => {
      let startX = 0;
      let startY = 0;

      // 1. Try to find the producing hex tile element in the DOM (very reliable for SVG/2D mode)
      let foundInDom = false;
      if (flow.tileId) {
        const tileEl = document.getElementById(`tile-${flow.tileId}`);
        if (tileEl) {
          const rect = tileEl.getBoundingClientRect();
          startX = rect.left + rect.width / 2;
          startY = rect.top + rect.height / 2;
          foundInDom = true;
        }
      }

      // 2. If not found in DOM (e.g., in 3D Canvas mode), use camera projection or board-relative percentage mapping
      if (!foundInDom) {
        const canvasEl = document.querySelector('canvas');
        if (canvasEl && (window as any).threeCamera && flow.tileCoord) {
          // Map axial pointy-top hex coordinates to 3D world units (using correct 0.025 scale factor)
          const center2D = cubeToPixel(flow.tileCoord, 60);
          const tileX = center2D.x * 0.025;
          const tileY = center2D.y * -0.025;
          const tileZ = 0.8; // default Z height of tile surface in 3D scene

          const camera = (window as any).threeCamera;
          const vector = new THREE.Vector3(tileX, tileY, tileZ);
          vector.project(camera);

          const rect = canvasEl.getBoundingClientRect();
          startX = rect.left + (vector.x * 0.5 + 0.5) * rect.width;
          startY = rect.top + (-(vector.y) * 0.5 + 0.5) * rect.height;
        } else {
          // Fallback to proportional calculation relative to the board wrapper
          const boardEl = document.getElementById('game-board-wrapper') || document.querySelector('.bg-slate-900\\/40') || document.querySelector('canvas') || document.querySelector('svg');
          if (boardEl) {
            const boardRect = boardEl.getBoundingClientRect();
            const cx = boardRect.left + boardRect.width / 2;
            const cy = boardRect.top + boardRect.height / 2;
            const scale = Math.min(boardRect.width, boardRect.height) / 600;
            startX = cx + flow.from.x * scale;
            startY = cy + flow.from.y * scale;
          } else {
            // Ultimate fallback to center of window
            startX = window.innerWidth / 2;
            startY = window.innerHeight / 2;
          }
        }
      }

      // Calculate target screen position based on player and UI state
      let endX = window.innerWidth / 2;
      let endY = window.innerHeight - 80;

      // 3. Find target player element by data-player-id (ActionSidebar or ResourceContainer)
      let targetEl: Element | null = null;
      if (flow.playerId) {
        targetEl = document.querySelector(`[data-player-id="${flow.playerId}"]`);
      }

      if (targetEl) {
        const rect = targetEl.getBoundingClientRect();
        endX = rect.left + rect.width / 2;
        endY = rect.top + rect.height / 2;
      } else {
        // Fallback for human player if specific element is not found, try card/collapsed elements
        if (flow.isHuman) {
          let cardEl: Element | null = null;
          if (isResourceCollapsed) {
            cardEl = document.querySelector(`#resource-collapsed-${flow.resourceType}`);
          } else {
            cardEl = document.querySelector(`#resource-card-${flow.resourceType}`);
          }

          if (cardEl) {
            const rect = cardEl.getBoundingClientRect();
            endX = rect.left + rect.width / 2;
            endY = rect.top + rect.height / 2;
          } else {
            if (resourcePosition === 'right') {
              endX = window.innerWidth - 160;
              endY = window.innerHeight / 2;
            } else {
              endX = window.innerWidth / 2;
              endY = window.innerHeight - 80;
            }
          }
        } else {
          // Bot player fallback target - sidebar/top left area
          endX = 168;
          endY = 120;
        }
      }

      // Target Player Node Verification:
      const el = document.querySelector('[data-player-id="' + flow.playerId + '"]');
      console.log('[Target Player Node]', flow.playerId, el, el?.getBoundingClientRect());

      // Console Log Raw Calculations:
      console.log('[ResourceFlow DEBUG]', { flow, startX, startY, endX, endY, tileCoord: flow.tileCoord, hasCamera: !!(window as any).threeCamera });

      return {
        id: flow.id,
        resourceType: flow.resourceType,
        startX,
        startY,
        endX,
        endY,
        isHuman: flow.isHuman,
        playerName: flow.playerName,
      };
    });

    setActiveAnimations((prev) => [...prev, ...newAnims]);

    // Clear global flows so they don't trigger again
    setResourceFlows([]);

    // Schedule cleanup of animations
    const timer = setTimeout(() => {
      setActiveAnimations((prev) =>
        prev.filter((anim) => !newAnims.some((na) => na.id === anim.id))
      );
    }, animationDuration + 100);

    return () => clearTimeout(timer);
  }, [resourceFlows, setResourceFlows, resourcePosition, isResourceCollapsed]);

  const getResourceImage = (type: string) => {
    switch (type) {
      case 'WOOD': return '/wood1.png';
      case 'BRICK': return '/brick1.png';
      case 'SHEEP': return '/wool1.png';
      case 'WHEAT': return '/wheat1.png';
      case 'ORE': return '/rock1.png';
      default: return '';
    }
  };

  const getResourceColor = (type: string) => {
    switch (type) {
      case 'WOOD': return 'rgba(34, 197, 94, 0.2)'; // Green
      case 'BRICK': return 'rgba(239, 68, 68, 0.2)'; // Red
      case 'SHEEP': return 'rgba(132, 204, 22, 0.2)'; // Lime
      case 'WHEAT': return 'rgba(234, 179, 8, 0.2)'; // Amber
      case 'ORE': return 'rgba(148, 163, 184, 0.2)'; // Slate
      default: return 'rgba(255, 255, 255, 0.2)';
    }
  };

  if (activeAnimations.length === 0) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-visible">
      {activeAnimations.map((anim) => {
        const bgImg = getResourceImage(anim.resourceType);
        const glowColor = getResourceColor(anim.resourceType);
        const sanitizedId = anim.id.replace(/[^a-zA-Z0-9_-]/g, '_');
        const keyframeString = `
          @keyframes float-and-glide-${sanitizedId} {
            0% {
              transform: translate(${anim.startX - 21}px, ${anim.startY - 21}px) scale(0.3);
              opacity: 0;
            }
            15% {
              transform: translate(${anim.startX - 21}px, ${anim.startY - 60}px) scale(1.2);
              opacity: 1;
            }
            30% {
              transform: translate(${anim.startX - 21}px, ${anim.startY - 50}px) scale(1);
              opacity: 1;
            }
            90% {
              transform: translate(${anim.endX - 21}px, ${anim.endY - 21}px) scale(1);
              opacity: 0.9;
            }
            100% {
              transform: translate(${anim.endX - 21}px, ${anim.endY - 21}px) scale(0.2);
              opacity: 0;
            }
          }
        `;
        const element = { style: { transform: '' } };
        console.log('[ResourceFlow CSS]', element.style.transform || keyframeString);

        return (
          <div
            key={anim.id}
            className="absolute flex items-center justify-center rounded-full p-1 border border-white/20 shadow-2xl backdrop-blur-[1px]"
            style={{
              width: '42px',
              height: '42px',
              backgroundColor: 'rgba(15, 23, 42, 0.85)',
              boxShadow: `0 0 15px 4px ${glowColor}, inset 0 1px 1px rgba(255,255,255,0.2)`,
              left: 0,
              top: 0,
              animation: `float-and-glide-${sanitizedId} ${animationDuration}ms cubic-bezier(0.25, 1, 0.5, 1) forwards`,
            }}
          >
            {bgImg && (
              <img
                src={bgImg}
                alt={anim.resourceType}
                className="w-7 h-7 object-contain bg-transparent"
              />
            )}
            <style>{keyframeString}</style>
          </div>
        );
      })}
    </div>
  );
};
