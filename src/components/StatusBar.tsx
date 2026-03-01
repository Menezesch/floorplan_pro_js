import { useAppStore } from '../model/store';

const StatusBar = () => {
  const snap = useAppStore((s) => s.snap);
  const pointer = useAppStore((s) => s.pointerWorld);
  const planOrigin = useAppStore((s) => s.project.settings.planOrigin);
  const view = useAppStore((s) => s.view);

  const planX = (pointer?.x ?? 0) - planOrigin.x;
  const planY = (pointer?.y ?? 0) - planOrigin.y;

  return (
    <footer className="mt-2 grid grid-cols-3 rounded bg-white px-3 py-2 text-xs text-slate-600 shadow-panel">
      <span>
        World: {pointer ? `${pointer.x.toFixed(2)} m, ${pointer.y.toFixed(2)} m` : '—'}
      </span>
      <span>
        Plan: {pointer ? `${planX.toFixed(2)} m, ${planY.toFixed(2)} m` : '—'}
      </span>
      <span className="text-right">
        Snap: {snap.active ?? 'none'} · ViewBox {view.x.toFixed(0)} {view.y.toFixed(0)} {view.w.toFixed(0)} {view.h.toFixed(0)}
      </span>
    </footer>
  );
};

export default StatusBar;
