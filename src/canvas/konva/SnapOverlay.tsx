import type { SnapResult } from '../Snap';

interface Props {
  snap: SnapResult | null;
  leftPx: number;
  topPx: number;
}

const SnapOverlay = ({ snap, leftPx, topPx }: Props) => {
  if (!snap || snap.kind === 'none') return null;

  return (
    <div className="pointer-events-none absolute" style={{ left: `${leftPx}px`, top: `${topPx}px`, transform: 'translate(-50%, -50%)' }}>
      <div className="h-3 w-3 rounded-full border border-emerald-600 bg-emerald-300/70" />
      <div className="absolute left-3 top-[-10px] rounded bg-white/90 px-1 text-[10px] text-emerald-700 shadow">{snap.label}</div>
    </div>
  );
};

export default SnapOverlay;
