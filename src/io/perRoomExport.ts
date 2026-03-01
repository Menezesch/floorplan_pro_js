import type { Project } from '../model/types';
import { pointInPolygon } from '../geometry/polygonOps';

export const roomScopedProject = (project: Project, roomId: string): Project | undefined => {
  const room = project.rooms.find((r) => r.id === roomId);
  if (!room) return undefined;
  return {
    ...project,
    walls: project.walls.filter((w) => room.wallIds.includes(w.id)),
    rooms: [room],
    obstacles: project.obstacles.filter((o) => o.polygon.some((p) => pointInPolygon(p, room.boundary)))
  };
};
