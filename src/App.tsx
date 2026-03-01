import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import TopBar from './components/TopBar';
import Toasts from './components/Toasts';
import { useAppStore } from './model/store';
import { popLatestAutosave, saveAutosave } from './io/autosave';

const App = () => {
  const [toasts, setToasts] = useState<string[]>([]);
  const project = useAppStore((s) => s.project);
  const replaceProject = useAppStore((s) => s.replaceProject);
  const hasUnsavedChanges = useAppStore((s) => s.hasUnsavedChanges);
  const undo = useAppStore((s) => s.undo);
  const redo = useAppStore((s) => s.redo);
  const deleteSelection = useAppStore((s) => s.deleteSelection);
  const setTool = useAppStore((s) => s.setTool);

  const addToast = (message: string) => {
    setToasts((prev) => [...prev, message].slice(-4));
    setTimeout(() => setToasts((prev) => prev.slice(1)), 2000);
  };

  useEffect(() => {
    const autosaveTimer = setInterval(() => saveAutosave(project), 15000);
    return () => clearInterval(autosaveTimer);
  }, [project]);

  useEffect(() => {
    const autosave = popLatestAutosave();
    if (autosave && confirm(`Recover autosave from ${new Date(autosave.ts).toLocaleString()}?`)) {
      replaceProject(autosave.project);
      addToast('Recovered autosave.');
    }
  }, [replaceProject]);

  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
      }
      if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
      if (e.key === 'Delete') deleteSelection();
      if (e.key.toLowerCase() === 'v') setTool('select');
      if (e.key.toLowerCase() === 'g') setTool('move');
      if (e.key.toLowerCase() === 'w') setTool('wall');
      if (e.key.toLowerCase() === 'r') setTool('roomRect');
      if (e.key.toLowerCase() === 'o') setTool('obstacle');
      if (e.key.toLowerCase() === 'd') setTool('door');
      if (e.key.toLowerCase() === 'n') setTool('window');
      if (e.key.toLowerCase() === 'm') setTool('measure');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [deleteSelection, redo, setTool, undo]);

  return (
    <main className="h-full p-3 text-slate-800">
      <TopBar addToast={addToast} />
      <Layout />
      <Toasts messages={toasts} />
    </main>
  );
};

export default App;
