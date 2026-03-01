import { useEffect, useState } from 'react';
import Layout from './components/Layout';
import TopBar from './components/TopBar';
import Toasts from './components/Toasts';
import { useAppStore } from './model/store';

const App = () => {
  const [toasts, setToasts] = useState<string[]>([]);
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
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [hasUnsavedChanges]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        undo();
      }
      if (event.ctrlKey && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        redo();
      }
      if (event.key === 'Delete') deleteSelection();
      if (event.key === 'Escape') setTool('select');
      if (event.key.toLowerCase() === 'v') setTool('select');
      if (event.key.toLowerCase() === 'w') setTool('wall');
      if (event.key.toLowerCase() === 'o') setTool('obstacle');
      if (event.key.toLowerCase() === 'r') setTool('room');
      if (event.key.toLowerCase() === 'n') setTool('window');
      if (event.key.toLowerCase() === 'd') setTool('door');
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
