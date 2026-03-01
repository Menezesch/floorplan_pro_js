import type { Project } from './types';

export const validateProject = (project: Project): string[] => {
  const errors: string[] = [];
  if (project.units !== 'm') errors.push('Project units must be meters.');
  const vertexIds = new Set(project.wallVertices.map((v) => v.id));
  for (const edge of project.wallEdges) {
    if (!vertexIds.has(edge.v1Id) || !vertexIds.has(edge.v2Id)) errors.push(`Wall edge ${edge.id} references missing vertices.`);
    if (edge.v1Id === edge.v2Id) errors.push(`Wall edge ${edge.id} cannot connect same vertex.`);
  }
  for (const room of project.rooms) {
    if (room.boundary.length < 3) errors.push(`Room ${room.id} has invalid boundary.`);
  }
  return errors;
};
