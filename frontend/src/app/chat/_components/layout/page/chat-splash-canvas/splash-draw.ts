// CRITICAL
import type { SplashFiber, SplashGeometry } from "./splash-geometry";
import { envelopeValue, splashPalette } from "./splash-geometry";

export const drawPaper = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fibers: SplashFiber[],
) => {
  ctx.fillStyle = splashPalette.base;
  ctx.fillRect(0, 0, width, height);
  ctx.save();
  ctx.strokeStyle = splashPalette.inkFaint;
  fibers.forEach((fiber) => {
    ctx.globalAlpha = fiber.alpha;
    ctx.lineWidth = 0.6;
    ctx.beginPath();
    ctx.moveTo(fiber.x, fiber.y);
    ctx.lineTo(
      fiber.x + Math.cos(fiber.angle) * fiber.length,
      fiber.y + Math.sin(fiber.angle) * fiber.length,
    );
    ctx.stroke();
  });
  ctx.restore();
};

export const drawCenterDisc = (
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number,
) => {
  ctx.save();
  const glowGradient = ctx.createRadialGradient(
    centerX,
    centerY,
    radius * 0.8,
    centerX,
    centerY,
    radius * 1.8,
  );
  glowGradient.addColorStop(0, "hsla(270, 40%, 50%, 0.15)");
  glowGradient.addColorStop(0.5, "hsla(270, 30%, 40%, 0.08)");
  glowGradient.addColorStop(1, "transparent");
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.1);
  gradient.addColorStop(0, "hsl(30, 5%, 10.5%)");
  gradient.addColorStop(0.7, "hsl(30, 5%, 10.5%)");
  gradient.addColorStop(1, "hsla(30, 5%, 10.5%, 0.95)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = "hsla(270, 50%, 70%, 0.4)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
};

