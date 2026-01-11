/**
 * TabLoadingFallback.tsx
 * 
 * Lightweight loading skeleton for lazy-loaded tabs.
 * Shows immediately while heavy components load in background.
 */

import React from 'react';
import { Loader2 } from 'lucide-react';

interface TabLoadingFallbackProps {
  tabName?: string;
}

export const TabLoadingFallback: React.FC<TabLoadingFallbackProps> = ({ tabName }) => {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px] gap-4 p-8">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <div className="text-center">
        <p className="text-slate-600 font-medium">
          Loading {tabName || 'component'}...
        </p>
        <p className="text-slate-400 text-sm mt-1">
          This may take a moment on first load
        </p>
      </div>
    </div>
  );
};

/**
 * Skeleton for chart-heavy tabs
 */
export const ChartTabSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex justify-between items-center">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-8 w-32 bg-slate-200 rounded" />
      </div>
      
      {/* Chart area skeleton */}
      <div className="grid grid-cols-2 gap-6">
        <div className="h-64 bg-slate-100 rounded-lg border border-slate-200" />
        <div className="h-64 bg-slate-100 rounded-lg border border-slate-200" />
      </div>
      
      {/* Table skeleton */}
      <div className="space-y-2">
        <div className="h-10 bg-slate-200 rounded" />
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-12 bg-slate-100 rounded" />
        ))}
      </div>
    </div>
  );
};

/**
 * Skeleton for map-heavy tabs
 */
export const MapTabSkeleton: React.FC = () => {
  return (
    <div className="h-full min-h-[500px] relative animate-pulse">
      {/* Map placeholder */}
      <div className="absolute inset-0 bg-slate-100 rounded-lg">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-500">Loading map...</p>
          </div>
        </div>
        
        {/* Fake map grid */}
        <div className="absolute inset-0 opacity-10">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="border-b border-slate-300" style={{ height: '10%' }} />
          ))}
        </div>
      </div>
      
      {/* Sidebar skeleton */}
      <div className="absolute left-4 top-4 w-64 bg-white rounded-lg shadow-lg p-4 space-y-3">
        <div className="h-6 w-32 bg-slate-200 rounded" />
        <div className="h-4 w-full bg-slate-100 rounded" />
        <div className="h-4 w-3/4 bg-slate-100 rounded" />
      </div>
    </div>
  );
};

/**
 * Skeleton for AI/analysis tabs
 */
export const AnalysisTabSkeleton: React.FC = () => {
  return (
    <div className="p-6 space-y-6 animate-pulse">
      {/* AI status bar */}
      <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-lg">
        <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />
        <div className="h-4 w-48 bg-blue-200 rounded" />
      </div>
      
      {/* Analysis panels */}
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-lg border">
            <div className="h-5 w-24 bg-slate-200 rounded mb-3" />
            <div className="h-20 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
      
      {/* Results area */}
      <div className="h-48 bg-slate-50 rounded-lg border border-slate-200" />
    </div>
  );
};

export default TabLoadingFallback;
