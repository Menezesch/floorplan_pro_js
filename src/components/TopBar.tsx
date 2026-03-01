import { useRef, useState } from 'react';
import { Settings2 } from 'lucide-react';
import { useAppStore } from '../model/store';
import { exportProjectXml, importProjectXml } from '../io/xml';
import { exportSvg } from '../io/svgExport';
import { exportPngFromSvg } from '../io/pngExport';
import Modal from './Modal';

interface Props {
  addToast: (m: string) => void;
}

const TopBar = ({ addToast }: Props) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [openSettings, setOpenSettings] = useState(false);
  const project = useAppStore((s) => s.project);
  const replaceProject = useAppStore((s) => s.replaceProject);
  const updateSettings = useAppStore((s) => s.updateSettings);
  const markSaved = useAppStore((s) => s.markSaved);

  const saveXml = () => {
    const xml = exportProjectXml(project);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.meta.name.replace(/\s+/g, '_') || 'project'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    markSaved();
  };

  const openXml = async (file?: File) => {
    if (!file) return;
    const text = await file.text();
    const result = importProjectXml(text);
    if (result.project) {
      replaceProject(result.project);
      addToast('Project imported.');
    } else {
      addToast(result.errors.join('; '));
    }
  };

  return (
    <>
      <header className="mb-3 flex items-center justify-between rounded-lg bg-white px-4 py-2 shadow-panel">
        <h1 className="text-sm font-semibold text-slate-700">Electrical Planning Tool · MVP</h1>
        <div className="flex items-center gap-2">
          <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => location.reload()}>
            New
          </button>
          <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => fileRef.current?.click()}>
            Open XML
          </button>
          <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={saveXml}>
            Save XML
          </button>
          <button
            className="rounded bg-slate-200 px-2 py-1 text-xs"
            onClick={() => {
              const svg = document.querySelector('svg');
              if (svg) exportSvg(svg as SVGSVGElement);
            }}
          >
            Export SVG
          </button>
          <button
            className="rounded bg-slate-200 px-2 py-1 text-xs"
            onClick={async () => {
              const svg = document.querySelector('svg');
              if (svg) await exportPngFromSvg(svg as SVGSVGElement);
            }}
          >
            Export PNG
          </button>
          <button
            className="rounded border border-slate-300 bg-white p-1.5 text-slate-600 hover:bg-slate-100"
            onClick={() => setOpenSettings(true)}
            title="Project Settings"
          >
            <Settings2 size={16} />
          </button>
        </div>
        <input ref={fileRef} hidden type="file" accept=".xml" onChange={(e) => openXml(e.target.files?.[0])} />
      </header>

      <Modal open={openSettings} onClose={() => setOpenSettings(false)} title="Project Settings">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <label className="flex flex-col gap-1">
            Default wall thickness (m)
            <input type="number" step="0.01" value={project.settings.defaultWallThicknessM} onChange={(e) => updateSettings({ defaultWallThicknessM: Number(e.target.value) })} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Ceiling height (m)
            <input type="number" step="0.01" value={project.settings.defaultCeilingHeightM} onChange={(e) => updateSettings({ defaultCeilingHeightM: Number(e.target.value) })} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Grid size (m)
            <input type="number" step="0.05" min="0.05" value={project.settings.gridSizeM} onChange={(e) => updateSettings({ gridSizeM: Number(e.target.value) })} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Snap threshold (px)
            <input type="number" step="1" min="1" value={project.settings.snapThresholdPx} onChange={(e) => updateSettings({ snapThresholdPx: Number(e.target.value) })} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Plan origin X (m)
            <input type="number" step="0.05" value={project.settings.planOrigin.x} onChange={(e) => updateSettings({ planOrigin: { ...project.settings.planOrigin, x: Number(e.target.value) } })} className="rounded border px-2 py-1" />
          </label>
          <label className="flex flex-col gap-1">
            Plan origin Y (m)
            <input type="number" step="0.05" value={project.settings.planOrigin.y} onChange={(e) => updateSettings({ planOrigin: { ...project.settings.planOrigin, y: Number(e.target.value) } })} className="rounded border px-2 py-1" />
          </label>
        </div>
      </Modal>
    </>
  );
};

export default TopBar;