export const drawRings = (ctx: CanvasRenderingContext2D, geometry: SplashGeometry, timeValue: number) => {
  const ringCount = geometry.rings.length || geometry.ringCount;
  if (!ringCount) return;

  const alphaValue = envelopeValue(timeValue);
  const baseAlpha = alphaValue * 0.5 + 0.35;
  const wavePrimary = timeValue * Math.PI * 2 * 4;
  const waveSecondary = timeValue * Math.PI * 2 * 6;
  const waveTertiary = timeValue * Math.PI * 2 * 0.7;

  const getEdgeAlpha = (ringIndex: number) => {
    const edgeFactor = ringIndex / ringCount;
    const curved = edgeFactor * edgeFactor * edgeFactor;
    return 0.02 + curved * 1.3;
  };

  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Ring outlines
  geometry.rings.forEach((ringPoints, ringIndex) => {
    const edgeAlpha = getEdgeAlpha(ringIndex);
    const glowIntensity = Math.sin(wavePrimary - ringIndex * 0.6) * 0.3 + 0.6;
    ctx.globalAlpha = baseAlpha * 0.25 * glowIntensity * edgeAlpha;
    ctx.strokeStyle = splashPalette.highlightSubtle;
    ctx.lineWidth = 5 + edgeAlpha * 3;
    ctx.beginPath();
    ringPoints.forEach((point, pointIndex) => {
      if (pointIndex === 0) ctx.moveTo(point.x, point.y);
      else ctx.lineTo(point.x, point.y);
    });
    ctx.closePath();
    ctx.stroke();
  });

  // Radial lines
  geometry.radialLines.forEach((line) => {
    const edgeAlpha = getEdgeAlpha(line.ringIndex);
    const pulsePosition = (wavePrimary / (Math.PI * 2) + line.from.baseAngle / (Math.PI * 2)) % 1;
    const pulseIntensity = Math.sin(pulsePosition * Math.PI * 2) * 0.5 + 0.5;

    ctx.globalAlpha = baseAlpha * 0.35 * pulseIntensity * edgeAlpha;
    ctx.strokeStyle = splashPalette.glow;
    ctx.lineWidth = 1.5 + edgeAlpha;
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y);
    ctx.lineTo(line.to.x, line.to.y);
    ctx.stroke();

    ctx.globalAlpha = baseAlpha * (0.45 + pulseIntensity * 0.35) * edgeAlpha;
    ctx.strokeStyle = splashPalette.ink;
    ctx.lineWidth = 0.8 + pulseIntensity * 0.5 + edgeAlpha * 0.3;
    ctx.beginPath();
    ctx.moveTo(line.from.x, line.from.y);
    ctx.lineTo(line.to.x, line.to.y);
    ctx.stroke();
  });

  // Connections
  geometry.connections.forEach((connection) => {
    const edgeAlpha = getEdgeAlpha(connection.ringIndex);
    const waveValue =
      Math.sin(wavePrimary - connection.ringIndex * 0.7) * 0.5 +
      Math.sin(waveSecondary - connection.ringIndex * 1.1 + connection.from.pointIndex * 0.4) * 0.3;
    const intensity = (waveValue + 0.8) / 1.6;

    ctx.globalAlpha = baseAlpha * 0.4 * intensity * edgeAlpha;
    ctx.strokeStyle = splashPalette.glow;
    ctx.lineWidth = 1.5 + intensity * 1.2 + edgeAlpha;
    ctx.beginPath();
    ctx.moveTo(connection.from.x, connection.from.y);
    ctx.lineTo(connection.to.x, connection.to.y);
    ctx.stroke();

    ctx.globalAlpha = baseAlpha * (0.5 + intensity * 0.35) * edgeAlpha;
    ctx.strokeStyle = splashPalette.ink;
    ctx.lineWidth = 0.7 + intensity * 0.5 + edgeAlpha * 0.3;
    ctx.beginPath();
    ctx.moveTo(connection.from.x, connection.from.y);
    ctx.lineTo(connection.to.x, connection.to.y);
    ctx.stroke();
  });

  // Nodes
  geometry.rings.forEach((ringPoints, ringIndex) => {
    const edgeAlpha = getEdgeAlpha(ringIndex);
    ringPoints.forEach((point, pointIndex) => {
      const nodePulse =
        Math.sin(wavePrimary - ringIndex * 0.5 + pointIndex * 0.4) * 0.5 +
        Math.sin(waveSecondary - ringIndex * 0.8 + pointIndex * 0.6) * 0.3;
      const intensity = (nodePulse + 0.8) / 1.6;
      const nodeSize = 1.2 + intensity * 1.8 + edgeAlpha * 0.5;

      ctx.globalAlpha = baseAlpha * 0.45 * intensity * edgeAlpha;
      ctx.fillStyle = splashPalette.glow;
      ctx.beginPath();
      ctx.arc(point.x, point.y, nodeSize + 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = baseAlpha * (0.55 + intensity * 0.35) * edgeAlpha;
      ctx.fillStyle = splashPalette.ink;
      ctx.beginPath();
      ctx.arc(point.x, point.y, nodeSize, 0, Math.PI * 2);
      ctx.fill();

      if (intensity > 0.6 && edgeAlpha > 0.3) {
        ctx.globalAlpha = baseAlpha * 0.7 * ((intensity - 0.6) / 0.4) * edgeAlpha;
        ctx.fillStyle = splashPalette.highlightBright;
        ctx.beginPath();
        ctx.arc(point.x, point.y, nodeSize * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
    });
  });

  // Traveling particles
  const particleCount = 12;
  for (let i = 0; i < particleCount; i++) {
    const particleProgress = (timeValue * 0.6 + i / particleCount) % 1;
    const particleRingIndex = Math.floor(ringCount * 0.4 + particleProgress * ringCount * 0.55);
    const ringPoints = geometry.rings[particleRingIndex];
    if (!ringPoints || ringPoints.length === 0) continue;

    const particleAngle = (waveTertiary + (i * Math.PI * 2) / particleCount) % (Math.PI * 2);
    const nearestPoint = ringPoints.reduce(
      (best, point) => {
        const diff = Math.abs(point.angle - particleAngle);
        return diff < best.diff ? { point, diff } : best;
      },
      { diff: Infinity, point: ringPoints[0] },
    );

    if (nearestPoint.point) {
      const particleEdgeAlpha = getEdgeAlpha(particleRingIndex);
      ctx.globalAlpha = baseAlpha * 0.6 * envelopeValue(particleProgress) * particleEdgeAlpha;
      ctx.fillStyle = splashPalette.warmPulse;
      ctx.beginPath();
      ctx.arc(nearestPoint.point.x, nearestPoint.point.y, 2.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.globalAlpha = baseAlpha * 0.8 * envelopeValue(particleProgress) * particleEdgeAlpha;
      ctx.fillStyle = splashPalette.highlightBright;
      ctx.beginPath();
      ctx.arc(nearestPoint.point.x, nearestPoint.point.y, 1.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
};

