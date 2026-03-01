import type { Project } from './types';

export const validateProject = (project: Project): string[] => {
  const errors: string[] = [];
  if (project.units !== 'm') errors.push('Project units must be meters.');
  if (project.settings.gridSizeM < 0.05) errors.push('Grid size must be >= 0.05m.');
  for (const wall of project.walls) {
    if (wall.p1.x === wall.p2.x && wall.p1.y === wall.p2.y) {
      errors.push(`Wall ${wall.id} has zero length.`);
    }
  }
  return errors;
};
