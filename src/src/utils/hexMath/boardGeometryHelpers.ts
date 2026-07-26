import { cubeToPixel } from './cubeToPixel';

export const getEdgeVertices = (eId: string): [string, string] => {
  const withoutPrefix = eId.replace('e_', '');
  const parts = withoutPrefix.split('_v_');
  const v1 = parts[0];
  const v2 = 'v_' + parts[1];
  return [v1, v2];
};

export const getTileVertexIds = (t: any): string[] => {
  const HEX_SIZE = 60;
  const center = cubeToPixel(t.coord, HEX_SIZE);
  const vertexIdsInHex: string[] = [];
  for (let i = 0; i < 6; i++) {
    const angleRad = (Math.PI / 180) * (60 * i - 30);
    const x = center.x + HEX_SIZE * Math.cos(angleRad);
    const y = center.y + HEX_SIZE * Math.sin(angleRad);
    const roundedX = Math.round(x * 10) / 10;
    const roundedY = Math.round(y * 10) / 10;
    vertexIdsInHex.push(`v_${roundedX}_${roundedY}`);
  }
  return vertexIdsInHex;
};
