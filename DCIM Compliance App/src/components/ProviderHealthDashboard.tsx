/**
 * Provider Health Dashboard
 * 
 * Visual monitoring of multi-provider failover system
 * Shows health status, success rates, and response times for all backup providers
 */

import React, { useEffect, useState } from 'react';
import { Activity, CheckCircle, AlertTriangle, XCircle, RefreshCw, Zap } from 'lucide-react';
import { getProviderHealth, resetProvider, type DataCategory } from '../utils/multiProviderFailover';
import type { APIProvider } from '../utils/multiProviderFailover';

export const ProviderHealthDashboard: React.FC = () => {
  const [health, setHealth] = useState<Record<DataCategory, APIProvider[]>>({} as any);
  const [selectedCategory, setSelectedCategory] = useState<DataCategory | null>(null);

  const updateHealth = () => {
    setHealth(getProviderHealth());
  };

  useEffect(() => {
    updateHealth();
    const interval = setInterval(updateHealth, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const getHealthIcon = (status: APIProvider['healthStatus']) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'degraded':
        return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'down':
        return <XCircle className="w-4 h-4 text-red-400" />;
    }
  };

  const getHealthColor = (status: APIProvider['healthStatus']) => {
    switch (status) {
      case 'healthy':
        return 'border-green-500/30 bg-green-500/10';
      case 'degraded':
        return 'border-yellow-500/30 bg-yellow-500/10';
      case 'down':
        return 'border-red-500/30 bg-red-500/10';
    }
  };

  const getCategoryIcon = (category: DataCategory) => {
    const icons: Record<DataCategory, string> = {
      company_info: '🏢',
      environmental: '🌿',
      network_data: '🌐',
      certificates: '🔐',
      government: '🏛️',
      dns: '📡',
      geolocation: '📍'
    };
    return icons[category] || '📊';
  };

  const getCategoryLabel = (category: DataCategory) => {
    const labels: Record<DataCategory, string> = {
      company_info: 'Company Information',
      environmental: 'Environmental Data',
      network_data: 'Network & Peering',
      certificates: 'SSL Certificates',
      government: 'Government Contracts',
      dns: 'DNS Resolution',
      geolocation: 'IP Geolocation'
    };
    return labels[category];
  };

  const handleReset = (providerId: string) => {
    if (confirm('Reset this provider to healthy status?')) {
      resetProvider(providerId);
      updateHealth();
    }
  };

  const categories = Object.keys(health) as DataCategory[];

  return (
    <div className="bg-slate-800/50 rounded-lg border border-slate-700/50 p-4">
      <div className="flex items-center gap-2 mb-4">
        <Zap className="w-5 h-5 text-purple-400" />
        <h3 className="text-lg font-semibold text-white">Multi-Provider Failover Status</h3>
        <button
          onClick={updateHealth}
          className="ml-auto p-1 hover:bg-slate-700/50 rounded transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Category Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-4">
        {categories.map(category => {
          const providers = health[category] || [];
          const healthyCount = providers.filter(p => p.healthStatus === 'healthy').length;
          const totalCount = providers.length;
          
          return (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
              className={`p-3 rounded-lg border transition-all text-left ${
                selectedCategory === category
                  ? 'border-cyan-500 bg-cyan-500/10'
                  : 'border-slate-700 hover:border-slate-600 bg-slate-900/50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{getCategoryIcon(category)}</span>
                <span className="text-sm font-medium text-white truncate">
                  {getCategoryLabel(category)}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                {healthyCount}/{totalCount} healthy
              </div>
            </button>
          );
        })}
      </div>

      {/* Provider Details */}
      {selectedCategory && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-slate-400 border-t border-slate-700/50 pt-3">
            <span className="text-xl">{getCategoryIcon(selectedCategory)}</span>
            <span>{getCategoryLabel(selectedCategory)} Providers</span>
          </div>

          {health[selectedCategory]?.map(provider => (
            <div
              key={provider.id}
              className={`border rounded-lg p-4 ${getHealthColor(provider.healthStatus)}`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  {getHealthIcon(provider.healthStatus)}
                  <div>
                    <div className="font-medium text-white">{provider.name}</div>
                    <div className="text-xs text-slate-400">{provider.baseUrl}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    provider.healthStatus === 'healthy' ? 'bg-green-500/20 text-green-300' :
                    provider.healthStatus === 'degraded' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-red-500/20 text-red-300'
                  }`}>
                    {provider.healthStatus.toUpperCase()}
                  </span>
                  {provider.healthStatus !== 'healthy' && (
                    <button
                      onClick={() => handleReset(provider.id)}
                      className="p-1 hover:bg-slate-700/50 rounded transition-colors"
                      title="Reset to healthy"
                    >
                      <RefreshCw className="w-4 h-4 text-cyan-400" />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-xs text-slate-400 mb-1">Priority</div>
                  <div className="font-mono text-white">#{provider.priority}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Success Rate</div>
                  <div className="font-mono text-white">
                    {(provider.successRate * 100).toFixed(1)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-400 mb-1">Avg Response</div>
                  <div className="font-mono text-white">
                    {Math.round(provider.avgResponseTime)}ms
                  </div>
                </div>
              </div>

              {provider.lastCheck && (
                <div className="mt-2 text-xs text-slate-400">
                  Last checked: {new Date(provider.lastCheck).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Info Panel */}
      <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded text-xs text-purple-300">
        <Zap className="w-3 h-3 inline mr-1" />
        <strong>Automatic Failover:</strong> If primary provider fails, system automatically tries backup providers in priority order. 
        Downed providers auto-recover after 5 minutes.
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <CheckCircle className="w-3 h-3 text-green-400" />
          <span>Healthy (&gt;90%)</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-3 h-3 text-yellow-400" />
          <span>Degraded (50-90%)</span>
        </div>
        <div className="flex items-center gap-2">
          <XCircle className="w-3 h-3 text-red-400" />
          <span>Down (&lt;50%)</span>
        </div>
      </div>
    </div>
  );
};

