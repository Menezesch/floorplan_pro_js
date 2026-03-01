import { useRef } from 'react';
import { useAppStore } from '../model/store';
import { exportProjectXml, importProjectXml } from '../io/xml';
import { exportSvg } from '../io/svgExport';
import { exportPngFromSvg } from '../io/pngExport';

interface Props {
  addToast: (m: string) => void;
}

const TopBar = ({ addToast }: Props) => {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const project = useAppStore((s) => s.project);
  const replaceProject = useAppStore((s) => s.replaceProject);
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
    <header className="mb-3 flex items-center justify-between rounded-lg bg-white px-4 py-2 shadow-panel">
      <h1 className="text-sm font-semibold text-slate-700">Electrical Planning Tool · MVP</h1>
      <div className="flex gap-2">
        <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => location.reload()}>New</button>
        <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => fileRef.current?.click()}>Open XML</button>
        <button className="rounded bg-blue-600 px-2 py-1 text-xs text-white" onClick={saveXml}>Save XML</button>
        <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={() => {
          const svg = document.querySelector('svg');
          if (svg) exportSvg(svg as SVGSVGElement);
        }}>Export SVG</button>
        <button className="rounded bg-slate-200 px-2 py-1 text-xs" onClick={async () => {
          const svg = document.querySelector('svg');
          if (svg) await exportPngFromSvg(svg as SVGSVGElement);
        }}>Export PNG</button>
      </div>
      <input ref={fileRef} hidden type="file" accept=".xml" onChange={(e) => openXml(e.target.files?.[0])} />
    </header>
  );
};

export default TopBar;
