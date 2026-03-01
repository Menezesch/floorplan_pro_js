import { useAppStore } from '../model/store';

const StatusBar = () => {
  const snap = useAppStore((s) => s.snap);
  const view = useAppStore((s) => s.view);
  return (
    <footer className="mt-2 flex items-center justify-between rounded bg-white px-3 py-2 text-xs text-slate-600 shadow-panel">
      <span>Snap: {Object.entries(snap).filter(([, v]) => Boolean(v)).map(([k]) => k).join(', ')}</span>
      <span>ViewBox {view.x.toFixed(0)} {view.y.toFixed(0)} {view.w.toFixed(0)} {view.h.toFixed(0)}</span>
    </footer>
  );
};

export default StatusBar;
