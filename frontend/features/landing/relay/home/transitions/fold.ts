
const smooth = (t: number) => t * t * (3 - 2 * t);

export const TILE_ROUND = 24 / 76;

export type FoldBox = {
  top: number;
  right: number;
  bottom: number;
  left: number;
  round: number;
};

export const foldBox = (
  g: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  tile: number,
  plateRound: number,
  curve: (t: number) => number = smooth,
): FoldBox => {
  const side0 = Math.max(tile, 2 * Math.min(cx, w - cx, cy, h - cy));
  if (g < 0.5) {
    const t = curve(Math.max(g, 0) / 0.5);
    const half = (tile + (side0 - tile) * t) / 2;
    return {
      top: cy - half,
      left: cx - half,
      bottom: h - (cy + half),
      right: w - (cx + half),
      round: half * 2 * TILE_ROUND,
    };
  }
  const t = curve(Math.min(g, 1) * 2 - 1);
  const half = side0 / 2;
  return {
    top: (cy - half) * (1 - t),
    right: (w - (cx + half)) * (1 - t),
    bottom: (h - (cy + half)) * (1 - t),
    left: (cx - half) * (1 - t),
    round: side0 * TILE_ROUND * (1 - t) + plateRound * t,
  };
};

export const fold = (
  g: number,
  w: number,
  h: number,
  cx: number,
  cy: number,
  tile: number,
  plateRound: number,
  curve?: (t: number) => number,
) => {
  if (g <= 0) return "inset(50%)";
  const { top, right, bottom, left, round } = foldBox(
    g,
    w,
    h,
    cx,
    cy,
    tile,
    plateRound,
    curve,
  );
  return `inset(${top}px ${right}px ${bottom}px ${left}px round ${round}px)`;
};
