import type { Project } from '../model/types';

export const roomScopedProject = (project: Project, roomId: string): Project | undefined => {
  const room = project.rooms.find((r) => r.id === roomId);
  if (!room) return undefined;
  return {
    ...project,
    rooms: [room],
    walls: project.walls.filter((wall) => {
      const minX = room.origin.x;
      const minY = room.origin.y;
      const maxX = room.origin.x + room.widthM;
      const maxY = room.origin.y + room.heightM;
      const inside = (x: number, y: number) => x >= minX && x <= maxX && y >= minY && y <= maxY;
      return inside(wall.p1.x, wall.p1.y) || inside(wall.p2.x, wall.p2.y);
    }),
    openings: project.openings.filter((opening) =>
      project.walls.some((wall) => wall.id === opening.wallId)
    )
  };
};
