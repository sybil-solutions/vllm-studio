// CRITICAL
export type SplashFiber = {
  x: number;
  y: number;
  length: number;
  angle: number;
  alpha: number;
};

export type SplashPoint = {
  x: number;
  y: number;
  ringIndex: number;
  pointIndex: number;
  angle: number;
  baseAngle: number;
  radius: number;
};

export type SplashLine = {
  from: SplashPoint;
  to: SplashPoint;
  ringIndex: number;
};

export type SplashGeometry = {
  rings: SplashPoint[][];
  radialLines: SplashLine[];
  connections: SplashLine[];
  ringCount: number;
  clearRadius: number;
};

export const splashPalette = {
  base: "hsl(30, 5%, 10.5%)",
  ink: "hsla(268, 55%, 68%, 0.85)",
  inkFaint: "hsla(270, 35%, 58%, 0.3)",
  glow: "hsla(268, 60%, 62%, 0.55)",
  warmPulse: "hsla(275, 65%, 70%, 0.9)",
  highlight: "hsla(268, 70%, 75%, 0.8)",
  highlightBright: "hsla(265, 75%, 82%, 0.95)",
  highlightSubtle: "hsla(270, 50%, 62%, 0.4)",
};

export const CYCLE_MS = 6500;

export const envelopeValue = (value: number) => Math.sin(value * Math.PI);

const getClearRadius = (width: number, height: number) => {
  if (width < 640) return width * 0.26;
  return Math.min(width, height) * 0.1;
};

export const buildFibers = (width: number, height: number): SplashFiber[] => {
  const fiberCount = Math.round(Math.min(width, height) / 60);
  const fibers: SplashFiber[] = [];
  for (let i = 0; i < fiberCount; i++) {
    fibers.push({
      x: Math.random() * width,
      y: Math.random() * height,
      length: 0.08 * width + Math.random() * 0.16 * width,
      angle: -0.35 + Math.random() * 0.7,
      alpha: 0.02 + Math.random() * 0.04,
    });
  }
  return fibers;
};

export const buildGeometry = (width: number, height: number): SplashGeometry => {
  const centerX = width / 2;
  const centerY = height / 2;
  const clearRadius = getClearRadius(width, height);
  const diagonal = Math.sqrt(centerX * centerX + centerY * centerY);
  const ringCount = 16;
  const minRadius = clearRadius * 2.5;
  const maxRadius = diagonal * 1.15;
  const swirl = 0.75;
  const rings: SplashPoint[][] = [];
  const radialLines: SplashLine[] = [];
  const connections: SplashLine[] = [];

  for (let ringIndex = 0; ringIndex < ringCount; ringIndex++) {
    const ringPosition = ringIndex / (ringCount - 1);
    const ringRadius = minRadius + (maxRadius - minRadius) * ringPosition;
    const pointsInRing = Math.floor(8 + ringIndex * 5);
    const ringRotation = (ringIndex % 2) * (Math.PI / pointsInRing) * 0.5;
    const ringPoints: SplashPoint[] = [];

    for (let pointIndex = 0; pointIndex < pointsInRing; pointIndex++) {
      const baseAngle = (pointIndex / pointsInRing) * Math.PI * 2 + ringRotation;
      const wobble = Math.sin(baseAngle * 3 + ringIndex * 1.2) * swirl * 8;
      const angle = baseAngle + Math.sin(ringRadius * 0.015 + ringIndex) * swirl * 0.2;
      const positionX = centerX + Math.cos(angle) * (ringRadius + wobble);
      const positionY = centerY + Math.sin(angle) * (ringRadius + wobble);

      ringPoints.push({
        x: positionX,
        y: positionY,
        ringIndex,
        pointIndex,
        angle,
        baseAngle,
        radius: ringRadius,
      });
    }
    rings.push(ringPoints);
  }

  for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex++) {
    const innerRing = rings[ringIndex];
    const outerRing = rings[ringIndex + 1];

    innerRing.forEach((innerPoint) => {
      const distances = outerRing.map((outerPoint, outerIndex) => ({
        point: outerPoint,
        index: outerIndex,
        distance: Math.sqrt((outerPoint.x - innerPoint.x) ** 2 + (outerPoint.y - innerPoint.y) ** 2),
      }));
      distances.sort((a, b) => a.distance - b.distance);
      if (!distances[0]) return;
      radialLines.push({ from: innerPoint, to: distances[0].point, ringIndex });
      if (distances[1] && distances[1].distance < distances[0].distance * 1.8) {
        radialLines.push({ from: innerPoint, to: distances[1].point, ringIndex });
      }
    });
  }

  rings.forEach((ringPoints, ringIndex) => {
    ringPoints.forEach((point, pointIndex) => {
      const nextPoint = ringPoints[(pointIndex + 1) % ringPoints.length];
      connections.push({ from: point, to: nextPoint, ringIndex });
    });
  });

  return { rings, radialLines, connections, ringCount, clearRadius };
};
