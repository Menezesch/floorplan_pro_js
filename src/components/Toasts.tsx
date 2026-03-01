interface Props {
  messages: string[];
}

const Toasts = ({ messages }: Props) => (
  <div className="pointer-events-none fixed right-3 top-14 z-40 space-y-2">
    {messages.map((m, i) => (
      <div key={`${m}-${i}`} className="rounded bg-slate-800 px-3 py-2 text-xs text-white shadow-panel">
        {m}
      </div>
    ))}
  </div>
);

export default Toasts;
