/**
 * 3D Globe Visualization
 * Interactive globe showing global facility distribution
 * Uses Canvas 2D API for browser compatibility (no deck.gl dependency)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Globe, ZoomIn, ZoomOut, RotateCcw, Layers } from 'lucide-react';
import { Facility } from '../types';

interface GlobeViewProps {
  facilities: Facility[];
}

interface GlobeState {
  rotation: number;
  tilt: number;
  zoom: number;
}

export const GlobeView: React.FC<GlobeViewProps> = React.memo(({ facilities }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [globeState, setGlobeState] = useState<GlobeState>({
    rotation: 0,
    tilt: 20,
    zoom: 1.0,
  });
  const [isRotating, setIsRotating] = useState(true);
  const [hoveredFacility, setHoveredFacility] = useState<Facility | null>(null);
  const [showCables, setShowCables] = useState(true);
  const [showConnections, setShowConnections] = useState(true);
  const [renderError, setRenderError] = useState<string | null>(null);
  const animationRef = useRef<number>();
  const errorCountRef = useRef(0);

  // Convert lat/lng to 3D coordinates
  const latLngTo3D = useCallback((lat: number, lng: number, radius: number): [number, number, number] => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lng + 180) * (Math.PI / 180);

    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);

    return [x, y, z];
  }, []);

  // Project 3D point to 2D canvas
  const project3Dto2D = useCallback((x: number, y: number, z: number, canvasWidth: number, canvasHeight: number, zoom: number): [number, number, boolean] => {
    const scale = zoom * 200;
    const fov = 500;
    const perspective = fov / (fov + z);

    const x2d = canvasWidth / 2 + x * scale * perspective;
    const y2d = canvasHeight / 2 + y * scale * perspective;
    const visible = z > -200; // Only show front hemisphere

    return [x2d, y2d, visible];
  }, []);

  // Rotate point around Y axis
  const rotateY = useCallback((x: number, y: number, z: number, angle: number): [number, number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      x * cos - z * sin,
      y,
      x * sin + z * cos
    ];
  }, []);

  // Rotate point around X axis (tilt)
  const rotateX = useCallback((x: number, y: number, z: number, angle: number): [number, number, number] => {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    return [
      x,
      y * cos - z * sin,
      y * sin + z * cos
    ];
  }, []);

  // Get color based on compliance score
  const getComplianceColor = (score: number): string => {
    if (score >= 80) return '#22c55e'; // green
    if (score >= 60) return '#eab308'; // yellow
    return '#ef4444'; // red
  };

  // Draw the globe
  const drawGlobe = useCallback(() => {
    try {
      const canvas = canvasRef.current;
      if (!canvas) {
        console.warn('Globe: Canvas ref not available');
        return;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        console.error('Globe: Canvas 2D context not supported');
        setRenderError('Canvas 2D not supported in this browser');
        return;
      }

      const width = canvas.width;
      const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    const { rotation, tilt, zoom } = globeState;
    const radius = 100;

    // Draw globe sphere (wire frame)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    // Draw latitude lines
    for (let lat = -80; lat <= 80; lat += 20) {
      ctx.beginPath();
      let firstPoint = true;
      for (let lng = -180; lng <= 180; lng += 5) {
        let [x, y, z] = latLngTo3D(lat, lng, radius);
        [x, y, z] = rotateY(x, y, z, rotation);
        [x, y, z] = rotateX(x, y, z, tilt * Math.PI / 180);
        const [x2d, y2d, visible] = project3Dto2D(x, y, z, width, height, zoom);

        if (visible) {
          if (firstPoint) {
            ctx.moveTo(x2d, y2d);
            firstPoint = false;
          } else {
            ctx.lineTo(x2d, y2d);
          }
        }
      }
      ctx.stroke();
    }

    // Draw longitude lines
    for (let lng = -180; lng < 180; lng += 20) {
      ctx.beginPath();
      let firstPoint = true;
      for (let lat = -90; lat <= 90; lat += 5) {
        let [x, y, z] = latLngTo3D(lat, lng, radius);
        [x, y, z] = rotateY(x, y, z, rotation);
        [x, y, z] = rotateX(x, y, z, tilt * Math.PI / 180);
        const [x2d, y2d, visible] = project3Dto2D(x, y, z, width, height, zoom);

        if (visible) {
          if (firstPoint) {
            ctx.moveTo(x2d, y2d);
            firstPoint = false;
          } else {
            ctx.lineTo(x2d, y2d);
          }
        }
      }
      ctx.stroke();
    }

    // Draw submarine cables (if enabled)
    if (showCables) {
      ctx.strokeStyle = '#3b82f6';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.3;

      // Major submarine cable routes
      const cables = [
        { from: [40.7128, -74.0060], to: [51.5074, -0.1278] }, // NYC to London
        { from: [37.7749, -122.4194], to: [35.6762, 139.6503] }, // SF to Tokyo
        { from: [1.3521, 103.8198], to: [22.3193, 114.1694] }, // Singapore to Hong Kong
      ];

      cables.forEach(cable => {
        ctx.beginPath();
        let firstPoint = true;

        for (let t = 0; t <= 1; t += 0.05) {
          const lat = cable.from[0] + (cable.to[0] - cable.from[0]) * t;
          const lng = cable.from[1] + (cable.to[1] - cable.from[1]) * t;
          let [x, y, z] = latLngTo3D(lat, lng, radius + 2);
          [x, y, z] = rotateY(x, y, z, rotation);
          [x, y, z] = rotateX(x, y, z, tilt * Math.PI / 180);
          const [x2d, y2d, visible] = project3Dto2D(x, y, z, width, height, zoom);

          if (visible) {
            if (firstPoint) {
              ctx.moveTo(x2d, y2d);
              firstPoint = false;
            } else {
              ctx.lineTo(x2d, y2d);
            }
          }
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;
    }

    // Draw facility markers
    const facilitiesWithCoords = facilities.filter(f => f.latitude && f.longitude);
    
    facilitiesWithCoords.forEach(facility => {
      let [x, y, z] = latLngTo3D(facility.latitude!, facility.longitude!, radius + 3);
      [x, y, z] = rotateY(x, y, z, rotation);
      [x, y, z] = rotateX(x, y, z, tilt * Math.PI / 180);
      const [x2d, y2d, visible] = project3Dto2D(x, y, z, width, height, zoom);

      if (visible) {
        const color = getComplianceColor(facility.complianceScore);
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x2d, y2d, 3 * zoom, 0, Math.PI * 2);
        ctx.fill();

        // Glow effect
        ctx.fillStyle = color + '40';
        ctx.beginPath();
        ctx.arc(x2d, y2d, 6 * zoom, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Draw connections between facilities (if enabled)
    if (showConnections) {
      ctx.strokeStyle = '#8b5cf6';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.2;

      // Draw connections between facilities of same provider
      const providerGroups = facilitiesWithCoords.reduce((acc, f) => {
        if (!acc[f.provider]) acc[f.provider] = [];
        acc[f.provider].push(f);
        return acc;
      }, {} as Record<string, Facility[]>);

      Object.values(providerGroups).forEach(group => {
        if (group.length < 2) return;

        // Connect first 5 facilities in each group
        for (let i = 0; i < Math.min(5, group.length - 1); i++) {
          const f1 = group[i];
          const f2 = group[i + 1];

          ctx.beginPath();
          let [x1, y1, z1] = latLngTo3D(f1.latitude!, f1.longitude!, radius + 3);
          [x1, y1, z1] = rotateY(x1, y1, z1, rotation);
          [x1, y1, z1] = rotateX(x1, y1, z1, tilt * Math.PI / 180);
          const [x1_2d, y1_2d, visible1] = project3Dto2D(x1, y1, z1, width, height, zoom);

          let [x2, y2, z2] = latLngTo3D(f2.latitude!, f2.longitude!, radius + 3);
          [x2, y2, z2] = rotateY(x2, y2, z2, rotation);
          [x2, y2, z2] = rotateX(x2, y2, z2, tilt * Math.PI / 180);
          const [x2_2d, y2_2d, visible2] = project3Dto2D(x2, y2, z2, width, height, zoom);

          if (visible1 && visible2) {
            ctx.moveTo(x1_2d, y1_2d);
            ctx.lineTo(x2_2d, y2_2d);
          }
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;
    }

    // Draw stats overlay
    ctx.fillStyle = '#fff';
    ctx.font = '14px monospace';
    ctx.fillText(`Facilities: ${facilitiesWithCoords.length}`, 10, 20);
    ctx.fillText(`Rotation: ${(rotation * 180 / Math.PI).toFixed(0)}°`, 10, 40);
    ctx.fillText(`Zoom: ${zoom.toFixed(2)}x`, 10, 60);
    
    // Reset error count on successful render
    errorCountRef.current = 0;
    
    } catch (error) {
      console.error('Globe rendering error:', error);
      errorCountRef.current++;
      
      // Stop trying after 5 consecutive errors
      if (errorCountRef.current > 5) {
        setRenderError(`Rendering failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        setIsRotating(false);
      }
    }
  }, [facilities, globeState, showCables, showConnections, latLngTo3D, project3Dto2D, rotateY, rotateX]);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      if (isRotating) {
        setGlobeState(prev => ({
          ...prev,
          rotation: (prev.rotation + 0.005) % (Math.PI * 2)
        }));
      }
      drawGlobe();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isRotating, drawGlobe]);

  // Handle zoom
  const handleZoom = (delta: number) => {
    setGlobeState(prev => ({
      ...prev,
      zoom: Math.max(0.5, Math.min(3.0, prev.zoom + delta))
    }));
  };

  // Handle reset
  const handleReset = () => {
    setGlobeState({ rotation: 0, tilt: 20, zoom: 1.0 });
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border border-cyan-500/30 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Globe className="w-6 h-6 text-cyan-400" />
          <div>
            <h3 className="text-lg font-semibold text-cyan-400">3D Globe Visualization</h3>
            <p className="text-xs text-slate-400">Interactive global facility distribution</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => handleZoom(0.2)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
            title="Zoom In"
            disabled={!!renderError}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleZoom(-0.2)}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
            title="Zoom Out"
            disabled={!!renderError}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleReset}
            className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-cyan-400 transition-colors"
            title="Reset View"
            disabled={!!renderError}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={() => setIsRotating(!isRotating)}
            className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
              isRotating
                ? 'bg-cyan-500/20 text-cyan-400'
                : 'bg-slate-800 text-slate-400 hover:text-slate-300'
            }`}
            disabled={!!renderError}
          >
            {isRotating ? 'Pause' : 'Rotate'}
          </button>
        </div>
      </div>

      {renderError ? (
        <div className="relative bg-slate-950 rounded-lg border border-red-500/50 overflow-hidden p-8 text-center min-h-[600px] flex items-center justify-center">
          <div>
            <Globe className="w-16 h-16 mx-auto text-red-400 mb-4" />
            <h3 className="text-xl font-semibold text-red-400 mb-2">Globe Rendering Error</h3>
            <p className="text-slate-300 mb-4">{renderError}</p>
            <button
              onClick={() => {
                setRenderError(null);
                errorCountRef.current = 0;
                setIsRotating(true);
              }}
              className="px-4 py-2 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
            >
              Retry Rendering
            </button>
          </div>
        </div>
      ) : (
        <div className="relative bg-slate-950 rounded-lg border border-slate-700 overflow-hidden">
          <canvas
            ref={canvasRef}
            width={1200}
            height={600}
            className="w-full"
          />
        </div>
      )}

      <div className="mt-4 flex items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showCables}
            onChange={(e) => setShowCables(e.target.checked)}
            className="rounded"
          />
          <span>Show Submarine Cables</span>
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
          <input
            type="checkbox"
            checked={showConnections}
            onChange={(e) => setShowConnections(e.target.checked)}
            className="rounded"
          />
          <span>Show Network Connections</span>
        </label>

        <div className="ml-auto flex items-center gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full" />
            <span>Compliant (≥80%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-yellow-500 rounded-full" />
            <span>Warning (60-79%)</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-red-500 rounded-full" />
            <span>Critical (<60%)</span>
          </div>
        </div>
      </div>
    </div>
  );
});

GlobeView.displayName = 'GlobeView';

