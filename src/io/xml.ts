import type { Opening, Project, RectangleRoom, Vec2, WallSegment } from '../model/types';
import { validateProject } from '../model/validators';

const fmt = (n: number): string => Number(n.toFixed(3)).toString();
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

const wallXml = (wall: WallSegment): string =>
  `    <wall id="${wall.id}" thickness="${fmt(wall.thicknessM)}"><p1 x="${fmt(wall.p1.x)}" y="${fmt(wall.p1.y)}"/><p2 x="${fmt(wall.p2.x)}" y="${fmt(wall.p2.y)}"/></wall>`;

const roomXml = (room: RectangleRoom): string =>
  `    <room id="${room.id}" name="${room.name}" class="${room.classification}" x="${fmt(room.origin.x)}" y="${fmt(room.origin.y)}" width="${fmt(room.widthM)}" height="${fmt(room.heightM)}"/>`;

const openingXml = (opening: Opening): string =>
  `    <opening id="${opening.id}" wallId="${opening.wallId}" offsetAlongWall="${fmt(opening.offsetAlongWallM)}" width="${fmt(opening.widthM)}" type="${opening.type}"/>`;

export const exportProjectXml = (project: Project): string => `<?xml version="1.0" encoding="UTF-8"?>
<project version="1.1" units="m">
  <meta name="${project.meta.name}" created="${project.meta.created}" modified="${project.meta.modified}" />
  <settings defaultWallThickness="${fmt(project.settings.defaultWallThicknessM)}" defaultCeilingHeight="${fmt(project.settings.defaultCeilingHeightM)}" gridSize="${fmt(project.settings.gridSizeM)}" snapThresholdPx="${project.settings.snapThresholdPx}" planOriginX="${fmt(project.settings.planOrigin.x)}" planOriginY="${fmt(project.settings.planOrigin.y)}"/>
  <walls>
${project.walls.map(wallXml).join('\n')}
  </walls>
  <rooms>
${project.rooms.map(roomXml).join('\n')}
  </rooms>
  <obstacles>
${project.obstacles.map((obs) => `    <obstacle id="${obs.id}" type="${obs.type}"><polygon>${ptsToText(obs.polygon)}</polygon></obstacle>`).join('\n')}
  </obstacles>
  <openings>
${project.openings.map(openingXml).join('\n')}
  </openings>
</project>`;

export const importProjectXml = (xmlText: string): { project?: Project; errors: string[] } => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  if (doc.querySelector('parsererror')) return { errors: ['Invalid XML file.'] };

  const meta = doc.querySelector('meta');
  const settings = doc.querySelector('settings');
  if (!meta || !settings) return { errors: ['Missing required meta/settings nodes.'] };

  const project: Project = {
    version: '1.1',
    units: 'm',
    meta: {
      name: meta.getAttribute('name') ?? 'Imported project',
      created: meta.getAttribute('created') ?? new Date().toISOString(),
      modified: meta.getAttribute('modified') ?? new Date().toISOString()
    },
    settings: {
      defaultWallThicknessM: Number(settings.getAttribute('defaultWallThickness') ?? 0.15),
      defaultCeilingHeightM: Number(settings.getAttribute('defaultCeilingHeight') ?? 2.5),
      gridSizeM: Number(settings.getAttribute('gridSize') ?? 0.05),
      snapThresholdPx: Number(settings.getAttribute('snapThresholdPx') ?? 10),
      planOrigin: {
        x: Number(settings.getAttribute('planOriginX') ?? 0),
        y: Number(settings.getAttribute('planOriginY') ?? 0)
      }
    },
    walls: Array.from(doc.querySelectorAll('walls wall')).map((wall) => ({
      id: wall.getAttribute('id') ?? crypto.randomUUID(),
      thicknessM: Number(wall.getAttribute('thickness') ?? 0.15),
      p1: {
        x: Number(wall.querySelector('p1')?.getAttribute('x') ?? 0),
        y: Number(wall.querySelector('p1')?.getAttribute('y') ?? 0)
      },
      p2: {
        x: Number(wall.querySelector('p2')?.getAttribute('x') ?? 0),
        y: Number(wall.querySelector('p2')?.getAttribute('y') ?? 0)
      }
    })),
    rooms: Array.from(doc.querySelectorAll('rooms room')).map((room) => ({
      id: room.getAttribute('id') ?? crypto.randomUUID(),
      name: room.getAttribute('name') ?? 'Room',
      classification: (room.getAttribute('class') as 'internal' | 'external') ?? 'internal',
      origin: {
        x: Number(room.getAttribute('x') ?? 0),
        y: Number(room.getAttribute('y') ?? 0)
      },
      widthM: Number(room.getAttribute('width') ?? 1),
      heightM: Number(room.getAttribute('height') ?? 1)
    })),
    obstacles: Array.from(doc.querySelectorAll('obstacles obstacle')).map((obstacle) => ({
      id: obstacle.getAttribute('id') ?? crypto.randomUUID(),
      type: 'no_go' as const,
      polygon: textToPts(obstacle.querySelector('polygon')?.textContent ?? '')
    })),
    openings: Array.from(doc.querySelectorAll('openings opening')).map((opening) => ({
      id: opening.getAttribute('id') ?? crypto.randomUUID(),
      wallId: opening.getAttribute('wallId') ?? '',
      offsetAlongWallM: Number(opening.getAttribute('offsetAlongWall') ?? 0),
      widthM: Number(opening.getAttribute('width') ?? 1),
      type: (opening.getAttribute('type') as 'window' | 'door') ?? 'window'
    }))
  };

  const errors = validateProject(project);
  return { project: errors.length ? undefined : project, errors };
};
