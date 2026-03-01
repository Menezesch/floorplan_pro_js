import type { Vec2 } from '../model/types';

export const SVG_UNITS_PER_METER = 100;

export const metersToSvg = (m: number): number => m * SVG_UNITS_PER_METER;
export const svgToMeters = (u: number): number => u / SVG_UNITS_PER_METER;

export const worldToSvg = (p: Vec2): Vec2 => ({ x: metersToSvg(p.x), y: metersToSvg(p.y) });
export const svgToWorld = (p: Vec2): Vec2 => ({ x: svgToMeters(p.x), y: svgToMeters(p.y) });
