export type SpringValues = Record<string, string | number>;

export const lerp = (start: number, end: number, t: number): number => {
  return start * (1 - t) + end * t;
};

export const interpolate = (
  start: SpringValues,
  end: SpringValues,
  progress: number,
): SpringValues => {
  const result: SpringValues = {};

  const extractNumber = (
    value: unknown,
  ): { number: number; unit: string | null } => {
    if (typeof value === "number") return { number: value, unit: null };
    if (typeof value === "string") {
      const functionMatch = value.match(/^([a-zA-Z]+)\(([-0-9.]+)([^)]*)\)$/);
      if (functionMatch) {
        return {
          number: parseFloat(functionMatch[2]),
          unit: `${functionMatch[1]}(${functionMatch[3]})`,
        };
      }
      const match = value.match(/([-0-9.]+)([^0-9.]+)/);
      if (match) {
        return {
          number: parseFloat(match[1]),
          unit: match[2],
        };
      }
    }
    return { number: 0, unit: null };
  };

  for (const key in start) {
    const startVal = extractNumber(start[key]);
    const endVal = extractNumber(end[key]);

    if (startVal.unit !== null || endVal.unit !== null) {
      const unit = startVal.unit || endVal.unit;
      if (unit?.includes("(")) {
        result[key] =
          `${unit.split("(")[0]}(${lerp(startVal.number, endVal.number, progress)}${unit.split(")")[0].slice(unit.split("(")[0].length)})`;
      } else {
        result[key] =
          `${lerp(startVal.number, endVal.number, progress)}${unit}`;
      }
    } else {
      result[key] = lerp(startVal.number, endVal.number, progress);
    }
  }

  return result;
};
