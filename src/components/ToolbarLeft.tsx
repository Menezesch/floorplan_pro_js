import { TOOLS } from '../canvas/Tools';
import { useAppStore } from '../model/store';

const ToolbarLeft = () => {
  const active = useAppStore((s) => s.activeTool);
  const setTool = useAppStore((s) => s.setTool);
  return (
    <aside className="w-52 rounded-lg bg-white p-3 shadow-panel">
      <h2 className="mb-3 text-sm font-semibold text-slate-700">Tools</h2>
      <div className="space-y-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.name}
              className={`flex w-full items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm ${
                active === tool.name
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-transparent bg-slate-100 text-slate-700 hover:border-slate-300 hover:bg-slate-200'
              }`}
              onClick={() => setTool(tool.name)}
            >
              <Icon size={16} strokeWidth={2} />
              <span className="flex-1">{tool.label}</span>
              <span className="text-xs opacity-70">{tool.key}</span>
            </button>
          );
        })}
      </div>
    </aside>
  );
};

export default ToolbarLeft;
