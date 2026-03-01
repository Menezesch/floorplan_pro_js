import type { Project, Vec2 } from '../model/types';
import { validateProject } from '../model/validators';

const fmt = (n: number): string => n.toFixed(3);
const ptsToText = (pts: Vec2[]): string => pts.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(' ');
const textToPts = (text: string): Vec2[] =>
  text
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((pair) => {
      const [x, y] = pair.split(',').map(Number);
      return { x, y };
    });

export const exportProjectXml = (project: Project): string => `<?xml version="1.0" encoding="UTF-8"?>
<project version="1.0" units="m">
  <meta name="${project.meta.name}" created="${project.meta.created}" modified="${project.meta.modified}" grid="${fmt(project.meta.gridM)}" />
  <walls>
${project.walls
  .map(
    (w) => `    <wall id="${w.id}" thickness="${fmt(w.thicknessM)}" roomsLeft="${w.roomsLeft.join(',')}" roomsRight="${w.roomsRight.join(',')}"><centerline>${ptsToText(w.points)}</centerline></wall>`
  )
  .join('\n')}
  </walls>
  <rooms>
${project.rooms
  .map(
    (r) => `    <room id="${r.id}" name="${r.name}"><boundary>${ptsToText(r.boundary)}</boundary></room>`
  )
  .join('\n')}
  </rooms>
  <obstacles>
${project.obstacles
  .map((o) => `    <obstacle id="${o.id}" type="${o.type}"><polygon>${ptsToText(o.polygon)}</polygon></obstacle>`)
  .join('\n')}
  </obstacles>
  <openings>
${project.openings
  .map(
    (o) => `    <opening id="${o.id}" wallId="${o.wallId}" distanceAlong="${fmt(o.distanceAlongM)}" width="${fmt(o.widthM)}" type="${o.type}" orientation="${o.orientation}"/>`
  )
  .join('\n')}
  </openings>
</project>`;

export const importProjectXml = (xmlText: string): { project?: Project; errors: string[] } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) return { errors: ['Invalid XML file.'] };
  const meta = doc.querySelector('meta');
  if (!meta) return { errors: ['Missing meta node.'] };
  const project: Project = {
    version: '1.0',
    units: 'm',
    meta: {
      name: meta.getAttribute('name') ?? 'Imported project',
      created: meta.getAttribute('created') ?? new Date().toISOString(),
      modified: meta.getAttribute('modified') ?? new Date().toISOString(),
      gridM: Number(meta.getAttribute('grid') ?? 0.1)
    },
    walls: Array.from(doc.querySelectorAll('walls wall')).map((wall) => ({
      id: wall.getAttribute('id') ?? crypto.randomUUID(),
      thicknessM: Number(wall.getAttribute('thickness') ?? 0.12),
      points: textToPts(wall.querySelector('centerline')?.textContent ?? ''),
      polygon: [],
      roomsLeft: (wall.getAttribute('roomsLeft') ?? '').split(',').filter(Boolean),
      roomsRight: (wall.getAttribute('roomsRight') ?? '').split(',').filter(Boolean)
    })),
    rooms: Array.from(doc.querySelectorAll('rooms room')).map((room) => ({
      id: room.getAttribute('id') ?? crypto.randomUUID(),
      name: room.getAttribute('name') ?? 'Room',
      boundary: textToPts(room.querySelector('boundary')?.textContent ?? ''),
      wallIds: [],
      areaM2: 0,
      perimeterM: 0
    })),
    obstacles: Array.from(doc.querySelectorAll('obstacles obstacle')).map((o) => ({
      id: o.getAttribute('id') ?? crypto.randomUUID(),
      type: 'no_go' as const,
      polygon: textToPts(o.querySelector('polygon')?.textContent ?? '')
    })),
    openings: Array.from(doc.querySelectorAll('openings opening')).map((o) => ({
      id: o.getAttribute('id') ?? crypto.randomUUID(),
      wallId: o.getAttribute('wallId') ?? '',
      distanceAlongM: Number(o.getAttribute('distanceAlong') ?? 0),
      widthM: Number(o.getAttribute('width') ?? 0.8),
      type: (o.getAttribute('type') as 'door' | 'window') ?? 'door',
      orientation: (o.getAttribute('orientation') as 'left' | 'right' | 'in' | 'out') ?? 'left'
    }))
  };
  const errors = validateProject(project);
  return { project: errors.length ? undefined : project, errors };
};
