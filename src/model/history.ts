import type { Project } from './types';

export interface HistoryState {
  past: Project[];
  future: Project[];
}

export const createHistory = (): HistoryState => ({
  past: [],
  future: []
});

export const pushHistory = (history: HistoryState, project: Project): HistoryState => ({
  past: [...history.past, structuredClone(project)].slice(-100),
  future: []
});

export const undoHistory = (
  history: HistoryState,
  current: Project
): { history: HistoryState; project?: Project } => {
  const last = history.past.at(-1);
  if (!last) return { history };
  return {
    project: last,
    history: {
      past: history.past.slice(0, -1),
      future: [structuredClone(current), ...history.future].slice(0, 100)
    }
  };
};

export const redoHistory = (
  history: HistoryState,
  current: Project
): { history: HistoryState; project?: Project } => {
  const next = history.future[0];
  if (!next) return { history };
  return {
    project: next,
    history: {
      past: [...history.past, structuredClone(current)].slice(-100),
      future: history.future.slice(1)
    }
  };
};
