import React from 'react';

export interface VertexAction {
  type: 'BUILD_SETTLEMENT' | 'BUILD_CITY' | 'BUILD_KNIGHT' | 'ACTIVATE_KNIGHT' | 'UPGRADE_KNIGHT' | 'BUILD_CITY_WALL';
  label: string;
  cost: {
    WOOD?: number;
    BRICK?: number;
    SHEEP?: number;
    WHEAT?: number;
    ORE?: number;
  };
  isAffordable: boolean;
  onClick: () => void;
  description?: string;
}

interface VertexActionPopoverProps {
  screenCoords: { x: number; y: number };
  vertexId: string;
  actions: VertexAction[];
  onClose: () => void;
}

export const VertexActionPopover: React.FC<VertexActionPopoverProps> = ({
  screenCoords,
  vertexId,
  actions,
  onClose,
}) => {
  const resourceNames: Record<string, string> = {
    WOOD: 'עץ',
    BRICK: 'לבנה',
    SHEEP: 'כבש',
    WHEAT: 'חיטה',
    ORE: 'ברזל',
  };

  const resourceColors: Record<string, string> = {
    WOOD: 'text-emerald-400 bg-emerald-950/40 border-emerald-500/30',
    BRICK: 'text-orange-400 bg-orange-950/40 border-orange-500/30',
    SHEEP: 'text-pink-400 bg-pink-950/40 border-pink-500/30',
    WHEAT: 'text-amber-400 bg-amber-950/40 border-amber-500/30',
    ORE: 'text-slate-300 bg-slate-800/40 border-slate-700/30',
  };

  return (
    <div
      className="fixed z-[9999] pointer-events-auto animate-fade-in"
      style={{
        left: screenCoords.x,
        top: screenCoords.y,
        transform: 'translate(-50%, -100%) translateY(-10px)',
      }}
      dir="rtl"
    >
      {/* Popover Card */}
      <div className="relative w-72 rounded-2xl border border-slate-700/80 bg-slate-950/90 p-4 shadow-2xl backdrop-blur-lg">
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="absolute left-3 top-3 flex h-6 w-6 cursor-pointer items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 transition hover:border-rose-500/60 hover:text-white"
        >
          ×
        </button>

        {/* Header */}
        <div className="mb-3 border-b border-slate-800/60 pb-2">
          <h4 className="font-serif text-sm font-black text-amber-400">פעולות קודקוד</h4>
          <span className="text-[9px] text-slate-400 font-mono">מזהה: {vertexId.replace('v_', '')}</span>
        </div>

        {/* Actions List */}
        <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
          {actions.map((action) => (
            <button
              key={action.type}
              disabled={!action.isAffordable}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick();
                onClose();
              }}
              className={`w-full text-right p-2.5 rounded-xl border transition-all duration-200 flex flex-col gap-1 cursor-pointer
                ${
                  action.isAffordable
                    ? 'border-slate-800 bg-slate-900/50 hover:bg-slate-900 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5'
                    : 'border-slate-900 bg-slate-950/40 opacity-40 cursor-not-allowed'
                }
              `}
            >
              <div className="flex items-center justify-between w-full">
                <span className="text-xs font-black text-slate-100">{action.label}</span>
                {!action.isAffordable && (
                  <span className="text-[9px] font-bold text-rose-400 bg-rose-950/30 px-1.5 py-0.5 rounded border border-rose-500/20">
                    חסר משאבים
                  </span>
                )}
              </div>

              {action.description && (
                <span className="text-[10px] text-slate-400 leading-normal">{action.description}</span>
              )}

              {/* Resource Costs */}
              <div className="flex flex-wrap gap-1 mt-1">
                {Object.entries(action.cost).map(([res, amount]) => {
                  if (!amount || amount <= 0) return null;
                  return (
                    <span
                      key={res}
                      className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${resourceColors[res] || ''}`}
                    >
                      {amount} {resourceNames[res] || res}
                    </span>
                  );
                })}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Popover Arrow */}
      <div className="absolute bottom-0 left-1/2 h-3 w-3 -translate-x-1/2 translate-y-1.5 rotate-45 border-r border-b border-slate-700/80 bg-slate-950"></div>
    </div>
  );
};
