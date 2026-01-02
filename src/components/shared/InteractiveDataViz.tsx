/**
 * Interactive Data Visualization Component
 * Supports multiple chart types with smooth transitions and interactions
 */

import React, { useState, useMemo, memo } from 'react';
import { BarChart3, PieChart, LineChart, MapPin, List, TrendingUp } from 'lucide-react';
import { Tooltip } from './Tooltip';

export type ChartType = 'bar' | 'pie' | 'line' | 'heatmap' | 'scatter' | 'area';

export interface DataPoint {
  label: string;
  value: number;
  color?: string;
  trend?: number;
  metadata?: Record<string, any>;
}

interface InteractiveDataVizProps {
  data: DataPoint[];
  title?: string;
  type?: ChartType;
  allowTypeSwitch?: boolean;
  height?: string;
  showLegend?: boolean;
  showValues?: boolean;
  interactive?: boolean;
  onDataPointClick?: (point: DataPoint, index: number) => void;
  className?: string;
}

export const InteractiveDataViz = memo(function InteractiveDataViz({
  data,
  title,
  type = 'bar',
  allowTypeSwitch = true,
  height = '300px',
  showLegend = true,
  showValues = true,
  interactive = true,
  onDataPointClick,
  className = ''
}: InteractiveDataVizProps) {
  const [currentType, setCurrentType] = useState<ChartType>(type);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Calculate scales
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value), 1), [data]);
  const minValue = useMemo(() => Math.min(...data.map(d => d.value), 0), [data]);
  const range = maxValue - minValue || 1;

  // Default colors
  const defaultColors = [
    '#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6',
    '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'
  ];

  // Enhanced data with colors
  const enhancedData = useMemo(() => {
    return data.map((point, index) => ({
      ...point,
      color: point.color || defaultColors[index % defaultColors.length]
    }));
  }, [data]);

  // Bar Chart Renderer
  const renderBarChart = () => {
    return (
      <div className="flex items-end justify-between gap-2 px-4 h-full">
        {enhancedData.map((point, index) => {
          const heightPercent = ((point.value - minValue) / range) * 100;
          const isHovered = hoveredIndex === index;
          const isSelected = selectedIndex === index;

          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-2"
              onMouseEnter={() => interactive && setHoveredIndex(index)}
              onMouseLeave={() => interactive && setHoveredIndex(null)}
              onClick={() => {
                if (interactive) {
                  setSelectedIndex(index);
                  onDataPointClick?.(point, index);
                }
              }}
            >
              <Tooltip content={`${point.label}: ${point.value.toLocaleString()}`}>
                <div className="relative w-full">
                  {/* Bar */}
                  <div
                    className={`w-full rounded-t-lg transition-all duration-300 ${
                      interactive ? 'cursor-pointer hover:opacity-80' : ''
                    } ${isSelected ? 'ring-2 ring-white ring-offset-2 ring-offset-gray-900' : ''}`}
                    style={{
                      height: `${heightPercent}%`,
                      backgroundColor: point.color,
                      transform: isHovered ? 'scaleY(1.05)' : 'scaleY(1)',
                      transformOrigin: 'bottom',
                      minHeight: '4px'
                    }}
                  >
                    {/* Value Label */}
                    {showValues && (isHovered || isSelected) && (
                      <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-sm px-2 py-1 rounded text-xs text-white whitespace-nowrap">
                        {point.value.toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </Tooltip>

              {/* Label */}
              <div className={`text-xs text-center transition-all duration-200 ${
                isHovered || isSelected ? 'text-white font-semibold' : 'text-gray-400'
              }`}>
                {point.label.length > 10 ? `${point.label.substring(0, 10)}...` : point.label}
              </div>

              {/* Trend Indicator */}
              {point.trend !== undefined && (
                <div className={`text-xs flex items-center gap-1 ${
                  point.trend > 0 ? 'text-green-400' : point.trend < 0 ? 'text-red-400' : 'text-gray-400'
                }`}>
                  <TrendingUp className={`w-3 h-3 ${point.trend < 0 ? 'rotate-180' : ''}`} />
                  {Math.abs(point.trend).toFixed(1)}%
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Pie Chart Renderer
  const renderPieChart = () => {
    const total = enhancedData.reduce((sum, p) => sum + p.value, 0);
    let currentAngle = 0;

    return (
      <div className="flex items-center justify-center h-full gap-8">
        {/* Pie */}
        <svg width="200" height="200" viewBox="0 0 200 200" className="transform -rotate-90">
          {enhancedData.map((point, index) => {
            const percent = (point.value / total) * 100;
            const angle = (percent / 100) * 360;
            const startAngle = currentAngle;
            currentAngle += angle;

            // SVG arc path
            const startX = 100 + 80 * Math.cos((startAngle * Math.PI) / 180);
            const startY = 100 + 80 * Math.sin((startAngle * Math.PI) / 180);
            const endX = 100 + 80 * Math.cos(((startAngle + angle) * Math.PI) / 180);
            const endY = 100 + 80 * Math.sin(((startAngle + angle) * Math.PI) / 180);
            const largeArc = angle > 180 ? 1 : 0;

            const isHovered = hoveredIndex === index;
            const isSelected = selectedIndex === index;

            return (
              <Tooltip key={index} content={`${point.label}: ${percent.toFixed(1)}%`}>
                <g
                  onMouseEnter={() => interactive && setHoveredIndex(index)}
                  onMouseLeave={() => interactive && setHoveredIndex(null)}
                  onClick={() => {
                    if (interactive) {
                      setSelectedIndex(index);
                      onDataPointClick?.(point, index);
                    }
                  }}
                  className={interactive ? 'cursor-pointer' : ''}
                >
                  <path
                    d={`M 100 100 L ${startX} ${startY} A 80 80 0 ${largeArc} 1 ${endX} ${endY} Z`}
                    fill={point.color}
                    opacity={isHovered || isSelected ? 1 : 0.8}
                    className="transition-all duration-300"
                    style={{
                      transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                      transformOrigin: '100px 100px',
                      filter: isSelected ? 'drop-shadow(0 0 8px rgba(255,255,255,0.5))' : 'none'
                    }}
                  />
                </g>
              </Tooltip>
            );
          })}
        </svg>

        {/* Legend */}
        {showLegend && (
          <div className="flex flex-col gap-2">
            {enhancedData.map((point, index) => {
              const percent = ((point.value / total) * 100).toFixed(1);
              const isHovered = hoveredIndex === index;
              const isSelected = selectedIndex === index;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-2 text-sm transition-all duration-200 ${
                    interactive ? 'cursor-pointer hover:scale-105' : ''
                  } ${isHovered || isSelected ? 'font-semibold' : ''}`}
                  onMouseEnter={() => interactive && setHoveredIndex(index)}
                  onMouseLeave={() => interactive && setHoveredIndex(null)}
                  onClick={() => {
                    if (interactive) {
                      setSelectedIndex(index);
                      onDataPointClick?.(point, index);
                    }
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: point.color }}
                  />
                  <span className="text-gray-300">{point.label}</span>
                  <span className="text-gray-500">({percent}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  // Line Chart Renderer
  const renderLineChart = () => {
    const width = 100; // percentage
    const pointSpacing = width / (enhancedData.length - 1 || 1);

    const points = enhancedData.map((point, index) => ({
      x: index * pointSpacing,
      y: 100 - ((point.value - minValue) / range) * 80 // 80% of height for data, 10% padding top/bottom
    }));

    const pathData = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

    // Area fill path
    const areaPathData = `${pathData} L ${points[points.length - 1].x} 100 L 0 100 Z`;

    return (
      <div className="relative w-full h-full px-4">
        <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0">
          {/* Area Fill */}
          <path
            d={areaPathData}
            fill="url(#gradient)"
            opacity="0.2"
          />
          
          {/* Line */}
          <path
            d={pathData}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="0.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="transition-all duration-300"
          />

          {/* Gradient Definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data Points */}
          {points.map((point, index) => {
            const isHovered = hoveredIndex === index;
            const isSelected = selectedIndex === index;

            return (
              <Tooltip key={index} content={`${enhancedData[index].label}: ${enhancedData[index].value.toLocaleString()}`}>
                <circle
                  cx={point.x}
                  cy={point.y}
                  r={isHovered || isSelected ? 2 : 1}
                  fill={isSelected ? '#fff' : enhancedData[index].color}
                  className={`transition-all duration-200 ${interactive ? 'cursor-pointer' : ''}`}
                  onMouseEnter={() => interactive && setHoveredIndex(index)}
                  onMouseLeave={() => interactive && setHoveredIndex(null)}
                  onClick={() => {
                    if (interactive) {
                      setSelectedIndex(index);
                      onDataPointClick?.(enhancedData[index], index);
                    }
                  }}
                  style={{
                    filter: isSelected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.8))' : 'none'
                  }}
                />
              </Tooltip>
            );
          })}
        </svg>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between px-4 text-xs text-gray-400">
          {enhancedData.map((point, index) => (
            <div key={index} className={hoveredIndex === index || selectedIndex === index ? 'text-white font-semibold' : ''}>
              {point.label.substring(0, 3)}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Chart type switcher buttons
  const chartTypes: { type: ChartType; icon: typeof BarChart3; label: string }[] = [
    { type: 'bar', icon: BarChart3, label: 'Bar Chart' },
    { type: 'pie', icon: PieChart, label: 'Pie Chart' },
    { type: 'line', icon: LineChart, label: 'Line Chart' }
  ];

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
        {title && <h3 className="text-lg font-semibold text-white">{title}</h3>}
        
        {/* Chart Type Switcher */}
        {allowTypeSwitch && (
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg p-1">
            {chartTypes.map(({ type: chartType, icon: Icon, label }) => (
              <Tooltip key={chartType} content={label}>
                <button
                  onClick={() => setCurrentType(chartType)}
                  className={`p-2 rounded transition-all duration-200 ${
                    currentType === chartType
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-400 hover:text-white hover:bg-gray-700'
                  }`}
                  aria-label={label}
                >
                  <Icon className="w-4 h-4" />
                </button>
              </Tooltip>
            ))}
          </div>
        )}
      </div>

      {/* Chart Content */}
      <div className="p-4" style={{ height }}>
        {currentType === 'bar' && renderBarChart()}
        {currentType === 'pie' && renderPieChart()}
        {currentType === 'line' && renderLineChart()}
      </div>
    </div>
  );
});

