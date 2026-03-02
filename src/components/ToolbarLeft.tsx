import { TOOLS } from '../canvas/Tools';
import { useAppStore } from '../model/store';
import type { SymbolType } from '../model/types';

const SYMBOL_TYPES: { type: SymbolType; label: string }[] = [
  { type: 'chair', label: 'Chair' },
  { type: 'table', label: 'Table' },
  { type: 'sofa', label: 'Sofa' },
  { type: 'bed', label: 'Bed' },
  { type: 'sink', label: 'Sink' },
  { type: 'toilet', label: 'Toilet' },
  { type: 'bathtub', label: 'Bathtub' },
  { type: 'desk', label: 'Desk' }
];

const ToolbarLeft = () => {
  const active = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);
  const activeSymbolType = useAppStore((s) => s.activeSymbolType);
  const setActiveSymbolType = useAppStore((s) => s.setActiveSymbolType);
  const gridVisible = useAppStore((s) => s.gridVisible);
  const toggleGrid = useAppStore((s) => s.toggleGrid);

  return (
    <aside className="w-48 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Tools</h2>
      <div className="space-y-1">
        {TOOLS.map((tool) => (
          <button
            key={tool.name}
            className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors duration-100 ${active === tool.name ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
            onClick={() => setTool(tool.name)}
          >
            {tool.label}{' '}
            <kbd className={`ml-1 rounded px-1 py-0.5 text-xs font-normal ${active === tool.name ? 'bg-blue-500 text-blue-100' : 'bg-white text-slate-500 ring-1 ring-slate-300'}`}>
              {tool.key}
            </kbd>
          </button>
        ))}
      </div>

      {active === 'symbol' && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="mb-1.5 text-xs font-medium text-slate-500">Symbol type</p>
          <div className="space-y-1">
            {SYMBOL_TYPES.map((s) => (
              <button
                key={s.type}
                className={`w-full rounded px-2 py-1 text-left text-xs transition-colors duration-100 ${activeSymbolType === s.type ? 'bg-violet-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`}
                onClick={() => setActiveSymbolType(s.type)}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 border-t border-slate-100 pt-3">
        <button
          className={`w-full rounded px-3 py-1.5 text-left text-sm transition-colors duration-100 ${gridVisible ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
          onClick={toggleGrid}
          title="Toggle grid (Ctrl+G)"
        >
          {gridVisible ? '\u25a6 Grid On' : '\u25a6 Grid Off'}
        </button>
      </div>
    </aside>
  );
};

export default ToolbarLeft;
