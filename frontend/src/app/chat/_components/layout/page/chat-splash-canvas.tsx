// CRITICAL
"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/store";
import type { SplashFiber } from "./chat-splash-canvas/splash-geometry";
import { CYCLE_MS, buildFibers, buildGeometry } from "./chat-splash-canvas/splash-geometry";
import { drawCenterDisc, drawPaper, drawRings } from "./chat-splash-canvas/splash-draw";

export function ChatSplashCanvas({ active }: { active: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const isMobile = useAppStore((state) => state.splashIsMobile);
  const setIsMobile = useAppStore((state) => state.setSplashIsMobile);

  useEffect(() => {
    // Check if mobile on mount and resize
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [setIsMobile]);

  useEffect(() => {
    // Skip canvas animation on mobile
    if (isMobile) return;

    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrame: number | null = null;
    const startTime = performance.now();
    let canvasScale = 1;
    let fibers: SplashFiber[] = [];
    let geometry = buildGeometry(1, 1);
    let lastWidth = 0;
    let lastHeight = 0;
    let lastScale = 1;

    const resize = () => {
      const MAX_CANVAS_SIZE = 4096; // Safe limit for most devices
      const width = Math.max(wrapper.clientWidth, 1);
      const height = Math.max(wrapper.clientHeight, 1);
      const nextScale = Math.min(window.devicePixelRatio || 1, 2);

      // Cap canvas size to prevent exceeding browser limits
      const scaledWidth = width * nextScale;
      const scaledHeight = height * nextScale;
      const effectiveScale = Math.min(
        nextScale,
        MAX_CANVAS_SIZE / width,
        MAX_CANVAS_SIZE / height
      );

      if (width === lastWidth && height === lastHeight && Math.abs(effectiveScale - lastScale) < 0.01) {
        return;
      }

      lastWidth = width;
      lastHeight = height;
      lastScale = effectiveScale;
      canvasScale = effectiveScale;

      const finalWidth = Math.min(scaledWidth, MAX_CANVAS_SIZE);
      const finalHeight = Math.min(scaledHeight, MAX_CANVAS_SIZE);

      canvas.width = finalWidth;
      canvas.height = finalHeight;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
      fibers = buildFibers(width, height);
      geometry = buildGeometry(width, height);
    };

    resize();
    if (!geometry.rings.length) return;

    const animate = (time: number) => {
      const width = canvas.width / canvasScale;
      const height = canvas.height / canvasScale;
      const cycleProgress = ((time - startTime) % CYCLE_MS) / CYCLE_MS;
      drawPaper(ctx, width, height, fibers);
      if (geometry) {
        drawRings(ctx, geometry, cycleProgress);
        drawCenterDisc(ctx, width / 2, height / 2, geometry.clearRadius);
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    const observer = new ResizeObserver(() => resize());
    observer.observe(wrapper);
    window.addEventListener("resize", resize);
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", resize);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, [isMobile]);

  // No splash on mobile
  if (isMobile) {
    return null;
  }

  return (
    <div
      ref={wrapperRef}
      className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsla(30,8%,10%,0.92),hsla(30,8%,10%,0.7)_35%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsla(30,5%,10.5%,0.28)]" />
    </div>
  );
}
