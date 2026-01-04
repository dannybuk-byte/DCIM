/**
 * Settings Panel - Comprehensive configuration UI for DCIM Command Center
 * 
 * Manages:
 * - Webhook configurations (Slack, Discord, Teams)
 * - Mapbox integration settings
 * - Export preferences
 * - Display preferences
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Settings, X, Bell, MapPin, Download, Eye, Plus, Trash2,
  Check, AlertTriangle, ExternalLink, TestTube, ChevronDown,
  ChevronRight, Globe, Webhook, FileDown, Palette, Keyboard, Database, Activity, Zap
} from 'lucide-react';
import { 
  getWebhooks, addWebhook, updateWebhook, deleteWebhook, testWebhook,
  type WebhookConfig, type WebhookProvider, type AlertEventType
} from '../../services/WebhookAlerts';
import { getSettings, saveSettings, settingsKey } from '../../utils/settingsPersistence';
import { DatabaseHealthMonitor } from '../DatabaseHealthMonitor';
import { SystemHealthDashboard } from '../SystemHealthDashboard';
import {
  getOrganizerProfile,
  resetOrganizerProfile,
  saveOrganizerProfile,
  type OrganizerProfile,
} from '../../ai/organizerProfile';
import { DensityToggle } from './DensityToggle';
import { FeatureFlagsPanel } from './FeatureFlagsPanel';

const COLORS = {
  bg: '#0a0e17',
  bgCard: '#0d1219',
  bgHover: '#141b24',
  text: '#e8eef6',
  textMuted: '#5a6d8a',
  border: '#1e293b',
  cyan: '#00d2d3',
  green: '#2ed573',
  red: '#ff4757',
  yellow: '#ffa502',
  purple: '#a855f7',
};

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

type SettingsTab =
  | 'webhooks'
  | 'mapbox'
  | 'export'
  | 'display'
  | 'personalization'
  | 'shortcuts'
  | 'database'
  | 'health'
  | 'experimental';

interface MapboxSettings {
  accessToken: string;
  enableGeocode: boolean;
  enableIsochrones: boolean;
  enableDirections: boolean;
}

interface ExportSettings {
  defaultFormat: 'pdf' | 'csv' | 'json';
  includePatternLab: boolean;
  includeCharts: boolean;
  maxFacilities: number;
}

interface DisplaySettings {
  theme: 'dark' | 'light' | 'system';
  compactMode: boolean;
  animationsEnabled: boolean;
  showTooltips: boolean;
  defaultTab: string;
  enhancedScrolling: boolean;
}

const DEFAULT_MAPBOX: MapboxSettings = {
  accessToken: '',
  enableGeocode: true,
  enableIsochrones: false,
  enableDirections: false,
};

const DEFAULT_EXPORT: ExportSettings = {
  defaultFormat: 'pdf',
  includePatternLab: true,
  includeCharts: true,
  maxFacilities: 100,
};

const DEFAULT_DISPLAY: DisplaySettings = {
  theme: 'dark',
  compactMode: true,
  animationsEnabled: true,
  showTooltips: true,
  defaultTab: 'Overview',
  enhancedScrolling: false,
};

const WEBHOOK_PROVIDERS: { id: WebhookProvider; name: string; icon: string }[] = [
  { id: 'slack', name: 'Slack', icon: '💬' },
  { id: 'discord', name: 'Discord', icon: '🎮' },
  { id: 'teams', name: 'Microsoft Teams', icon: '👥' },
  { id: 'custom', name: 'Custom Webhook', icon: '🔗' },
];

const ALERT_EVENTS: { id: AlertEventType; name: string; description: string }[] = [
  { id: 'new_non_compliant', name: 'New Non-Compliant', description: 'When a facility becomes non-compliant' },
  { id: 'high_severity_finding', name: 'High Severity Finding', description: 'Pattern Lab detects critical issues' },
  { id: 'subsidy_gap_threshold', name: 'Subsidy Gap Alert', description: 'Gap exceeds threshold ($1M default)' },
  { id: 'audit_overdue', name: 'Audit Overdue', description: 'Facility audit is past due date' },
  { id: 'pattern_detected', name: 'Pattern Detected', description: 'New pattern identified' },
  { id: 'daily_summary', name: 'Daily Summary', description: 'Daily compliance digest' },
];

export function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>('webhooks');
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [mapboxSettings, setMapboxSettings] = useState<MapboxSettings>(DEFAULT_MAPBOX);
  const [exportSettings, setExportSettings] = useState<ExportSettings>(DEFAULT_EXPORT);
  const [displaySettings, setDisplaySettings] = useState<DisplaySettings>(DEFAULT_DISPLAY);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile>({
    dataSensitivity: 'high',
    shareWithExternalAI: false,
    tone: 'strategic',
    updatedAt: new Date().toISOString(),
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{ id: string; success: boolean; message: string } | null>(null);
  
  // New webhook form state
  const [showAddWebhook, setShowAddWebhook] = useState(false);
  const [newWebhook, setNewWebhook] = useState({
    name: '',
    provider: 'slack' as WebhookProvider,
    url: '',
    events: ['new_non_compliant', 'high_severity_finding'] as AlertEventType[],
  });

  // Load settings
  useEffect(() => {
    async function load() {
      try {
        const [wh, mapbox, exp, disp, profile] = await Promise.all([
          getWebhooks(),
          getSettings<MapboxSettings>(settingsKey('mapbox')),
          getSettings<ExportSettings>(settingsKey('export')),
          getSettings<DisplaySettings>(settingsKey('display')),
          getOrganizerProfile(),
        ]);
        setWebhooks(wh);
        if (mapbox) setMapboxSettings({ ...DEFAULT_MAPBOX, ...mapbox });
        if (exp) setExportSettings({ ...DEFAULT_EXPORT, ...exp });
        if (disp) setDisplaySettings({ ...DEFAULT_DISPLAY, ...disp });
        if (profile) setOrganizerProfile(profile);
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setLoading(false);
      }
    }
    if (isOpen) load();
  }, [isOpen]);

  const saveProfile = useCallback(async (profile: OrganizerProfile) => {
    setSaving(true);
    try {
      await saveOrganizerProfile(profile);
      setOrganizerProfile(profile);
    } finally {
      setSaving(false);
    }
  }, []);

  // Save mapbox settings
  const saveMapbox = useCallback(async (settings: MapboxSettings) => {
    setSaving(true);
    try {
      await saveSettings(settingsKey('mapbox'), settings);
      setMapboxSettings(settings);
    } finally {
      setSaving(false);
    }
  }, []);

  // Save export settings
  const saveExport = useCallback(async (settings: ExportSettings) => {
    setSaving(true);
    try {
      await saveSettings(settingsKey('export'), settings);
      setExportSettings(settings);
    } finally {
      setSaving(false);
    }
  }, []);

  // Save display settings
  const saveDisplay = useCallback(async (settings: DisplaySettings) => {
    setSaving(true);
    try {
      await saveSettings(settingsKey('display'), settings);
      setDisplaySettings(settings);
    } finally {
      setSaving(false);
    }
  }, []);

  // Add new webhook
  const handleAddWebhook = async () => {
    if (!newWebhook.name || !newWebhook.url) return;
    
    setSaving(true);
    try {
      const webhook = await addWebhook({
        name: newWebhook.name,
        provider: newWebhook.provider,
        url: newWebhook.url,
        enabled: true,
        events: newWebhook.events,
      });
      setWebhooks([...webhooks, webhook]);
      setShowAddWebhook(false);
      setNewWebhook({
        name: '',
        provider: 'slack',
        url: '',
        events: ['new_non_compliant', 'high_severity_finding'],
      });
    } finally {
      setSaving(false);
    }
  };

  // Delete webhook
  const handleDeleteWebhook = async (id: string) => {
    setSaving(true);
    try {
      await deleteWebhook(id);
      setWebhooks(webhooks.filter(w => w.id !== id));
    } finally {
      setSaving(false);
    }
  };

  // Toggle webhook
  const handleToggleWebhook = async (id: string) => {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    
    const updated = await updateWebhook(id, { enabled: !webhook.enabled });
    if (updated) {
      setWebhooks(webhooks.map(w => w.id === id ? updated : w));
    }
  };

  // Test webhook
  const handleTestWebhook = async (id: string) => {
    setTestingWebhook(id);
    setTestResult(null);
    
    try {
      const result = await testWebhook(id);
      setTestResult({
        id,
        success: result.success,
        message: result.success ? 'Test message sent successfully!' : (result.error || 'Unknown error'),
      });
    } catch (error: any) {
      setTestResult({
        id,
        success: false,
        message: error.message || 'Failed to send test',
      });
    } finally {
      setTestingWebhook(null);
    }
  };

  if (!isOpen) return null;

  const tabs: { id: SettingsTab; label: string; icon: typeof Settings }[] = [
    { id: 'health', label: 'Health', icon: Activity },
    { id: 'experimental', label: 'Experimental', icon: Zap },
    { id: 'webhooks', label: 'Webhooks', icon: Bell },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'mapbox', label: 'Mapbox', icon: MapPin },
    { id: 'export', label: 'Export', icon: Download },
    { id: 'display', label: 'Display', icon: Eye },
    { id: 'personalization', label: 'Personalization', icon: Palette },
    { id: 'shortcuts', label: 'Shortcuts', icon: Keyboard },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      
      <div 
        className="relative w-full max-w-4xl h-[80vh] mx-4 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden flex"
        onClick={e => e.stopPropagation()}
      >
        {/* Sidebar */}
        <div className="w-48 bg-gray-950 border-r border-gray-800 p-3 flex flex-col">
          <div className="flex items-center gap-2 px-3 py-2 mb-4">
            <Settings className="w-5 h-5 text-cyan-400" />
            <span className="font-semibold text-white">Settings</span>
          </div>
          
          <nav className="flex-1 space-y-1">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
                    ${activeTab === tab.id 
                      ? 'bg-cyan-500/20 text-cyan-400' 
                      : 'text-gray-400 hover:bg-gray-800 hover:text-white'}
                  `}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>

          <div className="pt-4 border-t border-gray-800">
            <div className="text-[10px] text-gray-600 px-3 py-1">
              Cursor Pro Plus Active
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
            <h2 className="text-lg font-semibold text-white">
              {tabs.find(t => t.id === activeTab)?.label}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full" />
              </div>
            ) : (
              <>
                {/* Webhooks Tab */}
                {activeTab === 'webhooks' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-400">
                      Configure webhooks to receive real-time alerts in Slack, Discord, Teams, or custom endpoints.
                    </p>

                    {/* Existing webhooks */}
                    {webhooks.length > 0 && (
                      <div className="space-y-3">
                        {webhooks.map(webhook => (
                          <div 
                            key={webhook.id}
                            className="bg-gray-800 rounded-lg p-4 border border-gray-700"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-3">
                                <span className="text-xl">
                                  {WEBHOOK_PROVIDERS.find(p => p.id === webhook.provider)?.icon}
                                </span>
                                <div>
                                  <div className="font-medium text-white">{webhook.name}</div>
                                  <div className="text-xs text-gray-500">{webhook.provider}</div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleToggleWebhook(webhook.id)}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                                    webhook.enabled 
                                      ? 'bg-green-500/20 text-green-400' 
                                      : 'bg-gray-700 text-gray-400'
                                  }`}
                                >
                                  {webhook.enabled ? 'Enabled' : 'Disabled'}
                                </button>
                                <button
                                  onClick={() => handleTestWebhook(webhook.id)}
                                  disabled={testingWebhook === webhook.id}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Test webhook"
                                >
                                  {testingWebhook === webhook.id ? (
                                    <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
                                  ) : (
                                    <TestTube className="w-4 h-4 text-cyan-400" />
                                  )}
                                </button>
                                <button
                                  onClick={() => handleDeleteWebhook(webhook.id)}
                                  className="p-1.5 hover:bg-gray-700 rounded transition-colors"
                                  title="Delete webhook"
                                >
                                  <Trash2 className="w-4 h-4 text-red-400" />
                                </button>
                              </div>
                            </div>
                            
                            {testResult?.id === webhook.id && (
                              <div className={`text-xs p-2 rounded mb-3 ${
                                testResult.success 
                                  ? 'bg-green-500/20 text-green-400' 
                                  : 'bg-red-500/20 text-red-400'
                              }`}>
                                {testResult.message}
                              </div>
                            )}

                            <div className="flex flex-wrap gap-1.5">
                              {webhook.events.map(event => (
                                <span 
                                  key={event}
                                  className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded"
                                >
                                  {ALERT_EVENTS.find(e => e.id === event)?.name || event}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add webhook form */}
                    {showAddWebhook ? (
                      <div className="bg-gray-800 rounded-lg p-4 border border-cyan-500/30">
                        <div className="text-sm font-medium text-white mb-4">Add New Webhook</div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Name</label>
                            <input
                              type="text"
                              value={newWebhook.name}
                              onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })}
                              placeholder="e.g., Team Alerts"
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">Provider</label>
                            <select
                              value={newWebhook.provider}
                              onChange={e => setNewWebhook({ ...newWebhook, provider: e.target.value as WebhookProvider })}
                              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                            >
                              {WEBHOOK_PROVIDERS.map(p => (
                                <option key={p.id} value={p.id}>{p.icon} {p.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="mb-4">
                          <label className="block text-xs text-gray-400 mb-1">Webhook URL</label>
                          <input
                            type="url"
                            value={newWebhook.url}
                            onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })}
                            placeholder="https://hooks.slack.com/services/..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div className="mb-4">
                          <label className="block text-xs text-gray-400 mb-2">Alert Events</label>
                          <div className="grid grid-cols-2 gap-2">
                            {ALERT_EVENTS.map(event => (
                              <label 
                                key={event.id}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                <input
                                  type="checkbox"
                                  checked={newWebhook.events.includes(event.id)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setNewWebhook({ ...newWebhook, events: [...newWebhook.events, event.id] });
                                    } else {
                                      setNewWebhook({ ...newWebhook, events: newWebhook.events.filter(ev => ev !== event.id) });
                                    }
                                  }}
                                  className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-cyan-500 focus:ring-cyan-500"
                                />
                                <span className="text-sm text-gray-300">{event.name}</span>
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={handleAddWebhook}
                            disabled={!newWebhook.name || !newWebhook.url || saving}
                            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 disabled:text-gray-500 text-white text-sm rounded transition-colors"
                          >
                            {saving ? 'Adding...' : 'Add Webhook'}
                          </button>
                          <button
                            onClick={() => setShowAddWebhook(false)}
                            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm rounded transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => setShowAddWebhook(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                        Add Webhook
                      </button>
                    )}
                  </div>
                )}

                {/* Mapbox Tab */}
                {activeTab === 'mapbox' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-400">
                      Configure Mapbox integration for enhanced geocoding, isochrones, and directions.
                      MapLibre GL JS is used by default (no token required for basic maps).
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        Mapbox Access Token (Optional)
                      </label>
                      <input
                        type="password"
                        value={mapboxSettings.accessToken}
                        onChange={e => setMapboxSettings({ ...mapboxSettings, accessToken: e.target.value })}
                        placeholder="pk.xxxxx..."
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Get a free token at{' '}
                        <a href="https://account.mapbox.com/access-tokens/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                          mapbox.com <ExternalLink className="w-3 h-3 inline" />
                        </a>
                      </p>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mapboxSettings.enableGeocode}
                          onChange={e => {
                            const updated = { ...mapboxSettings, enableGeocode: e.target.checked };
                            setMapboxSettings(updated);
                            saveMapbox(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Enable Geocoding</div>
                          <div className="text-xs text-gray-500">Search for addresses and places (falls back to Nominatim)</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mapboxSettings.enableIsochrones}
                          onChange={e => {
                            const updated = { ...mapboxSettings, enableIsochrones: e.target.checked };
                            setMapboxSettings(updated);
                            saveMapbox(updated);
                          }}
                          disabled={!mapboxSettings.accessToken}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
                        />
                        <div>
                          <div className={`text-sm ${mapboxSettings.accessToken ? 'text-white' : 'text-gray-500'}`}>Enable Isochrones</div>
                          <div className="text-xs text-gray-500">Show travel time polygons (requires token)</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={mapboxSettings.enableDirections}
                          onChange={e => {
                            const updated = { ...mapboxSettings, enableDirections: e.target.checked };
                            setMapboxSettings(updated);
                            saveMapbox(updated);
                          }}
                          disabled={!mapboxSettings.accessToken}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500 disabled:opacity-50"
                        />
                        <div>
                          <div className={`text-sm ${mapboxSettings.accessToken ? 'text-white' : 'text-gray-500'}`}>Enable Directions</div>
                          <div className="text-xs text-gray-500">Route planning between facilities (requires token)</div>
                        </div>
                      </label>
                    </div>

                    <button
                      onClick={() => saveMapbox(mapboxSettings)}
                      disabled={saving}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-gray-700 text-white text-sm rounded transition-colors"
                    >
                      {saving ? 'Saving...' : 'Save Mapbox Settings'}
                    </button>
                  </div>
                )}

                {/* Export Tab */}
                {activeTab === 'export' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-400">
                      Configure default export options for compliance reports.
                    </p>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Default Format</label>
                      <select
                        value={exportSettings.defaultFormat}
                        onChange={e => {
                          const updated = { ...exportSettings, defaultFormat: e.target.value as 'pdf' | 'csv' | 'json' };
                          setExportSettings(updated);
                          saveExport(updated);
                        }}
                        className="w-full max-w-xs px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="pdf">PDF Report</option>
                        <option value="csv">CSV Spreadsheet</option>
                        <option value="json">JSON Data</option>
                      </select>
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportSettings.includePatternLab}
                          onChange={e => {
                            const updated = { ...exportSettings, includePatternLab: e.target.checked };
                            setExportSettings(updated);
                            saveExport(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Include Pattern Lab Findings</div>
                          <div className="text-xs text-gray-500">Add pattern analysis results to reports</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={exportSettings.includeCharts}
                          onChange={e => {
                            const updated = { ...exportSettings, includeCharts: e.target.checked };
                            setExportSettings(updated);
                            saveExport(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Include Charts</div>
                          <div className="text-xs text-gray-500">Embed visualizations in PDF reports</div>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Max Facilities in Report</label>
                      <input
                        type="number"
                        value={exportSettings.maxFacilities}
                        onChange={e => {
                          const updated = { ...exportSettings, maxFacilities: parseInt(e.target.value) || 100 };
                          setExportSettings(updated);
                          saveExport(updated);
                        }}
                        min={10}
                        max={1000}
                        className="w-32 px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                      />
                    </div>
                  </div>
                )}

                {/* Display Tab */}
                {activeTab === 'display' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-400">
                      Customize the appearance and behavior of the dashboard.
                    </p>

                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySettings.enhancedScrolling}
                          onChange={e => {
                            const updated = { ...displaySettings, enhancedScrolling: e.target.checked };
                            setDisplaySettings(updated);
                            saveDisplay(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Enhanced Scrolling (Click-to-scroll)</div>
                          <div className="text-xs text-gray-500">
                            Off by default for performance. Enables click-to-focus + keyboard scrolling on long panels.
                          </div>
                        </div>
                      </label>

                      {/* UI Density Selector */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-white mb-2">UI Density</label>
                        <p className="text-xs text-gray-500 mb-2">Controls spacing, font sizes, and row heights across all drill-down views</p>
                        <DensityToggle showLabel={false} />
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySettings.compactMode}
                          onChange={e => {
                            const updated = { ...displaySettings, compactMode: e.target.checked };
                            setDisplaySettings(updated);
                            saveDisplay(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Compact Mode (Legacy)</div>
                          <div className="text-xs text-gray-500">Older toggle – use UI Density above for more control</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySettings.animationsEnabled}
                          onChange={e => {
                            const updated = { ...displaySettings, animationsEnabled: e.target.checked };
                            setDisplaySettings(updated);
                            saveDisplay(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Enable Animations</div>
                          <div className="text-xs text-gray-500">Smooth transitions and animated counters</div>
                        </div>
                      </label>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={displaySettings.showTooltips}
                          onChange={e => {
                            const updated = { ...displaySettings, showTooltips: e.target.checked };
                            setDisplaySettings(updated);
                            saveDisplay(updated);
                          }}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                        />
                        <div>
                          <div className="text-sm text-white">Show Tooltips</div>
                          <div className="text-xs text-gray-500">Display helpful hints on hover</div>
                        </div>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Default Tab</label>
                      <select
                        value={displaySettings.defaultTab}
                        onChange={e => {
                          const updated = { ...displaySettings, defaultTab: e.target.value };
                          setDisplaySettings(updated);
                          saveDisplay(updated);
                        }}
                        className="w-full max-w-xs px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                      >
                        <option value="Guides">Guides</option>
                        <option value="Overview">Overview</option>
                        <option value="Pattern Lab">Pattern Lab</option>
                        <option value="Network Security">Network Security</option>
                        <option value="Connectography">Connectography</option>
                      </select>
                    </div>
                  </div>
                )}

                {/* Personalization Tab */}
                {activeTab === 'personalization' && (
                  <div className="space-y-6">
                    <p className="text-sm text-gray-400">
                      Personalize AI responses for your organizing context. Stored locally in IndexedDB. By default,
                      this profile is <span className="text-white font-semibold">not</span> sent to external AI.
                    </p>

                    <div className="bg-gray-800 rounded-lg p-4 border border-gray-700 space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Organization</label>
                          <input
                            type="text"
                            value={organizerProfile.organization || ''}
                            onChange={e =>
                              setOrganizerProfile(prev => ({ ...prev, organization: e.target.value }))
                            }
                            placeholder="e.g., CODE-CWA, Tech Workers Coalition..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Role</label>
                          <input
                            type="text"
                            value={organizerProfile.role || ''}
                            onChange={e => setOrganizerProfile(prev => ({ ...prev, role: e.target.value }))}
                            placeholder="e.g., organizer, researcher, volunteer..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Region</label>
                          <input
                            type="text"
                            value={organizerProfile.region || ''}
                            onChange={e => setOrganizerProfile(prev => ({ ...prev, region: e.target.value }))}
                            placeholder="e.g., Bay Area, Northern Virginia, Phoenix..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Tone</label>
                          <select
                            value={organizerProfile.tone || 'strategic'}
                            onChange={e =>
                              setOrganizerProfile(prev => ({
                                ...prev,
                                tone: e.target.value as OrganizerProfile['tone'],
                              }))
                            }
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="strategic">Strategic</option>
                            <option value="direct">Direct</option>
                            <option value="narrative">Narrative</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Campaigns / objectives</label>
                          <textarea
                            value={organizerProfile.campaigns || ''}
                            onChange={e =>
                              setOrganizerProfile(prev => ({ ...prev, campaigns: e.target.value }))
                            }
                            placeholder="What are you trying to win? What’s the current campaign goal?"
                            rows={3}
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Target companies</label>
                          <input
                            type="text"
                            value={organizerProfile.targetCompanies || ''}
                            onChange={e =>
                              setOrganizerProfile(prev => ({ ...prev, targetCompanies: e.target.value }))
                            }
                            placeholder='e.g., Amazon, Google, Microsoft (comma-separated)'
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Preferred outputs</label>
                          <input
                            type="text"
                            value={organizerProfile.preferredOutputs || ''}
                            onChange={e =>
                              setOrganizerProfile(prev => ({ ...prev, preferredOutputs: e.target.value }))
                            }
                            placeholder="e.g., talking points, one-pagers, FOIA templates, bargaining evidence..."
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-gray-700">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">Data sensitivity</label>
                          <select
                            value={organizerProfile.dataSensitivity}
                            onChange={e =>
                              setOrganizerProfile(prev => ({
                                ...prev,
                                dataSensitivity: e.target.value as OrganizerProfile['dataSensitivity'],
                              }))
                            }
                            className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded text-white text-sm focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="high">High (organizing-sensitive)</option>
                            <option value="medium">Medium</option>
                            <option value="low">Low</option>
                          </select>
                          <p className="text-[11px] text-gray-500 mt-1">
                            Used only for labeling; you control whether external AI can see this profile.
                          </p>
                        </div>

                        <label className="flex items-start gap-3 cursor-pointer bg-gray-900/40 border border-gray-700 rounded p-3">
                          <input
                            type="checkbox"
                            checked={organizerProfile.shareWithExternalAI}
                            onChange={e =>
                              setOrganizerProfile(prev => ({
                                ...prev,
                                shareWithExternalAI: e.target.checked,
                              }))
                            }
                            className="w-4 h-4 mt-1 rounded border-gray-600 bg-gray-800 text-cyan-500 focus:ring-cyan-500"
                          />
                          <div>
                            <div className="text-sm text-white">Allow sending this profile to external AI</div>
                            <div className="text-xs text-gray-500">
                              If disabled, the profile is only used for local AI (Ollama/Anyway). Safer default.
                            </div>
                          </div>
                        </label>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={async () => {
                            if (!confirm('Reset personalization profile? This will delete it from IndexedDB.')) return;
                            setSaving(true);
                            try {
                              await resetOrganizerProfile();
                              setOrganizerProfile({
                                dataSensitivity: 'high',
                                shareWithExternalAI: false,
                                tone: 'strategic',
                                updatedAt: new Date().toISOString(),
                              });
                            } finally {
                              setSaving(false);
                            }
                          }}
                          className="px-3 py-2 text-sm text-red-300 hover:text-red-200 hover:bg-red-500/10 rounded transition-colors"
                        >
                          Reset
                        </button>
                        <button
                          onClick={() =>
                            saveProfile({
                              ...organizerProfile,
                              updatedAt: new Date().toISOString(),
                            })
                          }
                          disabled={saving}
                          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-semibold text-black transition-colors"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Shortcuts Tab */}
                {activeTab === 'shortcuts' && (
                  <div className="space-y-4">
                    <p className="text-sm text-gray-400 mb-4">
                      Keyboard shortcuts for power users.
                    </p>

                    <div className="bg-gray-800 rounded-lg overflow-hidden">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-700">
                            <th className="text-left px-4 py-2 text-gray-400 font-medium">Action</th>
                            <th className="text-right px-4 py-2 text-gray-400 font-medium">Shortcut</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { action: 'Open Command Palette', shortcut: '⌘ K' },
                            { action: 'Quick Search', shortcut: '/' },
                            { action: 'Go to Overview', shortcut: '1' },
                            { action: 'Go to Pattern Lab', shortcut: '2' },
                            { action: 'Go to Network Security', shortcut: '3' },
                            { action: 'Go to Connectography', shortcut: '4' },
                            { action: 'Toggle Fullscreen Map', shortcut: 'F' },
                            { action: 'Export Report', shortcut: '⌘ E' },
                            { action: 'Open Settings', shortcut: '⌘ ,' },
                            { action: 'Close Modal', shortcut: 'Escape' },
                            { action: 'Navigate Tabs', shortcut: '← →' },
                            { action: 'Scroll Results', shortcut: '↑ ↓' },
                          ].map((item, i) => (
                            <tr key={i} className="border-b border-gray-700/50">
                              <td className="px-4 py-2 text-white">{item.action}</td>
                              <td className="px-4 py-2 text-right">
                                <kbd className="px-2 py-1 bg-gray-700 rounded text-xs text-cyan-400 font-mono">
                                  {item.shortcut}
                                </kbd>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Database Tab */}
                {activeTab === 'database' && (
                  <DatabaseHealthMonitor />
                )}

                {/* Health Tab */}
                {activeTab === 'health' && (
                  <SystemHealthDashboard />
                )}

                {/* Experimental Features Tab */}
                {activeTab === 'experimental' && (
                  <FeatureFlagsPanel />
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;

