'use client';

import { useEffect, useRef, useMemo, useCallback, Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Sparkles, Copy, Check, GitBranch, X, BarChart3, MoreHorizontal,
  PanelRightOpen, Bookmark, BookmarkCheck,
} from 'lucide-react';
import { shallow } from 'zustand/shallow';
import { api } from '@/lib/api';
import { useAppStore, type ChatMessage } from '@/store';
import type { ToolCall, ToolResult, Artifact, StoredMessage, StoredToolCall, ChatSessionDetail } from '@/lib/types';
import {
 ToolBelt, MCPSettingsModal, ChatSettingsModal, extractArtifacts, splitThinking,
} from '@/components/chat';
import { ResearchProgressIndicator, CitationsPanel } from '@/components/chat/research-progress';
import { MessageSearch } from '@/components/chat/message-search';
import type { Attachment } from '@/components/chat';
import { debouncedSave } from '@/lib/chat-state-persistence';
import { useContextManager } from '@/hooks/useContextManager';
import { ContextIndicator } from '@/components/chat/context-indicator';

// Local components, hooks and utils
import { UsageModal, ExportModal, ChatMessageList, ChatSidePanel } from './components';
import { stripThinkingForModelContext, parseSSEEvents, downloadTextFile } from './utils';

// Types
type Message = ChatMessage;


type OpenAIContentPart = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };
type OpenAIToolCall = { id: string; type: 'function'; function: { name: string; arguments: string } };
type OpenAIMessage =
  | { role: 'user' | 'assistant' | 'system'; content: string | null | OpenAIContentPart[]; tool_calls?: OpenAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; name?: string; content: string };

type SplashPoint = {
  x: number;
  y: number;
  ringIndex: number;
  pointIndex: number;
  angle: number;
  baseAngle: number;
  radius: number;
};

type SplashLine = {
  from: SplashPoint;
  to: SplashPoint;
  ringIndex: number;
};

type SplashFiber = {
  x: number;
  y: number;
  length: number;
  angle: number;
  alpha: number;
};

type SplashGeometry = {
  rings: SplashPoint[][];
  radialLines: SplashLine[];
  connections: SplashLine[];
  ringCount: number;
  clearRadius: number;
};

const splashPalette = {
  base: 'hsl(30, 5%, 10.5%)',
  center: 'hsl(30, 5%, 10.5%)',
  ink: 'hsla(268, 55%, 68%, 0.85)',
  inkBright: 'hsla(268, 65%, 75%, 0.95)',
  inkFaint: 'hsla(270, 35%, 58%, 0.3)',
  glow: 'hsla(268, 60%, 62%, 0.55)',
  warmPulse: 'hsla(275, 65%, 70%, 0.9)',
  highlight: 'hsla(268, 70%, 75%, 0.8)',
  highlightBright: 'hsla(265, 75%, 82%, 0.95)',
  highlightSubtle: 'hsla(270, 50%, 62%, 0.4)',
};

const clampValue = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const envelopeValue = (value: number) => Math.sin(value * Math.PI);
const triangleValue = (value: number) => 1 - Math.abs(2 * value - 1);
const splashCycleMs = 6500;

const getSplashClearRadius = (width: number, height: number) => {
  if (width < 640) return width * 0.26;
  return Math.min(width, height) * 0.1;
};

