import { TOOLS } from '../canvas/Tools';
import { useAppStore } from '../model/store';

const ToolbarLeft = () => {
  const active = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);
  return (
    <aside className="w-48 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-2 text-sm font-semibold text-slate-700">Tools</h2>
      <div className="space-y-2">
        {TOOLS.map((tool) => (
          <button key={tool.name} className={`w-full rounded px-3 py-2 text-left text-sm ${active === tool.name ? 'bg-blue-600 text-white' : 'bg-slate-100 hover:bg-slate-200'}`} onClick={() => setTool(tool.name)}>
            {tool.label} <span className="text-xs opacity-70">({tool.key})</span>
          </button>
        ))}
      </div>
    </aside>
  );
};

export default ToolbarLeft;
