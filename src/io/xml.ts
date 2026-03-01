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

const escapeXmlAttr = (value: string): string =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

const rectFromBoundary = (boundary: Vec2[]) => {
  const xs = boundary.map((p) => p.x);
  const ys = boundary.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return { origin: { x: minX, y: minY }, widthM: maxX - minX, heightM: maxY - minY };
};

export const exportProjectXml = (project: Project): string => `<?xml version="1.0" encoding="UTF-8"?>
<project version="1.0" units="m">
  <meta name="${escapeXmlAttr(project.meta.name)}" created="${escapeXmlAttr(project.meta.created)}" modified="${escapeXmlAttr(project.meta.modified)}" grid="${fmt(project.meta.gridM)}" />
  <walls>
${project.walls
  .map(
    (w) => `    <wall id="${escapeXmlAttr(w.id)}" thickness="${fmt(w.thicknessM)}" roomsLeft="${escapeXmlAttr(w.roomsLeft.join(','))}" roomsRight="${escapeXmlAttr(w.roomsRight.join(','))}"><centerline>${ptsToText(w.points)}</centerline></wall>`
  )
  .join('\n')}
  </walls>
  <rooms>
${project.rooms
  .map((r) => {
    const rect = r.origin && Number.isFinite(r.widthM) && Number.isFinite(r.heightM) ? { origin: r.origin, widthM: r.widthM ?? 0, heightM: r.heightM ?? 0 } : rectFromBoundary(r.boundary);
    return `    <room id="${escapeXmlAttr(r.id)}" name="${escapeXmlAttr(r.name)}" classification="${escapeXmlAttr(r.classification ?? 'internal')}" originX="${fmt(rect.origin.x)}" originY="${fmt(rect.origin.y)}" widthM="${fmt(rect.widthM)}" heightM="${fmt(rect.heightM)}"><boundary>${ptsToText(r.boundary)}</boundary></room>`;
  })
  .join('\n')}
  </rooms>
  <obstacles>
${project.obstacles
  .map((o) => {
    const rect = o.origin && Number.isFinite(o.widthM) && Number.isFinite(o.heightM) ? { origin: o.origin, widthM: o.widthM ?? 0, heightM: o.heightM ?? 0 } : rectFromBoundary(o.polygon);
    return `    <obstacle id="${escapeXmlAttr(o.id)}" type="${escapeXmlAttr(o.type)}" originX="${fmt(rect.origin.x)}" originY="${fmt(rect.origin.y)}" widthM="${fmt(rect.widthM)}" heightM="${fmt(rect.heightM)}"><polygon>${ptsToText(o.polygon)}</polygon></obstacle>`;
  })
  .join('\n')}
  </obstacles>
  <openings>
${project.openings
  .map(
    (o) => `    <opening id="${escapeXmlAttr(o.id)}" wallId="${escapeXmlAttr(o.wallId)}" distanceAlongM="${fmt(o.distanceAlongM)}" widthM="${fmt(o.widthM)}" type="${escapeXmlAttr(o.type)}" orientation="${escapeXmlAttr(o.orientation)}"/>`
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
      thicknessM: Number(wall.getAttribute('thickness') ?? 0.15),
      points: textToPts(wall.querySelector('centerline')?.textContent ?? ''),
      polygon: [],
      roomsLeft: (wall.getAttribute('roomsLeft') ?? '').split(',').filter(Boolean),
      roomsRight: (wall.getAttribute('roomsRight') ?? '').split(',').filter(Boolean)
    })),
    rooms: Array.from(doc.querySelectorAll('rooms room')).map((room) => {
      const boundary = textToPts(room.querySelector('boundary')?.textContent ?? '');
      const fallbackRect = rectFromBoundary(boundary);
      return {
        id: room.getAttribute('id') ?? crypto.randomUUID(),
        name: room.getAttribute('name') ?? 'Room',
        classification: (room.getAttribute('classification') as 'internal' | 'external') ?? 'internal',
        origin: {
          x: Number(room.getAttribute('originX') ?? fallbackRect.origin.x),
          y: Number(room.getAttribute('originY') ?? fallbackRect.origin.y)
        },
        widthM: Number(room.getAttribute('widthM') ?? fallbackRect.widthM),
        heightM: Number(room.getAttribute('heightM') ?? fallbackRect.heightM),
        boundary,
        wallIds: [],
        areaM2: 0,
        perimeterM: 0
      };
    }),
    obstacles: Array.from(doc.querySelectorAll('obstacles obstacle')).map((o) => {
      const polygon = textToPts(o.querySelector('polygon')?.textContent ?? '');
      const fallbackRect = rectFromBoundary(polygon);
      return {
        id: o.getAttribute('id') ?? crypto.randomUUID(),
        type: 'no_go' as const,
        origin: {
          x: Number(o.getAttribute('originX') ?? fallbackRect.origin.x),
          y: Number(o.getAttribute('originY') ?? fallbackRect.origin.y)
        },
        widthM: Number(o.getAttribute('widthM') ?? fallbackRect.widthM),
        heightM: Number(o.getAttribute('heightM') ?? fallbackRect.heightM),
        polygon
      };
    }),
    openings: Array.from(doc.querySelectorAll('openings opening')).map((o) => ({
      id: o.getAttribute('id') ?? crypto.randomUUID(),
      wallId: o.getAttribute('wallId') ?? '',
      distanceAlongM: Number(o.getAttribute('distanceAlongM') ?? o.getAttribute('distanceAlong') ?? 0),
      widthM: Number(o.getAttribute('widthM') ?? o.getAttribute('width') ?? 0.9),
      type: (o.getAttribute('type') as 'door' | 'window') ?? 'door',
      orientation: (o.getAttribute('orientation') as 'left' | 'right' | 'in' | 'out') ?? 'left'
    }))
  };
  const errors = validateProject(project);
  return { project: errors.length ? undefined : project, errors };
};
