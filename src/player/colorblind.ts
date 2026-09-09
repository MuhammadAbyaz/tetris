export function hexToRgb(hex: string): [number, number, number] {
  const value = hex.replace('#', '').trim();
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function simulateCvd(
  rgb: [number, number, number],
  matrix: readonly (readonly [number, number, number])[],
): [number, number, number] {
  return [
    clampByte(matrix[0]![0] * rgb[0] + matrix[0]![1] * rgb[1] + matrix[0]![2] * rgb[2]),
    clampByte(matrix[1]![0] * rgb[0] + matrix[1]![1] * rgb[1] + matrix[1]![2] * rgb[2]),
    clampByte(matrix[2]![0] * rgb[0] + matrix[2]![1] * rgb[1] + matrix[2]![2] * rgb[2]),
  ];
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, value));
}

function distance(a: [number, number, number], b: [number, number, number]): number {
  return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
}

/** Machado-style protanopia / deuteranopia approximations. */
const PROTANOPIA = [
  [0.56667, 0.43333, 0],
  [0.55833, 0.44167, 0],
  [0, 0.24167, 0.75833],
] as const;

const DEUTERANOPIA = [
  [0.625, 0.375, 0],
  [0.7, 0.3, 0],
  [0, 0.3, 0.7],
] as const;

const MIN_CVD_DISTANCE = 28;

export function isColorblindSafePalette(colors: Record<string, string>): boolean {
  const entries = Object.values(colors).map((hex) => ({
    hex: hex.toLowerCase(),
    rgb: hexToRgb(hex),
  }));
  if (entries.some((entry) => Number.isNaN(entry.rgb[0]))) return false;
  const unique = new Set(entries.map((entry) => entry.hex));
  if (unique.size !== entries.length) return false;

  for (let i = 0; i < entries.length; i += 1) {
    for (let j = i + 1; j < entries.length; j += 1) {
      const a = entries[i]!.rgb;
      const b = entries[j]!.rgb;
      const deut = distance(simulateCvd(a, DEUTERANOPIA), simulateCvd(b, DEUTERANOPIA));
      const prot = distance(simulateCvd(a, PROTANOPIA), simulateCvd(b, PROTANOPIA));
      if (Math.min(deut, prot) < MIN_CVD_DISTANCE) return false;
    }
  }
  return true;
}
