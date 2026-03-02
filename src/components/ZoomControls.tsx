import { useRef, useState } from 'react';
import { useAppStore } from '../model/store';
import type { ViewportView } from '../canvas/konva/ViewportTransform';
import { withZoomAtScreenPoint, MIN_VIEW_SIZE_M, MAX_VIEW_SIZE_M } from '../canvas/konva/ViewportTransform';

// 100% = DEFAULT_VIEW_W_M = 30m wide view
// MIN_PCT=10, MAX_PCT=1000 ensures log-center = 100% exactly (10*1000=100²=10000)
const DEFAULT_VIEW_W_M = 30;
const MIN_PCT = 10;
const MAX_PCT = 1000;

const viewToPercent = (w: number) => (DEFAULT_VIEW_W_M / w) * 100;
const percentToViewW = (pct: number) => (DEFAULT_VIEW_W_M / pct) * 100;

const pctToSlider = (pct: number) =>
  (Math.log(pct) - Math.log(MIN_PCT)) / (Math.log(MAX_PCT) - Math.log(MIN_PCT));
const sliderToPct = (s: number) =>
  Math.exp(Math.log(MIN_PCT) + s * (Math.log(MAX_PCT) - Math.log(MIN_PCT)));

interface Props {
  view: ViewportView;
  setView: (next: Partial<ViewportView>) => void;
  viewportPx: { width: number; height: number };
}

const ZoomControls = ({ view, setView, viewportPx }: Props) => {
  const fitToScreen = useAppStore((s) => s.fitToScreen);
  const [inputText, setInputText] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const currentPct = Math.round(viewToPercent(view.w));
  const sliderVal = pctToSlider(Math.min(MAX_PCT, Math.max(MIN_PCT, currentPct)));

  const applyPercent = (pct: number) => {
    const clamped = Math.min(MAX_PCT, Math.max(MIN_PCT, pct));
    const newW = Math.min(MAX_VIEW_SIZE_M, Math.max(MIN_VIEW_SIZE_M, percentToViewW(clamped)));
    const newH = (newW * viewportPx.height) / viewportPx.width;
    const cx = view.x + view.w / 2;
    const cy = view.y + view.h / 2;
    setView({ w: newW, h: newH, x: cx - newW / 2, y: cy - newH / 2, zoom: 1 / newW });
  };

  const onSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const s = Number(e.target.value);
    applyPercent(sliderToPct(s));
  };

  const onInputCommit = () => {
    if (inputText !== null) {
      const parsed = parseFloat(inputText);
      if (Number.isFinite(parsed) && parsed > 0) applyPercent(parsed);
    }
    setInputText(null);
  };

  const onInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { onInputCommit(); inputRef.current?.blur(); }
    if (e.key === 'Escape') { setInputText(null); inputRef.current?.blur(); }
  };

  const stepZoom = (factor: number) => {
    const center = { x: viewportPx.width / 2, y: viewportPx.height / 2 };
    setView(withZoomAtScreenPoint(view, viewportPx, center, factor));
  };

  return (
    <div className="absolute bottom-8 right-2 flex items-center gap-1 rounded-lg bg-white/95 px-2 py-1.5 shadow-md ring-1 ring-slate-200">
      {/* Fit to screen */}
      <button
        className="rounded px-1.5 py-0.5 text-xs text-slate-600 transition-colors duration-100 hover:bg-slate-100 active:bg-slate-200"
        title="Fit to screen"
        onClick={fitToScreen}
      >
        ⊞
      </button>

      {/* Zoom out */}
      <button
        className="rounded px-1.5 py-0.5 text-xs text-slate-600 transition-colors duration-100 hover:bg-slate-100 active:bg-slate-200"
        title="Zoom out"
        onClick={() => stepZoom(1.25)}
      >
        −
      </button>

      {/* Logarithmic slider — center = 100% */}
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={sliderVal}
        onChange={onSliderChange}
        className="h-1.5 w-28 cursor-pointer accent-blue-600"
        title={`Zoom: ${currentPct}%`}
      />

      {/* Zoom in */}
      <button
        className="rounded px-1.5 py-0.5 text-xs text-slate-600 transition-colors duration-100 hover:bg-slate-100 active:bg-slate-200"
        title="Zoom in"
        onClick={() => stepZoom(0.8)}
      >
        +
      </button>

      {/* Percentage text input */}
      <input
        ref={inputRef}
        type="text"
        className="w-12 rounded border border-slate-200 bg-slate-50 px-1 py-0.5 text-center text-xs text-slate-700 focus:border-blue-400 focus:outline-none"
        value={inputText !== null ? inputText : `${currentPct}%`}
        onFocus={() => setInputText(String(currentPct))}
        onChange={(e) => setInputText(e.target.value)}
        onBlur={onInputCommit}
        onKeyDown={onInputKeyDown}
        title="Zoom percentage"
      />
    </div>
  );
};

export default ZoomControls;
