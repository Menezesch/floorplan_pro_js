import type { Project } from './types';

export const validateProject = (project: Project): string[] => {
  const errors: string[] = [];
  if (project.units !== 'm') errors.push('Project units must be meters.');
  for (const wall of project.walls) {
    if (wall.points.length < 2) errors.push(`Wall ${wall.id} must have at least 2 points.`);
  }
  for (const room of project.rooms) {
    if (room.boundary.length < 3) errors.push(`Room ${room.id} has invalid boundary.`);
  }
  return errors;
};
