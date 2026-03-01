import { metersToSvg } from '../geometry/units';

interface Props {
  widthM: number;
  heightM: number;
  gridM: number;
}

const Grid = ({ widthM, heightM, gridM }: Props) => {
  const step = metersToSvg(gridM);
  const majorStep = metersToSvg(1);
  const width = metersToSvg(widthM);
  const height = metersToSvg(heightM);
  const lines = [];

  for (let x = -width; x <= width * 2; x += step) {
    const major = Math.abs(x % majorStep) < 1;
    lines.push(
      <line
        key={`x-${x}`}
        x1={x}
        y1={-height}
        x2={x}
        y2={height * 2}
        stroke={major ? '#d5deea' : '#edf2f7'}
        strokeWidth={major ? 1.2 : 1}
      />
    );
  }
  for (let y = -height; y <= height * 2; y += step) {
    const major = Math.abs(y % majorStep) < 1;
    lines.push(
      <line
        key={`y-${y}`}
        x1={-width}
        y1={y}
        x2={width * 2}
        y2={y}
        stroke={major ? '#d5deea' : '#edf2f7'}
        strokeWidth={major ? 1.2 : 1}
      />
    );
  }

  return <g>{lines}</g>;
};

export default Grid;
