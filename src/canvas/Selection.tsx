import type { ID } from '../model/types';

interface Props {
  selectedId?: ID;
}

const Selection = ({ selectedId }: Props) =>
  selectedId ? <div className="text-xs text-blue-700">Selected: {selectedId}</div> : null;

export default Selection;
