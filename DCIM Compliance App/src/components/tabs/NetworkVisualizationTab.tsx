/**
 * Network Visualization Tab
 * Advanced infrastructure visualization with 20-level tree and 3D globe
 */

import React, { useState } from 'react';
import { Globe, Layers, Map } from 'lucide-react';
import { Facility } from '../../types';
import { InfrastructureTree } from '../InfrastructureTree';
import { GlobeView } from '../GlobeView';

interface NetworkVisualizationTabProps {
  facilities: Facility[];
}

type ViewMode = 'tree' | 'globe';

export function NetworkVisualizationTab({ facilities }: NetworkVisualizationTabProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('tree');
  
  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-auto">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-900 via-blue-900 to-purple-900 border-2 border-cyan-500 rounded-xl p-6 shadow-2xl shadow-cyan-500/20">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Map className="w-10 h-10 text-cyan-400" />
              <h1 className="text-3xl font-bold text-white">🌐 Network Visualization</h1>
            </div>
            <p className="text-lg text-cyan-200 font-medium">
              📊 Explore infrastructure from provider to process • 20-level deep hierarchy
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setViewMode('tree')}
              className={`px-6 py-3 rounded-lg text-lg font-bold transition-all flex items-center gap-2 ${
                viewMode === 'tree'
                  ? 'bg-cyan-600 text-white border-2 border-cyan-400 shadow-lg shadow-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <Layers className="w-5 h-5" />
              Tree View
            </button>
            
            <button
              onClick={() => setViewMode('globe')}
              className={`px-6 py-3 rounded-lg text-lg font-bold transition-all flex items-center gap-2 ${
                viewMode === 'globe'
                  ? 'bg-cyan-600 text-white border-2 border-cyan-400 shadow-lg shadow-cyan-500/50'
                  : 'bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600'
              }`}
            >
              <Globe className="w-5 h-5" />
              Globe View
            </button>
          </div>
        </div>
      </div>
      
      {/* Content */}
      {viewMode === 'tree' && (
        <InfrastructureTree
          facilities={facilities}
          onNodeSelect={(node) => console.log('Selected node:', node)}
        />
      )}
      
      {viewMode === 'globe' && (
        <GlobeView facilities={facilities} />
      )}
    </div>
  );
}

