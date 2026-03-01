import type { Project } from '../model/types';

const KEY = 'electrical-planner-autosaves';
const LIMIT = 10;

export interface AutosaveItem {
  ts: string;
  project: Project;
}

export const loadAutosaves = (): AutosaveItem[] => {
  const raw = localStorage.getItem(KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AutosaveItem[];
  } catch {
    return [];
  }
};

export const saveAutosave = (project: Project): void => {
  const items = loadAutosaves();
  const next = [{ ts: new Date().toISOString(), project }, ...items].slice(0, LIMIT);
  localStorage.setItem(KEY, JSON.stringify(next));
};

export const popLatestAutosave = (): AutosaveItem | undefined => loadAutosaves()[0];
