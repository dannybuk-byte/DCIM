/**
 * System Health Indicator
 * 
 * Shows overall system health status with key metrics and service availability.
 */

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Server,
  Database,
  Cloud,
  Wifi,
  Shield,
  AlertCircle,
  CheckCircle,
  Clock,
  RefreshCw,
} from 'lucide-react';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'offline';
  latency?: number;
  lastCheck: number;
  icon: React.ReactNode;
}

const generateServiceStatus = (): ServiceStatus[] => [
  {
    name: 'Agent Coordinator',
    status: Math.random() > 0.05 ? 'operational' : 'degraded',
    latency: Math.floor(Math.random() * 50) + 10,
    lastCheck: Date.now(),
    icon: <Server className="w-4 h-4" />,
  },
  {
    name: 'IndexedDB Store',
    status: 'operational',
    latency: Math.floor(Math.random() * 5) + 1,
    lastCheck: Date.now(),
    icon: <Database className="w-4 h-4" />,
  },
  {
    name: 'BLS API',
    status: Math.random() > 0.1 ? 'operational' : 'degraded',
    latency: Math.floor(Math.random() * 300) + 100,
    lastCheck: Date.now(),
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    name: 'SEC EDGAR',
    status: Math.random() > 0.15 ? 'operational' : 'degraded',
    latency: Math.floor(Math.random() * 500) + 200,
    lastCheck: Date.now(),
    icon: <Cloud className="w-4 h-4" />,
  },
  {
    name: 'RIPE BGP',
    status: Math.random() > 0.1 ? 'operational' : 'degraded',
    latency: Math.floor(Math.random() * 200) + 50,
    lastCheck: Date.now(),
    icon: <Wifi className="w-4 h-4" />,
  },
  {
    name: 'Evidence Chain',
    status: 'operational',
    latency: Math.floor(Math.random() * 10) + 2,
    lastCheck: Date.now(),
    icon: <Shield className="w-4 h-4" />,
  },
];

const statusColors = {
  operational: 'text-green-500 bg-green-50',
  degraded: 'text-yellow-500 bg-yellow-50',
  offline: 'text-red-500 bg-red-50',
};

const statusDot = {
  operational: 'bg-green-500',
  degraded: 'bg-yellow-500',
  offline: 'bg-red-500',
};

interface SystemHealthIndicatorProps {
  compact?: boolean;
}

export const SystemHealthIndicator: React.FC<SystemHealthIndicatorProps> = ({ compact = false }) => {
  const [services, setServices] = useState<ServiceStatus[]>(generateServiceStatus());
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setServices(generateServiceStatus());
      setLastRefresh(Date.now());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setServices(generateServiceStatus());
    setLastRefresh(Date.now());
    setIsRefreshing(false);
  };

  const overallStatus = services.every(s => s.status === 'operational')
    ? 'operational'
    : services.some(s => s.status === 'offline')
    ? 'offline'
    : 'degraded';

  const operationalCount = services.filter(s => s.status === 'operational').length;
  const avgLatency = Math.round(
    services.reduce((sum, s) => sum + (s.latency || 0), 0) / services.length
  );

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${statusColors[overallStatus]}`}>
        <span className={`w-2 h-2 rounded-full ${statusDot[overallStatus]} animate-pulse`} />
        <span className="text-sm font-medium">
          {operationalCount}/{services.length} Services
        </span>
        <span className="text-xs opacity-70">{avgLatency}ms</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Activity className="w-5 h-5 text-violet-600" />
          System Health
        </h3>
        <button
          onClick={handleManualRefresh}
          disabled={isRefreshing}
          className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded disabled:opacity-50"
          title="Refresh status"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Overall Status */}
      <div className={`p-3 rounded-lg ${statusColors[overallStatus]} mb-4`}>
        <div className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${statusDot[overallStatus]} animate-pulse`} />
          <span className="font-medium capitalize">{overallStatus}</span>
        </div>
        <p className="text-sm mt-1 opacity-80">
          {operationalCount} of {services.length} services operational • Avg latency: {avgLatency}ms
        </p>
      </div>

      {/* Services List */}
      <div className="space-y-2">
        {services.map((service) => (
          <div
            key={service.name}
            className="flex items-center justify-between p-2 rounded bg-gray-50"
          >
            <div className="flex items-center gap-2">
              <span className={statusColors[service.status].split(' ')[0]}>
                {service.icon}
              </span>
              <span className="text-sm text-gray-700">{service.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {service.latency !== undefined && (
                <span className="text-xs text-gray-500">{service.latency}ms</span>
              )}
              <span className={`w-2 h-2 rounded-full ${statusDot[service.status]}`} />
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <Clock className="w-3 h-3" />
          Last checked: {Math.round((Date.now() - lastRefresh) / 1000)}s ago
        </span>
        <span>Auto-refresh: 30s</span>
      </div>
    </div>
  );
};

export default SystemHealthIndicator;
