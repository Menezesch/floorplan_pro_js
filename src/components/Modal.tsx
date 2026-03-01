import type { ReactNode } from 'react';

interface Props {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
}

const Modal = ({ open, title, children, onClose }: Props) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40">
      <div className="w-[420px] rounded-xl bg-white p-4 shadow-panel">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
};

export default Modal;
