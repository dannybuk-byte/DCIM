import { memo, useEffect, useMemo, useRef } from 'react';
import type { Map as MapLibreMap } from 'maplibre-gl';

type LngLat = { lng: number; lat: number };
type LineFeature = {
  geometry?: { type?: string; coordinates?: Array<[number, number]> };
  properties?: Record<string, any>;
};

export interface SimulationSettings {
  intensity: number; // 0..1
  speed: number; // 0.2..2.5-ish
  trail: number; // 0..1 (higher = longer trails)
  opacity: number; // 0..1
  particleSize: number; // pixels (1..4)
}

const COLORS = {
  green: '#2ed573',
  yellow: '#ffa502',
  red: '#ff4757',
  cyan: '#00d2d3',
};

type Particle = {
  featureIdx: number;
  t: number; // 0..1 along the polyline
  speed: number; // per-second
  size: number;
  color: string;
  prevX?: number;
  prevY?: number;
};

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

function pickColor(props: Record<string, any> | undefined): string {
  const s = String(props?.complianceStatus || 'Unknown');
  if (s === 'Compliant') return COLORS.green;
  if (s === 'Non-Compliant') return COLORS.red;
  if (s === 'At Risk') return COLORS.yellow;
  return COLORS.cyan;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function sampleLineAtT(coords: Array<[number, number]>, t: number): LngLat {
  if (coords.length === 0) return { lng: 0, lat: 0 };
  if (coords.length === 1) return { lng: coords[0][0], lat: coords[0][1] };
  const n = coords.length;
  const p = clamp01(t) * (n - 1);
  const i = Math.min(n - 2, Math.max(0, Math.floor(p)));
  const f = p - i;
  const a = coords[i];
  const b = coords[i + 1];
  return { lng: lerp(a[0], b[0], f), lat: lerp(a[1], b[1], f) };
}

export const FlowSimulationOverlay = memo(function FlowSimulationOverlay({
  map,
  enabled,
  flows,
  settings,
  zIndex = 12,
}: {
  map: MapLibreMap | null;
  enabled: boolean;
  flows: { features?: LineFeature[] } | null;
  settings: SimulationSettings;
  zIndex?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const roRef = useRef<ResizeObserver | null>(null);

  const features = useMemo(() => {
    const fs = flows?.features || [];
    return fs
      .filter((f) => f?.geometry?.type === 'LineString' && Array.isArray(f?.geometry?.coordinates) && (f.geometry?.coordinates?.length || 0) >= 2)
      .slice(0, 2500);
  }, [flows]);

  const resetParticles = (count: number) => {
    const next: Particle[] = [];
    if (!features.length) {
      particlesRef.current = [];
      return;
    }

    for (let i = 0; i < count; i++) {
      const featureIdx = Math.floor(Math.random() * features.length);
      const feat = features[featureIdx];
      const props = feat.properties || {};
      const weight = typeof props.weight === 'number' ? props.weight : 0.5;
      const base = 0.18 + clamp01(weight) * 0.6;
      next.push({
        featureIdx,
        t: Math.random(),
        speed: base * (0.45 + Math.random() * 0.9),
        size: settings.particleSize * (0.85 + Math.random() * 0.6),
        color: pickColor(props),
      });
    }
    particlesRef.current = next;
  };

  const resizeCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2.5, window.devicePixelRatio || 1));
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(rect.height * dpr));
    const ctx = canvas.getContext('2d');
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  // Resize observer (so the overlay stays pinned to the map container)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    if (!parent) return;

    roRef.current?.disconnect();
    const ro = new ResizeObserver(() => resizeCanvas());
    ro.observe(parent);
    roRef.current = ro;
    resizeCanvas();

    return () => {
      ro.disconnect();
      roRef.current = null;
    };
  }, []);

  // Particle count responds to intensity + feature availability
  useEffect(() => {
    if (!enabled) return;
    const max = 1400;
    const target = Math.max(0, Math.min(max, Math.round(max * clamp01(settings.intensity))));
    resetParticles(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, settings.intensity, features.length]);

  // Animation loop
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    if (!enabled || !map || !features.length) {
      // Stop + clear
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const opacity = clamp01(settings.opacity);
    const trail = clamp01(settings.trail);
    const speedMul = Math.max(0.15, Math.min(3, settings.speed));

    const fadeAlpha = lerp(0.22, 0.04, trail); // higher trail => lower fade per frame

    const tick = (ts: number) => {
      const last = lastTsRef.current ?? ts;
      const dt = Math.min(0.05, Math.max(0.001, (ts - last) / 1000));
      lastTsRef.current = ts;

      // Trail fade
      ctx.save();
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = fadeAlpha;
      ctx.fillStyle = 'rgba(0,0,0,1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();

      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = opacity;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      const particles = particlesRef.current;
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        const feat = features[p.featureIdx];
        const coords = feat?.geometry?.coordinates || [];
        if (coords.length < 2) continue;

        p.t += dt * p.speed * speedMul * 0.6;
        if (p.t > 1) {
          const nextIdx = Math.floor(Math.random() * features.length);
          const nextFeat = features[nextIdx];
          const props = nextFeat?.properties || {};
          const weight = typeof props.weight === 'number' ? props.weight : 0.5;
          const base = 0.18 + clamp01(weight) * 0.6;
          p.featureIdx = nextIdx;
          p.t = 0;
          p.speed = base * (0.45 + Math.random() * 0.9);
          p.size = settings.particleSize * (0.85 + Math.random() * 0.6);
          p.color = pickColor(props);
          p.prevX = undefined;
          p.prevY = undefined;
        }

        const pos = sampleLineAtT(coords, p.t);
        const proj = map.project(pos as any);
        const x = proj.x;
        const y = proj.y;

        // Streak line
        if (p.prevX != null && p.prevY != null) {
          ctx.strokeStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 10;
          ctx.lineWidth = Math.max(0.8, p.size * 0.6);
          ctx.beginPath();
          ctx.moveTo(p.prevX, p.prevY);
          ctx.lineTo(x, y);
          ctx.stroke();
        }

        // Head
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, p.size), 0, Math.PI * 2);
        ctx.fill();

        p.prevX = x;
        p.prevY = y;
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      lastTsRef.current = null;
    };
  }, [enabled, map, features, settings.opacity, settings.trail, settings.speed, settings.particleSize]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none"
      style={{ zIndex }}
      aria-hidden="true"
    />
  );
});

FlowSimulationOverlay.displayName = 'FlowSimulationOverlay';