const buildSplashFibers = (width: number, height: number): SplashFiber[] => {
  const fiberCount = Math.round(Math.min(width, height) / 60);
  const fibers: SplashFiber[] = [];
  for (let fiberIndex = 0; fiberIndex < fiberCount; fiberIndex += 1) {
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

const buildSplashGeometry = (width: number, height: number): SplashGeometry => {
  const centerX = width / 2;
  const centerY = height / 2;
  const clearRadius = getSplashClearRadius(width, height);
  // Calculate diagonal to reach corners - extend beyond viewport
  const diagonal = Math.sqrt(centerX * centerX + centerY * centerY);
  const ringCount = 16; // More rings to fill the larger space
  const minRadius = clearRadius * 2.5;
  const maxRadius = diagonal * 1.15; // Extend past corners
  const swirl = 0.75;
  const rings: SplashPoint[][] = [];
  const radialLines: SplashLine[] = [];
  const connections: SplashLine[] = [];

  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const ringPosition = ringIndex / (ringCount - 1);
    const ringRadius = minRadius + (maxRadius - minRadius) * ringPosition;
    const pointsInRing = Math.floor(8 + ringIndex * 5);
    const ringRotation = (ringIndex % 2) * (Math.PI / pointsInRing) * 0.5;
    const ringPoints: SplashPoint[] = [];

    for (let pointIndex = 0; pointIndex < pointsInRing; pointIndex += 1) {
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

  for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex += 1) {
    const innerRing = rings[ringIndex];
    const outerRing = rings[ringIndex + 1];

    innerRing.forEach((innerPoint) => {
      const distances = outerRing.map((outerPoint, outerIndex) => ({
        point: outerPoint,
        index: outerIndex,
        distance: Math.sqrt((outerPoint.x - innerPoint.x) ** 2 + (outerPoint.y - innerPoint.y) ** 2),
      }));
      distances.sort((left, right) => left.distance - right.distance);
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

  return {
    rings,
    radialLines,
    connections,
    ringCount,
    clearRadius,
  };
};

const drawSplashPaper = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  fibers: SplashFiber[]
) => {
  context.fillStyle = splashPalette.base;
  context.fillRect(0, 0, width, height);
  context.save();
  context.strokeStyle = splashPalette.inkFaint;
  fibers.forEach((fiber) => {
    context.globalAlpha = fiber.alpha;
    context.lineWidth = 0.6;
    context.beginPath();
    context.moveTo(fiber.x, fiber.y);
    context.lineTo(
      fiber.x + Math.cos(fiber.angle) * fiber.length,
      fiber.y + Math.sin(fiber.angle) * fiber.length
    );
    context.stroke();
  });
  context.restore();
};

const drawSplashCenterDisc = (
  context: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  radius: number
) => {
  // Outer glow
  context.save();
  const glowGradient = context.createRadialGradient(centerX, centerY, radius * 0.8, centerX, centerY, radius * 1.8);
  glowGradient.addColorStop(0, 'hsla(270, 40%, 50%, 0.15)');
  glowGradient.addColorStop(0.5, 'hsla(270, 30%, 40%, 0.08)');
  glowGradient.addColorStop(1, 'transparent');
  context.fillStyle = glowGradient;
  context.beginPath();
  context.arc(centerX, centerY, radius * 1.8, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // Main disc - solid dark
  context.save();
  const gradient = context.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius * 1.1);
  gradient.addColorStop(0, 'hsl(30, 5%, 10.5%)');
  gradient.addColorStop(0.7, 'hsl(30, 5%, 10.5%)');
  gradient.addColorStop(1, 'hsla(30, 5%, 10.5%, 0.95)');
  context.fillStyle = gradient;
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.fill();
  context.restore();

  // Subtle ring
  context.save();
  context.globalAlpha = 0.35;
  context.strokeStyle = 'hsla(270, 50%, 70%, 0.4)';
  context.lineWidth = 1;
  context.beginPath();
  context.arc(centerX, centerY, radius + 3, 0, Math.PI * 2);
  context.stroke();
  context.restore();
};

const drawSplashRings = (
  context: CanvasRenderingContext2D,
  geometry: SplashGeometry,
  timeValue: number
) => {
  const ringCount = geometry.rings.length || geometry.ringCount;
  if (!ringCount) return;
  const alphaValue = envelopeValue(timeValue);
  const baseAlpha = alphaValue * 0.5 + 0.35; // Good base for visibility
  const wavePrimary = timeValue * Math.PI * 2 * 4;
  const waveSecondary = timeValue * Math.PI * 2 * 6;
  const waveTertiary = timeValue * Math.PI * 2 * 0.7;

  // Distance-based alpha: very subtle in center, prominent at edges
  const getEdgeAlpha = (ringIndex: number) => {
    const edgeFactor = ringIndex / ringCount; // 0 at center, 1 at edge
    // Use cubic easing for more dramatic center-to-edge transition
    const curved = edgeFactor * edgeFactor * edgeFactor; // Cubic for even more dramatic gradient
    return 0.02 + curved * 1.3; // Range from barely visible (0.02) to enhanced (1.32) at edges
  };

  context.save();
  context.lineCap = 'round';
  context.lineJoin = 'round';

  geometry.rings.forEach((ringPoints, ringIndex) => {
    const edgeAlpha = getEdgeAlpha(ringIndex);
    const glowIntensity = Math.sin(wavePrimary - ringIndex * 0.6) * 0.3 + 0.6;
    context.globalAlpha = baseAlpha * 0.25 * glowIntensity * edgeAlpha;
    context.strokeStyle = splashPalette.highlightSubtle;
    context.lineWidth = 5 + edgeAlpha * 3; // Thicker lines at edges
    context.beginPath();
    ringPoints.forEach((point, pointIndex) => {
      if (pointIndex === 0) {
        context.moveTo(point.x, point.y);
      } else {
        context.lineTo(point.x, point.y);
      }
    });
    context.closePath();
    context.stroke();
  });

  geometry.radialLines.forEach((line) => {
    const edgeAlpha = getEdgeAlpha(line.ringIndex);
    const pulsePosition = (wavePrimary / (Math.PI * 2) + line.from.baseAngle / (Math.PI * 2)) % 1;
    const pulseIntensity = Math.sin(pulsePosition * Math.PI * 2) * 0.5 + 0.5;
    // Glow layer
    context.globalAlpha = baseAlpha * 0.35 * pulseIntensity * edgeAlpha;
    context.strokeStyle = splashPalette.glow;
    context.lineWidth = 1.5 + edgeAlpha;
    context.beginPath();
    context.moveTo(line.from.x, line.from.y);
    context.lineTo(line.to.x, line.to.y);
    context.stroke();

    // Main line
    context.globalAlpha = baseAlpha * (0.45 + pulseIntensity * 0.35) * edgeAlpha;
    context.strokeStyle = splashPalette.ink;
    context.lineWidth = 0.8 + pulseIntensity * 0.5 + edgeAlpha * 0.3;
    context.beginPath();
    context.moveTo(line.from.x, line.from.y);
    context.lineTo(line.to.x, line.to.y);
    context.stroke();

    if (pulseIntensity > 0.7) {
      context.globalAlpha = baseAlpha * 0.25 * ((pulseIntensity - 0.7) / 0.3) * edgeAlpha;
      context.strokeStyle = splashPalette.highlight;
      context.lineWidth = 1.2;
      context.beginPath();
      context.moveTo(line.from.x, line.from.y);
      context.lineTo(line.to.x, line.to.y);
      context.stroke();
    }
  });

  geometry.connections.forEach((connection) => {
    const edgeAlpha = getEdgeAlpha(connection.ringIndex);
    const waveValue =
      Math.sin(wavePrimary - connection.ringIndex * 0.7) * 0.5 +
      Math.sin(waveSecondary - connection.ringIndex * 1.1 + connection.from.pointIndex * 0.4) * 0.3;
    const intensity = (waveValue + 0.8) / 1.6;

    // Glow layer
    context.globalAlpha = baseAlpha * 0.4 * intensity * edgeAlpha;
    context.strokeStyle = splashPalette.glow;
    context.lineWidth = 1.5 + intensity * 1.2 + edgeAlpha;
    context.beginPath();
    context.moveTo(connection.from.x, connection.from.y);
    context.lineTo(connection.to.x, connection.to.y);
    context.stroke();

    // Main line
    context.globalAlpha = baseAlpha * (0.5 + intensity * 0.35) * edgeAlpha;
    context.strokeStyle = splashPalette.ink;
    context.lineWidth = 0.7 + intensity * 0.5 + edgeAlpha * 0.3;
    context.beginPath();
    context.moveTo(connection.from.x, connection.from.y);
    context.lineTo(connection.to.x, connection.to.y);
    context.stroke();
  });

  geometry.rings.forEach((ringPoints, ringIndex) => {
    const edgeAlpha = getEdgeAlpha(ringIndex);
    ringPoints.forEach((point, pointIndex) => {
      const nodePulse =
        Math.sin(wavePrimary - ringIndex * 0.5 + pointIndex * 0.4) * 0.5 +
        Math.sin(waveSecondary - ringIndex * 0.8 + pointIndex * 0.6) * 0.3;
      const intensity = (nodePulse + 0.8) / 1.6;
      const nodeSize = 1.2 + intensity * 1.8 + edgeAlpha * 0.5;

      // Outer glow
      context.globalAlpha = baseAlpha * 0.45 * intensity * edgeAlpha;
      context.fillStyle = splashPalette.glow;
      context.beginPath();
      context.arc(point.x, point.y, nodeSize + 1.5, 0, Math.PI * 2);
      context.fill();

      // Main node
      context.globalAlpha = baseAlpha * (0.55 + intensity * 0.35) * edgeAlpha;
      context.fillStyle = splashPalette.ink;
      context.beginPath();
      context.arc(point.x, point.y, nodeSize, 0, Math.PI * 2);
      context.fill();

      // Bright core for high-intensity nodes at edges
      if (intensity > 0.6 && edgeAlpha > 0.3) {
        context.globalAlpha = baseAlpha * 0.7 * ((intensity - 0.6) / 0.4) * edgeAlpha;
        context.fillStyle = splashPalette.highlightBright;
        context.beginPath();
        context.arc(point.x, point.y, nodeSize * 0.45, 0, Math.PI * 2);
        context.fill();
      }
    });
  });

  // Traveling particles - only on outer rings for edge emphasis
  const particleCount = 12;
  for (let particleIndex = 0; particleIndex < particleCount; particleIndex += 1) {
    const particleProgress = (timeValue * 0.6 + particleIndex / particleCount) % 1;
    // Focus particles on outer 60% of rings for edge emphasis
    const particleRingIndex = Math.floor(ringCount * 0.4 + particleProgress * ringCount * 0.55);
    const ringPoints = geometry.rings[particleRingIndex];
    if (!ringPoints || ringPoints.length === 0) continue;

    const particleAngle = (waveTertiary + (particleIndex * Math.PI * 2) / particleCount) % (Math.PI * 2);
    const nearestPoint = ringPoints.reduce(
      (best, point) => {
        const diff = Math.abs(point.angle - particleAngle);
        return diff < best.diff ? { point, diff } : best;
      },
      { diff: Infinity, point: ringPoints[0] }
    );

    if (nearestPoint.point) {
      const particleEdgeAlpha = getEdgeAlpha(particleRingIndex);
      context.globalAlpha = baseAlpha * 0.6 * envelopeValue(particleProgress) * particleEdgeAlpha;
      context.fillStyle = splashPalette.warmPulse;
      context.beginPath();
      context.arc(nearestPoint.point.x, nearestPoint.point.y, 2.5, 0, Math.PI * 2);
      context.fill();

      // Bright core
      context.globalAlpha = baseAlpha * 0.8 * envelopeValue(particleProgress) * particleEdgeAlpha;
      context.fillStyle = splashPalette.highlightBright;
      context.beginPath();
      context.arc(nearestPoint.point.x, nearestPoint.point.y, 1.2, 0, Math.PI * 2);
      context.fill();
    }
  }

  context.restore();
};

const ChatSplashCanvas = ({ active }: { active: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    let animationFrame: number | null = null;
    let startTime = performance.now();
    let canvasScale = 1;
    let fibers: SplashFiber[] = [];
    let geometry: SplashGeometry | null = null;

    const resize = () => {
      const width = Math.max(wrapper.clientWidth, 1);
      const height = Math.max(wrapper.clientHeight, 1);
      canvasScale = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * canvasScale;
      canvas.height = height * canvasScale;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(canvasScale, 0, 0, canvasScale, 0, 0);
      fibers = buildSplashFibers(width, height);
      geometry = buildSplashGeometry(width, height);
    };

    resize();
    if (!geometry.rings.length) return;

    const animate = (time: number) => {
      const width = canvas.width / canvasScale;
      const height = canvas.height / canvasScale;
      const cycleProgress = ((time - startTime) % splashCycleMs) / splashCycleMs;
      drawSplashPaper(context, width, height, fibers);
      if (geometry) {
        drawSplashRings(context, geometry, cycleProgress);
        drawSplashCenterDisc(context, width / 2, height / 2, geometry.clearRadius);
      }
      animationFrame = window.requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    animationFrame = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationFrame) window.cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={wrapperRef}
      className={`pointer-events-none absolute inset-0 transition-opacity duration-500 ease-out ${
        active ? 'opacity-100' : 'opacity-0'
      }`}
    >
      <canvas ref={canvasRef} className="h-full w-full" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,hsla(30,8%,10%,0.92),hsla(30,8%,10%,0.7)_35%,transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsla(30,5%,10.5%,0.28)]" />
    </div>
  );
};

const extractToolResults = (toolCalls: StoredToolCall[] = []): ToolResult[] => {
  return toolCalls
    .filter((tc) => tc.result)
    .map((tc) => {
      const rawResult = tc.result;
      const content = typeof rawResult === 'string'
        ? rawResult
        : rawResult && typeof rawResult === 'object' && 'content' in rawResult
          ? String(rawResult.content ?? '')
          : rawResult != null
            ? JSON.stringify(rawResult)
            : '';
      const isError = rawResult && typeof rawResult === 'object' && 'isError' in rawResult
        ? Boolean((rawResult as { isError?: boolean }).isError)
        : undefined;
      return { tool_call_id: tc.id, content, isError };
    });
};

const normalizeStoredMessage = (message: StoredMessage): Message => {
  const toolCalls = message.tool_calls || [];
  const toolResults = extractToolResults(toolCalls);
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    model: message.model,
    toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
    toolResults: toolResults.length > 0 ? toolResults : undefined,
    prompt_tokens: message.prompt_tokens,
    completion_tokens: message.completion_tokens,
    total_tokens: message.total_tokens,
    request_prompt_tokens: message.request_prompt_tokens,
    request_tools_tokens: message.request_tools_tokens,
    request_total_input_tokens: message.request_total_input_tokens,
    request_completion_tokens: message.request_completion_tokens,
    estimated_cost_usd: message.estimated_cost_usd,
  };
};

function ChatPageContent() {
  const {
    currentSessionId,
    currentSessionTitle,
    messages,
    input,
    isLoading,
    error,
    streamingStartTime,
    elapsedSeconds,
    queuedContext,
    runningModel,
    modelName,
    selectedModel,
    availableModels,
    pageLoading,
    copiedIndex,
    isMobile,
    toolPanelOpen,
    activePanel,
    mcpEnabled,
    artifactsEnabled,
    mcpServers,
    mcpSettingsOpen,
    mcpTools,
    executingTools,
    toolResultsMap,
    systemPrompt,
    chatSettingsOpen,
    deepResearch,
    researchProgress,
    researchSources,
    sessionUsage,
    usageDetailsOpen,
    exportOpen,
    messageSearchOpen,
    bookmarkedMessages,
    userScrolledUp,
  } = useAppStore((state) => ({
    currentSessionId: state.currentSessionId,
    currentSessionTitle: state.currentSessionTitle,
    messages: state.messages,
    input: state.input,
    isLoading: state.isLoading,
    error: state.error,
    streamingStartTime: state.streamingStartTime,
    elapsedSeconds: state.elapsedSeconds,
    queuedContext: state.queuedContext,
    runningModel: state.runningModel,
    modelName: state.modelName,
    selectedModel: state.selectedModel,
    availableModels: state.availableModels,
    pageLoading: state.pageLoading,
    copiedIndex: state.copiedIndex,
    isMobile: state.isMobile,
    toolPanelOpen: state.toolPanelOpen,
    activePanel: state.activePanel,
    mcpEnabled: state.mcpEnabled,
    artifactsEnabled: state.artifactsEnabled,
    mcpServers: state.mcpServers,
    mcpSettingsOpen: state.mcpSettingsOpen,
    mcpTools: state.mcpTools,
    executingTools: state.executingTools,
    toolResultsMap: state.toolResultsMap,
    systemPrompt: state.systemPrompt,
    chatSettingsOpen: state.chatSettingsOpen,
    deepResearch: state.deepResearch,
    researchProgress: state.researchProgress,
    researchSources: state.researchSources,
    sessionUsage: state.sessionUsage,
    usageDetailsOpen: state.usageDetailsOpen,
    exportOpen: state.exportOpen,
    messageSearchOpen: state.messageSearchOpen,
    bookmarkedMessages: state.bookmarkedMessages,
    userScrolledUp: state.userScrolledUp,
  }), shallow);

  const {
    setSessions,
    updateSessions,
    setCurrentSessionId,
    setCurrentSessionTitle,
    setSessionsLoading,
    setSessionsAvailable,
    setMessages,
    updateMessages,
    setInput,
    setIsLoading,
    setError,
    setStreamingStartTime,
    setElapsedSeconds,
    setQueuedContext,
    setRunningModel,
    setModelName,
    setSelectedModel,
    setAvailableModels,
    setPageLoading,
    setCopiedIndex,
    setSidebarCollapsed,
    setIsMobile,
    setToolPanelOpen,
    setActivePanel,
    setMcpEnabled,
    setArtifactsEnabled,
    setMcpServers,
    setMcpSettingsOpen,
    setMcpTools,
    updateExecutingTools,
    setToolResultsMap,
    updateToolResultsMap,
    setSystemPrompt,
    setChatSettingsOpen,
    setDeepResearch,
    setResearchProgress,
    setResearchSources,
    setSessionUsage,
    setUsageDetailsOpen,
    setExportOpen,
    setMessageSearchOpen,
    updateBookmarkedMessages,
    setTitleDraft,
    setUserScrolledUp,
  } = useAppStore((state) => ({
    setSessions: state.setSessions,
    updateSessions: state.updateSessions,
    setCurrentSessionId: state.setCurrentSessionId,
    setCurrentSessionTitle: state.setCurrentSessionTitle,
    setSessionsLoading: state.setSessionsLoading,
    setSessionsAvailable: state.setSessionsAvailable,
    setMessages: state.setMessages,
    updateMessages: state.updateMessages,
    setInput: state.setInput,
    setIsLoading: state.setIsLoading,
    setError: state.setError,
    setStreamingStartTime: state.setStreamingStartTime,
    setElapsedSeconds: state.setElapsedSeconds,
    setQueuedContext: state.setQueuedContext,
    setRunningModel: state.setRunningModel,
    setModelName: state.setModelName,
    setSelectedModel: state.setSelectedModel,
    setAvailableModels: state.setAvailableModels,
    setPageLoading: state.setPageLoading,
    setCopiedIndex: state.setCopiedIndex,
    setSidebarCollapsed: state.setSidebarCollapsed,
    setIsMobile: state.setIsMobile,
    setToolPanelOpen: state.setToolPanelOpen,
    setActivePanel: state.setActivePanel,
    setMcpEnabled: state.setMcpEnabled,
    setArtifactsEnabled: state.setArtifactsEnabled,
    setMcpServers: state.setMcpServers,
    setMcpSettingsOpen: state.setMcpSettingsOpen,
    setMcpTools: state.setMcpTools,
    updateExecutingTools: state.updateExecutingTools,
    setToolResultsMap: state.setToolResultsMap,
    updateToolResultsMap: state.updateToolResultsMap,
    setSystemPrompt: state.setSystemPrompt,
    setChatSettingsOpen: state.setChatSettingsOpen,
    setDeepResearch: state.setDeepResearch,
    setResearchProgress: state.setResearchProgress,
    setResearchSources: state.setResearchSources,
    setSessionUsage: state.setSessionUsage,
    setUsageDetailsOpen: state.setUsageDetailsOpen,
    setExportOpen: state.setExportOpen,
    setMessageSearchOpen: state.setMessageSearchOpen,
    updateBookmarkedMessages: state.updateBookmarkedMessages,
    setTitleDraft: state.setTitleDraft,
    setUserScrolledUp: state.setUserScrolledUp,
  }), shallow);

  const usageRefreshTimerRef = useRef<number | null>(null);
  const loadingSessionRef = useRef(false);
  const activeSessionRef = useRef<string | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  const searchParams = useSearchParams();
  const sessionFromUrl = searchParams.get('session');
  const newChatFromUrl = searchParams.get('new') === '1';

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Context management
  const maxContext = useMemo(() => {
    const model = availableModels.find(m => m.id === selectedModel || m.id === runningModel);
    return model?.max_model_len || 200000;
  }, [availableModels, selectedModel, runningModel]);

  const contextMessages = useMemo(() => messages.map(m => ({ role: m.role, content: m.content })), [messages]);

  const handleContextCompact = useCallback((newMessages: Array<{ role: string; content: string }>) => {
    const compactedIds = new Set(newMessages.map((m, i) => messages[messages.length - newMessages.length + i]?.id).filter(Boolean));
    updateMessages((prev: Message[]) => prev.filter(m => compactedIds.has(m.id) || prev.indexOf(m) >= prev.length - newMessages.length));
  }, [messages, updateMessages]);

  const contextManager = useContextManager({
    messages: contextMessages, maxContext, systemPrompt,
    tools: mcpEnabled ? mcpTools : undefined, onCompact: handleContextCompact, enabled: true,
  });

  // Computed values
  const allToolCalls = messages.flatMap(m => (m.toolCalls || []).map(tc => ({ ...tc, messageId: m.id, model: m.model })));
  const latestAssistantMessage = useMemo(() => [...messages].reverse().find(m => m.role === 'assistant'), [messages]);
  const lastMessage = messages[messages.length - 1];
  const lastAssistantMessage = lastMessage?.role === 'assistant' ? lastMessage : null;
  const showEmptyState = messages.length === 0 && !isLoading && !error;
  const thinkingState = useMemo(() => {
    if (!latestAssistantMessage?.content) return { content: null, isComplete: true };
    const { thinkingContent, isThinkingComplete } = splitThinking(latestAssistantMessage.content);
    return { content: thinkingContent, isComplete: isThinkingComplete };
  }, [latestAssistantMessage?.content]);
  const thinkingActive = Boolean(isLoading && thinkingState.content);
  const activityItems = useMemo(() => {
    const items: Array<
      | { type: 'thinking'; id: string; content: string; isComplete: boolean; isStreaming: boolean }
      | { type: 'tool'; id: string; toolCall: ToolCall & { messageId: string; model?: string } }
    > = [];

    const extractThinkingBlocks = (content: string) => {
      const blocks: Array<{ content: string; isComplete: boolean }> = [];
      const openTags = ['<think>', '<thinking>'];
      const closeTags = ['</think>', '</thinking>'];
      let remaining = content;

      while (remaining) {
        const lower = remaining.toLowerCase();
        const openIdxs = openTags
          .map((t) => lower.indexOf(t))
          .filter((i) => i !== -1);
        if (!openIdxs.length) break;
        const openIdx = Math.min(...openIdxs);
        const matchedOpen = openTags.find((t) => lower.startsWith(t, openIdx))!;
        const afterOpen = remaining.slice(openIdx + matchedOpen.length);
        const lowerAfter = afterOpen.toLowerCase();
        const closeIdxs = closeTags
          .map((t) => lowerAfter.indexOf(t))
          .filter((i) => i !== -1);
        if (!closeIdxs.length) {
          const contentBlock = afterOpen.replace(/<\|(?:begin|end)_of_box\|>/g, '').trim();
          if (contentBlock) blocks.push({ content: contentBlock, isComplete: false });
          break;
        }
        const closeIdx = Math.min(...closeIdxs);
        const matchedClose = closeTags.find((t) => lowerAfter.startsWith(t, closeIdx))!;
        const contentBlock = afterOpen.slice(0, closeIdx).replace(/<\|(?:begin|end)_of_box\|>/g, '').trim();
        if (contentBlock) blocks.push({ content: contentBlock, isComplete: true });
        remaining = afterOpen.slice(closeIdx + matchedClose.length);
      }

      return blocks;
    };

    messages.forEach((msg) => {
      if (msg.role !== 'assistant' || !msg.content) return;
      const blocks = extractThinkingBlocks(msg.content);
      const toolCalls = msg.toolCalls || [];
      let toolIndex = 0;

      if (blocks.length === 0 && toolCalls.length === 0) return;

      blocks.forEach((block, idx) => {
        items.push({
          type: 'thinking',
          id: `thinking-${msg.id}-${idx}`,
          content: block.content,
          isComplete: block.isComplete,
          isStreaming: Boolean(msg.isStreaming) && !block.isComplete,
        });
        if (toolIndex < toolCalls.length) {
          const toolCall = toolCalls[toolIndex];
          items.push({
            type: 'tool',
            id: `tool-${msg.id}-${toolCall.id}`,
            toolCall: { ...toolCall, messageId: msg.id, model: msg.model },
          });
          toolIndex += 1;
        }
      });

      while (toolIndex < toolCalls.length) {
        const toolCall = toolCalls[toolIndex];
        items.push({
          type: 'tool',
          id: `tool-${msg.id}-${toolCall.id}`,
          toolCall: { ...toolCall, messageId: msg.id, model: msg.model },
        });
        toolIndex += 1;
      }
    });

    return items;
  }, [messages]);
  const sessionArtifacts = useMemo(() => {
    if (!artifactsEnabled || !messages.length) return [];
    const artifacts: Artifact[] = [];
    messages.forEach(msg => {
      if (msg.role === 'assistant' && msg.content && !msg.isStreaming) {
        const { artifacts: extracted } = extractArtifacts(msg.content);
        extracted.forEach(a => artifacts.push({ ...a, message_id: msg.id, session_id: currentSessionId || undefined }));
      }
    });
    return artifacts;
  }, [artifactsEnabled, currentSessionId, messages]);
  const hasArtifacts = sessionArtifacts.length > 0;
  const hasToolActivity = messages.some(m => m.toolCalls?.length) || executingTools.size > 0 || researchProgress !== null || thinkingActive;
  const hasSidePanelContent = hasToolActivity || hasArtifacts;

  const loadAvailableModels = useCallback(async () => {
    try {
      const res = await api.getOpenAIModels();
      setAvailableModels((res.data || []).map((m) => ({ id: m.id, root: m.root, max_model_len: m.max_model_len })));
    } catch {
      setAvailableModels([]);
    }
  }, [setAvailableModels]);

  const loadMCPServers = useCallback(async () => {
    try {
      const servers = await api.getMCPServers();
      setMcpServers(servers.map((s) => ({ ...s, args: s.args || [], env: s.env || {}, enabled: s.enabled ?? true })));
    } catch {}
  }, [setMcpServers]);

  const loadMCPTools = useCallback(async () => {
    try {
      const response = await api.getMCPTools();
      setMcpTools(response.tools || []);
    } catch {
      setMcpTools([]);
    }
  }, [setMcpTools]);

  const loadStatus = useCallback(async () => {
    try {
      const status = await api.getStatus();
      if (status.process) {
        const modelId = status.process.served_model_name || status.process.model_path || 'default';
        setRunningModel(modelId);
        setModelName(status.process.model_path?.split('/').pop() || 'Model');
        setSelectedModel(selectedModel || modelId);
      }
    } catch {} finally { setPageLoading(false); }
  }, [selectedModel, setRunningModel, setModelName, setSelectedModel, setPageLoading]);

  const loadSessions = useCallback(async () => {
    try {
      const data = await api.getChatSessions();
      setSessions(data.sessions);
      setSessionsAvailable(true);
      if (currentSessionId) {
        const found = data.sessions.find((s) => s.id === currentSessionId);
        if (found?.title) setCurrentSessionTitle(found.title);
      }
    } catch {
      setSessions([]);
      setSessionsAvailable(false);
    } finally {
      setSessionsLoading(false);
    }
  }, [currentSessionId, setCurrentSessionTitle, setSessions, setSessionsAvailable, setSessionsLoading]);

  // Session helpers

  const refreshUsage = useCallback(async (sessionId: string) => {
    if (!sessionId) return;
    if (usageRefreshTimerRef.current) window.clearTimeout(usageRefreshTimerRef.current);
    usageRefreshTimerRef.current = window.setTimeout(async () => {
      try {
        const usage = await api.getChatUsage(sessionId);
        setSessionUsage({
          prompt_tokens: usage.prompt_tokens,
          completion_tokens: usage.completion_tokens,
          total_tokens: usage.total_tokens,
          estimated_cost_usd: usage.estimated_cost_usd ?? null,
        });
      } catch {}
    }, 500);
  }, [setSessionUsage]);

  const loadSession = useCallback(async (sessionId: string) => {
    if (!sessionId || loadingSessionRef.current) return;
    loadingSessionRef.current = true;
    try {
      const { session } = await api.getChatSession(sessionId);
      if (activeSessionRef.current && activeSessionRef.current !== session.id) return;
      setCurrentSessionId(session.id);
      setCurrentSessionTitle(session.title);
      setTitleDraft(session.title);
      if (session.model) setSelectedModel(session.model);
      const msgs: Message[] = (session.messages || []).map(normalizeStoredMessage);
      setMessages(msgs);
      setToolResultsMap(new Map());
      refreshUsage(session.id);
      setSidebarCollapsed(isMobile);
    } catch {
      console.log('Failed to load session');
    } finally {
      loadingSessionRef.current = false;
    }
  }, [isMobile, refreshUsage, setCurrentSessionId, setCurrentSessionTitle, setMessages, setSelectedModel, setSidebarCollapsed, setTitleDraft, setToolResultsMap]);

  // Effects
  useEffect(() => {
    const checkMobile = () => { const mobile = window.innerWidth < 768; setIsMobile(mobile); if (mobile) setSidebarCollapsed(true); };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [setIsMobile, setSidebarCollapsed]);

  useEffect(() => { debouncedSave({ mcpEnabled, artifactsEnabled, systemPrompt, selectedModel }, 1000); }, [mcpEnabled, artifactsEnabled, systemPrompt, selectedModel]);
  useEffect(() => { loadStatus(); loadSessions(); loadMCPServers(); loadAvailableModels(); }, [loadAvailableModels, loadMCPServers, loadSessions, loadStatus]);

  useEffect(() => {
    if (newChatFromUrl) {
      activeSessionRef.current = null;
      setCurrentSessionId(null);
      setCurrentSessionTitle('New Chat');
      setTitleDraft('New Chat');
      setMessages([]);
      setToolResultsMap(new Map());
      updateExecutingTools(() => new Set());
      setResearchProgress(null);
      setResearchSources([]);
      setSessionUsage(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    if (!sessionFromUrl) return;

    if (activeSessionRef.current !== sessionFromUrl) {
      activeSessionRef.current = sessionFromUrl;
      setMessages([]);
      setToolResultsMap(new Map());
      updateExecutingTools(() => new Set());
      setResearchProgress(null);
      setResearchSources([]);
      setSessionUsage(null);
      setError(null);
      setIsLoading(false);
      loadSession(sessionFromUrl);
    }
  }, [loadSession, newChatFromUrl, sessionFromUrl, setCurrentSessionId, setCurrentSessionTitle, setError, setIsLoading, setMessages, setResearchProgress, setResearchSources, setSessionUsage, setTitleDraft, setToolResultsMap, updateExecutingTools]);

  useEffect(() => { if (!userScrolledUp) messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, userScrolledUp]);
  useEffect(() => { if (mcpEnabled) loadMCPTools(); else setMcpTools([]); }, [loadMCPTools, mcpEnabled, setMcpTools]);
  useEffect(() => {
    if (sessionArtifacts.length > 0 && activePanel === 'tools' && !hasToolActivity) {
      setActivePanel('artifacts');
    }
  }, [activePanel, hasToolActivity, sessionArtifacts.length, setActivePanel]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout | null = null;
    if (isLoading && streamingStartTime) {
      intervalId = setInterval(() => setElapsedSeconds(Math.floor((Date.now() - streamingStartTime) / 1000)), 1000);
    } else if (!isLoading) {
      const timeoutId = setTimeout(() => { if (!isLoading) { setStreamingStartTime(null); setElapsedSeconds(0); } }, 3000);
      return () => clearTimeout(timeoutId);
    }
    return () => { if (intervalId) clearInterval(intervalId); };
  }, [isLoading, setElapsedSeconds, setStreamingStartTime, streamingStartTime]);

  const handleScroll = () => { const container = messagesContainerRef.current; if (!container) return; const { scrollTop, scrollHeight, clientHeight } = container; setUserScrolledUp(scrollHeight - scrollTop - clientHeight >= 100); };

  // Build API messages
  const buildAPIMessages = (msgs: Message[]): OpenAIMessage[] => {
    const apiMessages: OpenAIMessage[] = [];
    const sysContent = systemPrompt.trim();
    if (sysContent) apiMessages.push({ role: 'system', content: sysContent });
    if (mcpEnabled && mcpTools.length > 0) { const toolsList = mcpTools.map(t => `- ${t.server}__${t.name}: ${t.description || 'No description'}`).join('\n'); apiMessages.push({ role: 'system', content: `Available tools:\n${toolsList}` }); }
    for (const msg of msgs) {
      if (msg.role === 'user') { const parts: OpenAIContentPart[] = []; if (msg.content) parts.push({ type: 'text', text: msg.content }); if (msg.images?.length) msg.images.forEach(img => parts.push({ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${img}` } })); apiMessages.push({ role: 'user', content: parts.length === 1 && parts[0].type === 'text' ? parts[0].text : parts }); }
      else { const cleanContent = stripThinkingForModelContext(msg.content); if (msg.toolCalls?.length) { apiMessages.push({ role: 'assistant', content: cleanContent || null, tool_calls: msg.toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments } })) }); msg.toolResults?.forEach(tr => apiMessages.push({ role: 'tool', tool_call_id: tr.tool_call_id, content: tr.content })); } else { apiMessages.push({ role: 'assistant', content: cleanContent || '' }); } }
    }
    return apiMessages;
  };

  const getOpenAITools = () => { if (!mcpEnabled || !mcpTools.length) return []; return mcpTools.map(tool => ({ type: 'function', function: { name: `${tool.server}__${tool.name}`, description: tool.description || `Tool ${tool.name} from ${tool.server}`, parameters: tool.inputSchema || { type: 'object', properties: {} } } })); };

  const executeMCPTool = async (toolCall: ToolCall): Promise<ToolResult> => {
    const funcName = toolCall.function?.name || ''; const parts = funcName.split('__'); let server = parts.length > 1 ? parts[0] : ''; let toolName = parts.length > 1 ? parts.slice(1).join('__') : funcName;
    // Fallback: if no server prefix, try to find the tool by name in mcpTools
    if (!server && mcpTools.length > 0) {
      const matchingTool = mcpTools.find(t => t.name === funcName || t.name === toolName);
      if (matchingTool) { server = matchingTool.server; toolName = matchingTool.name; }
    }
    if (!server) { return { tool_call_id: toolCall.id, content: `Error: Could not determine MCP server for tool "${funcName}"`, isError: true }; }
    try { let args: Record<string, unknown> = {}; const rawArgs = (toolCall.function?.arguments || '').trim(); if (rawArgs) { try { args = JSON.parse(rawArgs); } catch { args = { raw: rawArgs }; } } const result = await api.callMCPTool(server, toolName, args); return { tool_call_id: toolCall.id, content: typeof result.result === 'string' ? result.result : JSON.stringify(result.result) }; }
    catch (error) { return { tool_call_id: toolCall.id, content: `Error: ${error instanceof Error ? error.message : String(error)}`, isError: true }; }
  };

  // Send message
  const sendMessage = async (attachments?: Attachment[]) => {
    const hasText = input.trim().length > 0; const hasAttachments = attachments?.length; const activeModelId = (selectedModel || runningModel || '').trim();
    if ((!hasText && !hasAttachments) || !activeModelId || isLoading || loadingSessionRef.current) return;
    const userContent = input.trim(); const imageAttachments = attachments?.filter(a => a.type === 'image' && a.base64) || [];
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: userContent || (imageAttachments.length ? '[Image]' : '...'), images: imageAttachments.map(a => a.base64!), model: activeModelId };
    updateMessages(prev => [...prev, userMessage]); setInput(''); setIsLoading(true); setStreamingStartTime(Date.now()); setElapsedSeconds(0); setError(null);
    abortControllerRef.current = new AbortController();
    const conversationMessages = buildAPIMessages([...messages, userMessage]);
    let sessionId = currentSessionId || sessionFromUrl || activeSessionRef.current || null;
    if (sessionFromUrl && !currentSessionId) setCurrentSessionId(sessionFromUrl);
    let finalAssistantContent = '';
    const bumpSessionUpdatedAt = () => { if (!sessionId) return; updateSessions(prev => { const existing = prev.find(s => s.id === sessionId); const updated = existing ? { ...existing, updated_at: new Date().toISOString() } : undefined; return updated ? [updated, ...prev.filter(s => s.id !== sessionId)] : prev; }); };

    try {
      if (!sessionId) { try { const { session } = await api.createChatSession({ title: 'New Chat', model: activeModelId || undefined }); sessionId = session.id; setCurrentSessionId(sessionId); updateSessions(prev => [session, ...prev]); setSessionsAvailable(true); } catch {} }
      if (sessionId) { try { const persisted = await api.addChatMessage(sessionId, { id: userMessage.id, role: 'user', content: userContent, model: activeModelId }); const normalized = normalizeStoredMessage(persisted); updateMessages(prev => prev.map(m => m.id === normalized.id ? { ...m, ...normalized } : m)); bumpSessionUpdatedAt(); refreshUsage(sessionId); } catch {} }

      let iteration = 0; const MAX_ITERATIONS = 25; const cachedToolResultsBySignature = new Map<string, Omit<ToolResult, 'tool_call_id'>>();
      while (iteration < MAX_ITERATIONS) {
        iteration++;
        const requestBody: Record<string, unknown> = { messages: conversationMessages, model: activeModelId, tools: getOpenAITools() };
        if (activeModelId.toLowerCase().includes('minimax')) { requestBody.temperature = 1.0; requestBody.top_p = 0.95; requestBody.top_k = 40; }
        const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody), signal: abortControllerRef.current?.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const reader = response.body?.getReader(); if (!reader) throw new Error('No response body');
        const assistantMsgId = (Date.now() + iteration).toString();
        updateMessages(prev => [...prev, { id: assistantMsgId, role: 'assistant', content: '', isStreaming: true, model: activeModelId }]);
        let iterationContent = ''; let toolCalls: ToolCall[] = [];
        let pendingContent = ''; let pendingToolCalls: ToolCall[] | null = null; let frameId: number | null = null;
        const flushAssistantUpdate = (force = false) => {
          const applyUpdate = () => {
            frameId = null;
            if (!pendingContent && !pendingToolCalls) return;
            updateMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, content: pendingContent || iterationContent, toolCalls: pendingToolCalls ?? m.toolCalls } : m));
            pendingContent = '';
            pendingToolCalls = null;
          };
          if (force) { if (frameId !== null) window.cancelAnimationFrame(frameId); applyUpdate(); return; }
          if (frameId === null) frameId = window.requestAnimationFrame(applyUpdate);
        };
        for await (const event of parseSSEEvents(reader)) {
          if (event.type === 'text' && event.content) { iterationContent += event.content; pendingContent = iterationContent; flushAssistantUpdate(); }
          else if (event.type === 'tool_calls' && event.tool_calls) { toolCalls = event.tool_calls as ToolCall[]; pendingToolCalls = toolCalls; flushAssistantUpdate(true); }
          else if (event.type === 'error') { throw new Error(event.error || 'Stream error'); }
        }
        flushAssistantUpdate(true);
        if (!toolCalls.length) {
          finalAssistantContent = iterationContent; updateMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, isStreaming: false } : m));
          if (sessionId) { try { const persisted = await api.addChatMessage(sessionId, { id: assistantMsgId, role: 'assistant', content: iterationContent, model: activeModelId }); const normalized = normalizeStoredMessage(persisted); updateMessages(prev => prev.map(m => m.id === normalized.id ? { ...m, ...normalized } : m)); bumpSessionUpdatedAt(); refreshUsage(sessionId); } catch {} }
          break;
        }
        const toolResults: ToolResult[] = []; const toolNameByCallId = new Map<string, string>();
        for (const tc of toolCalls) {
          const signature = `${tc.function?.name}:${tc.function?.arguments}`; toolNameByCallId.set(tc.id, tc.function.name);
          if (cachedToolResultsBySignature.has(signature)) { const cached = cachedToolResultsBySignature.get(signature)!; toolResults.push({ tool_call_id: tc.id, ...cached }); updateToolResultsMap(prev => { const next = new Map(prev); next.set(tc.id, { tool_call_id: tc.id, ...cached }); return next; }); continue; }
          updateExecutingTools(prev => { const next = new Set(prev); next.add(tc.id); return next; }); const result = await executeMCPTool(tc); cachedToolResultsBySignature.set(signature, { content: result.content, isError: result.isError }); toolResults.push(result); updateToolResultsMap(prev => { const next = new Map(prev); next.set(tc.id, result); return next; }); updateExecutingTools(prev => { const next = new Set(prev); next.delete(tc.id); return next; });
        }
        updateMessages(prev => prev.map(m => m.id === assistantMsgId ? { ...m, toolResults, isStreaming: false } : m));
        if (sessionId) { try { await api.addChatMessage(sessionId, { id: assistantMsgId, role: 'assistant', content: iterationContent, model: activeModelId, tool_calls: toolCalls.map(tc => ({ ...tc, result: toolResults.find(r => r.tool_call_id === tc.id) || null })) }); bumpSessionUpdatedAt(); refreshUsage(sessionId); } catch {} }
        const cleanedContent = stripThinkingForModelContext(iterationContent);
        conversationMessages.push({ role: 'assistant', content: cleanedContent || null, tool_calls: toolCalls.map(tc => ({ id: tc.id, type: 'function', function: { name: tc.function.name, arguments: tc.function.arguments } })) });
        toolResults.forEach(r => conversationMessages.push({ role: 'tool', tool_call_id: r.tool_call_id, name: toolNameByCallId.get(r.tool_call_id), content: r.content }));
      }
      const shouldUpdateTitle = currentSessionTitle.trim() === '' || currentSessionTitle === 'New Chat';
      if (sessionId && finalAssistantContent.trim() && (shouldUpdateTitle || !currentSessionId)) {
        const fallbackTitle = userContent.trim().split(/\s+/).slice(0, 6).join(' ');
        try {
          const res = await fetch('/api/title', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: activeModelId, user: userContent, assistant: finalAssistantContent }) });
          let nextTitle = fallbackTitle;
          if (res.ok) {
            const data = await res.json();
            if (data.title && data.title !== 'New Chat') {
              nextTitle = data.title;
            }
          }
          if (nextTitle) {
            await api.updateChatSession(sessionId, { title: nextTitle });
            updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: nextTitle } : s));
            setCurrentSessionTitle(nextTitle);
            setTitleDraft(nextTitle);
          }
        } catch {
          if (fallbackTitle) {
            try {
              await api.updateChatSession(sessionId, { title: fallbackTitle });
              updateSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: fallbackTitle } : s));
              setCurrentSessionTitle(fallbackTitle);
              setTitleDraft(fallbackTitle);
            } catch {}
          }
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') { updateMessages(prev => { const last = prev[prev.length - 1]; return last?.role === 'assistant' ? prev.map(m => m.id === last.id ? { ...m, isStreaming: false } : m) : prev; }); }
      else { setError(err instanceof Error ? err.message : 'Failed to send message'); updateMessages(prev => prev[prev.length - 1]?.role === 'assistant' && !prev[prev.length - 1]?.content ? prev.slice(0, -1) : prev); }
    } finally { setIsLoading(false); abortControllerRef.current = null; }
  };

  const stopGeneration = () => abortControllerRef.current?.abort();
  const copyToClipboard = (text: string, index: number) => { navigator.clipboard.writeText(text); setCopiedIndex(index); setTimeout(() => setCopiedIndex(null), 2000); };
  const forkAtMessage = async (messageId: string) => { if (!currentSessionId) return; try { const { session } = await api.forkChatSession(currentSessionId, { message_id: messageId, model: selectedModel || undefined }); updateSessions(prev => [session, ...prev]); await loadSession(session.id); } catch {} };
  const toggleBookmark = (messageId: string) => {
    updateBookmarkedMessages(prev => {
      const next = new Set(prev);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  };
  const copyLastResponse = () => {
    const last = [...messages].reverse().find(m => m.role === 'assistant');
    if (!last) return;
    copyToClipboard(last.content, messages.indexOf(last));
  };

  // Export functions
  const buildChatExport = () => ({ title: currentSessionTitle || 'Chat', session_id: currentSessionId, model: selectedModel || runningModel || null, messages: messages.map(m => ({ id: m.id, role: m.role, model: m.model ?? null, content: m.content, tool_calls: m.toolCalls ?? null, tool_results: m.toolResults ?? null })), session_usage: sessionUsage });
  const exportAsJson = () => { const payload = buildChatExport(); const name = (currentSessionTitle || 'chat').replace(/[^\w.-]+/g, '_').slice(0, 80); downloadTextFile(`${name}.json`, JSON.stringify(payload, null, 2), 'application/json'); };
  const exportAsMarkdown = () => { const payload = buildChatExport(); const lines = [`# ${payload.title}`, '']; if (payload.model) lines.push(`- Model: \`${payload.model}\``); lines.push(''); payload.messages.forEach(m => { lines.push(`## ${m.role === 'user' ? 'User' : 'Assistant'}`, '', m.content || '', ''); }); const name = (currentSessionTitle || 'chat').replace(/[^\w.-]+/g, '_').slice(0, 80); downloadTextFile(`${name}.md`, lines.join('\n'), 'text/markdown'); };

  const toolBelt = (
    <ToolBelt
      value={input}
      onChange={setInput}
      onSubmit={sendMessage}
      onStop={stopGeneration}
      disabled={!((selectedModel || runningModel || '').trim())}
      isLoading={isLoading}
      placeholder={(selectedModel || runningModel) ? 'Message...' : 'Select a model in Settings'}
      mcpEnabled={mcpEnabled}
      onMcpToggle={() => setMcpEnabled(!mcpEnabled)}
      artifactsEnabled={artifactsEnabled}
      onArtifactsToggle={() => setArtifactsEnabled(!artifactsEnabled)}
      onOpenMcpSettings={() => setMcpSettingsOpen(true)}
      onOpenChatSettings={() => setChatSettingsOpen(true)}
      hasSystemPrompt={systemPrompt.trim().length > 0}
      deepResearchEnabled={deepResearch.enabled}
      onDeepResearchToggle={() => {
        const nextEnabled = !deepResearch.enabled;
        setDeepResearch({ ...deepResearch, enabled: nextEnabled });
        if (nextEnabled && !mcpEnabled) setMcpEnabled(true);
      }}
      elapsedSeconds={elapsedSeconds}
      queuedContext={queuedContext}
      onQueuedContextChange={setQueuedContext}
    />
  );

  // Render
  if (pageLoading) { return <div className="flex items-center justify-center h-full"><div className="animate-pulse-soft"><Sparkles className="h-8 w-8 text-[#9a9590]" /></div></div>; }

  return (
    <>
      <div className="relative h-full flex overflow-hidden w-full max-w-full">
        <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-x-hidden">
          <div className="flex-1 flex overflow-hidden relative min-w-0">
            {messageSearchOpen && (
              <div className="absolute inset-0 z-50 bg-(--background)/95 backdrop-blur-sm">
                <div className="h-full flex flex-col max-w-2xl mx-auto">
                  <div className="flex items-center justify-between p-4 border-b border-(--border)"><h2 className="text-lg font-semibold">Search Messages</h2><button onClick={() => setMessageSearchOpen(false)} className="p-2 rounded hover:bg-(--accent)"><X className="h-5 w-5" /></button></div>
                  <div className="flex-1 overflow-hidden"><MessageSearch messages={messages} onResultClick={(messageId) => { document.getElementById(`message-${messageId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); setMessageSearchOpen(false); }} /></div>
                </div>
              </div>
            )}

            <div className="flex-1 flex flex-col overflow-hidden relative min-w-0">
              <div ref={messagesContainerRef} onScroll={handleScroll} className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden flex flex-col">
                <div className="pb-0 md:pb-4 flex-1 flex flex-col">
                  {(
                    <div className="flex-1 relative overflow-hidden flex items-center justify-center px-4 md:px-6 py-10 transition-opacity duration-500 ease-out bg-[hsl(30,5%,10.5%)]">
                      <ChatSplashCanvas active={showEmptyState} />
                      {showEmptyState && (
                        <div className="relative z-10 w-full max-w-2xl">
                          <div>{toolBelt}</div>
                        </div>
                      )}
                      {!showEmptyState && (
                        <div className="relative z-10 flex flex-col min-h-0 w-full">
                          <ChatMessageList messages={messages} currentSessionId={currentSessionId} bookmarkedMessages={bookmarkedMessages} artifactsEnabled={artifactsEnabled} isLoading={isLoading} error={error} copiedIndex={copiedIndex} onCopy={copyToClipboard} onFork={forkAtMessage} onToggleBookmark={toggleBookmark} />

                          {isMobile && researchProgress && <ResearchProgressIndicator progress={researchProgress} onCancel={() => setResearchProgress(null)} />}
                          {isMobile && researchSources.length > 0 && !researchProgress && <CitationsPanel sources={researchSources} />}

                          {lastAssistantMessage && !isLoading && (
                            <div className="max-w-4xl mx-auto px-4 md:px-6">
                              {isMobile ? (
                                <div className="mt-1.5 flex justify-end">
                                  <button
                                    onClick={() => setMobileActionsOpen(true)}
                                    className="p-2 rounded-full border border-(--border) bg-(--card) text-[#9a9590] hover:bg-(--accent)"
                                    title="Message actions"
                                  >
                                    <MoreHorizontal className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-2 pt-2 sm:mt-3 sm:pt-3 border-t border-(--border) flex items-center justify-end gap-3">
                                  <div className="hidden sm:flex items-center gap-3 text-xs md:text-xs text-[#6a6560]">
                                    {sessionUsage && (
                                      <div className="flex items-center gap-1.5 cursor-pointer hover:text-[#9a9590]" onClick={() => setUsageDetailsOpen(true)}>
                                        <BarChart3 className="h-3.5 w-3.5 md:h-3 md:w-3" />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {!isMobile && (
                <div className="absolute right-3 top-3 z-10 flex flex-col items-center gap-2">
                  <button
                    onClick={() => setToolPanelOpen(true)}
                    className="p-1.5 bg-(--card) border border-(--border) rounded hover:bg-(--accent)"
                    title="Show tools"
                  >
                    <PanelRightOpen className="h-4 w-4 text-[#9a9590]" />
                    {(executingTools.size > 0 || thinkingActive) && (
                      <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-(--success) rounded-full text-[9px] text-white font-medium">
                        {executingTools.size || '•'}
                      </span>
                    )}
                  </button>
                  <ContextIndicator
                    variant="icon"
                    stats={contextManager.stats}
                    config={contextManager.config}
                    onCompact={contextManager.compact}
                    onUpdateConfig={contextManager.updateConfig}
                    isWarning={contextManager.isWarning}
                    canSendMessage={contextManager.canSendMessage}
                    utilizationLevel={contextManager.utilizationLevel}
                  />
                </div>
              )}

              {!showEmptyState && (
                <div className="shrink-0 pb-0 md:pb-3">
                  {toolBelt}
                </div>
              )}
            </div>

            {!isMobile && hasSidePanelContent && toolPanelOpen && <ChatSidePanel isOpen={toolPanelOpen} onClose={() => setToolPanelOpen(false)} activePanel={activePanel} onSetActivePanel={setActivePanel} allToolCalls={allToolCalls} toolResultsMap={toolResultsMap} executingTools={executingTools} sessionArtifacts={sessionArtifacts} researchProgress={researchProgress} researchSources={researchSources} thinkingContent={thinkingState.content} thinkingActive={thinkingActive} activityItems={activityItems} />}
          </div>
        </div>
      </div>

      {isMobile && mobileActionsOpen && lastAssistantMessage && (
        <div className="fixed inset-0 z-50">
          <button
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileActionsOpen(false)}
            aria-label="Close actions"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-(--card) border-t border-(--border) rounded-t-2xl p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[#e8e4dd]">Message actions</span>
              <button
                onClick={() => setMobileActionsOpen(false)}
                className="p-1.5 rounded hover:bg-(--accent)"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={() => { copyLastResponse(); setMobileActionsOpen(false); }}
                className="flex items-center justify-center rounded-lg border border-(--border) bg-(--background) p-2 text-[#c8c4bd] hover:bg-(--accent)"
                aria-label="Copy"
              >
                <Copy className="h-4 w-4" />
              </button>
              <button
                onClick={() => { toggleBookmark(lastAssistantMessage.id); setMobileActionsOpen(false); }}
                className="flex items-center justify-center rounded-lg border border-(--border) bg-(--background) p-2 text-[#c8c4bd] hover:bg-(--accent)"
                aria-label="Bookmark"
              >
                {bookmarkedMessages.has(lastAssistantMessage.id) ? (
                  <BookmarkCheck className="h-4 w-4 text-(--link)" />
                ) : (
                  <Bookmark className="h-4 w-4" />
                )}
              </button>
              <button
                onClick={() => { if (currentSessionId) { forkAtMessage(lastAssistantMessage.id); setMobileActionsOpen(false); } }}
                disabled={!currentSessionId}
                className="flex items-center justify-center rounded-lg border border-(--border) bg-(--background) p-2 text-[#c8c4bd] hover:bg-(--accent) disabled:opacity-40 disabled:hover:bg-(--background)"
                aria-label="Fork"
              >
                <GitBranch className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center gap-2">
              <div className="flex-1">
                <ContextIndicator stats={contextManager.stats} config={contextManager.config} onCompact={contextManager.compact} onUpdateConfig={contextManager.updateConfig} isWarning={contextManager.isWarning} canSendMessage={contextManager.canSendMessage} utilizationLevel={contextManager.utilizationLevel} />
              </div>
              {sessionUsage && (
                <button
                  onClick={() => { setUsageDetailsOpen(true); setMobileActionsOpen(false); }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-(--border) text-[11px] text-[#9a9590] hover:bg-(--accent)"
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                  Usage
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <UsageModal isOpen={usageDetailsOpen} onClose={() => setUsageDetailsOpen(false)} sessionUsage={sessionUsage} messages={messages} selectedModel={selectedModel} />
      <ExportModal isOpen={exportOpen} onClose={() => setExportOpen(false)} onExportMarkdown={exportAsMarkdown} onExportJson={exportAsJson} />
      <MCPSettingsModal isOpen={mcpSettingsOpen} onClose={() => setMcpSettingsOpen(false)} servers={mcpServers} onServersChange={setMcpServers} />
      <ChatSettingsModal isOpen={chatSettingsOpen} onClose={() => setChatSettingsOpen(false)} systemPrompt={systemPrompt} onSystemPromptChange={setSystemPrompt} availableModels={availableModels} selectedModel={selectedModel} onSelectedModelChange={async (modelId) => { setSelectedModel((modelId || '').trim()); if (currentSessionId) { try { await api.updateChatSession(currentSessionId, { model: modelId || undefined }); updateSessions(p => p.map(s => s.id === currentSessionId ? { ...s, model: modelId } : s)); } catch {} } }} onForkModels={async (modelIds) => { if (!currentSessionId) return; for (const m of modelIds) { try { const { session } = await api.forkChatSession(currentSessionId, { model: m }); updateSessions(p => [session, ...p]); } catch {} } await loadSessions(); }} deepResearch={deepResearch} onDeepResearchChange={s => { setDeepResearch(s); localStorage.setItem('vllm-studio-deep-research', JSON.stringify(s)); if (s.enabled && !mcpEnabled) setMcpEnabled(true); }} />
    </>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-pulse-soft"><Sparkles className="h-8 w-8 text-[#9a9590]" /></div></div>}>
      <ChatPageContent />
    </Suspense>
  );
}
