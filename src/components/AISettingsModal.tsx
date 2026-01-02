import React, { useState, useEffect } from 'react';
import { X, Sparkles, AlertCircle, DollarSign, Key, Check, ExternalLink } from 'lucide-react';
import {
  loadAIConfig,
  saveAIConfig,
  deleteAIConfig,
  getDefaultConfig,
  getAvailableModels,
  validateAPIKey,
  getUsageStats,
  resetUsageStats,
  type AIConfig,
  type UsageStats
} from '../utils/apiKeyManager';

interface AISettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AISettingsModal: React.FC<AISettingsModalProps> = ({ isOpen, onClose }) => {
  const [provider, setProvider] = useState<'openai' | 'anthropic' | 'none'>('none');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usageStats, setUsageStats] = useState<UsageStats | null>(null);

  // Load existing config
  useEffect(() => {
    if (isOpen) {
      const config = loadAIConfig();
      if (config) {
        setProvider(config.provider);
        setApiKey(config.apiKey);
        setModel(config.model);
        setEnabled(config.enabled);
      }
      setUsageStats(getUsageStats());
    }
  }, [isOpen]);

  // Update model when provider changes
  useEffect(() => {
    if (provider !== 'none') {
      const defaults = getDefaultConfig(provider);
      setModel(defaults.model || '');
    }
  }, [provider]);

  const handleSave = () => {
    setError(null);
    setSaveSuccess(false);

    // Validation
    if (provider === 'none') {
      setIsSaving(true);
      setTimeout(() => {
        deleteAIConfig();
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => {
          onClose();
        }, 1000);
      }, 500);
      return;
    }

    if (!apiKey || apiKey.length < 20) {
      setError('Please enter a valid API key');
      return;
    }

    if (!validateAPIKey(provider, apiKey)) {
      setError(
        provider === 'openai' 
          ? 'OpenAI API keys should start with "sk-"'
          : 'Anthropic API keys should start with "sk-ant-"'
      );
      return;
    }

    if (!model) {
      setError('Please select a model');
      return;
    }

    // Save
    setIsSaving(true);
    setTimeout(() => {
      const config: AIConfig = {
        provider,
        apiKey,
        model,
        enabled
      };
      saveAIConfig(config);
      setIsSaving(false);
      setSaveSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1000);
    }, 500);
  };

  const handleReset = () => {
    if (confirm('Reset usage statistics? This will clear your query count and cost tracking.')) {
      resetUsageStats();
      setUsageStats(getUsageStats());
    }
  };

  if (!isOpen) return null;

  const availableModels = provider !== 'none' ? getAvailableModels(provider) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0d1219] border border-[#00d2d3]/30 rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#00d2d3]/20">
          <div className="flex items-center gap-3">
            <Sparkles size={24} className="text-[#00d2d3]" />
            <h2 className="text-xl font-bold text-white">AI Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-[#00d2d3]/10 border border-[#00d2d3]/20 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle size={20} className="text-[#00d2d3] mt-0.5 flex-shrink-0" />
              <div className="text-sm text-gray-300 space-y-2">
                <p className="font-semibold text-white">AI Features are Optional</p>
                <p>
                  The dashboard works without AI. Providing your own API key enables:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Natural language search ("Show me non-compliant facilities in Texas")</li>
                  <li>AI-generated facility summaries</li>
                  <li>Advanced investigation assistance</li>
                </ul>
                <p className="text-xs text-gray-400 mt-2">
                  Your API key is stored locally in your browser. It never leaves your device 
                  except to call the AI provider you choose.
                </p>
              </div>
            </div>
          </div>

          {/* Usage Statistics */}
          {usageStats && usageStats.queries > 0 && (
            <div className="p-4 bg-[#ffa502]/10 border border-[#ffa502]/20 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign size={18} className="text-[#ffa502]" />
                  <span className="text-sm font-semibold text-white">Usage This Month</span>
                </div>
                <button
                  onClick={handleReset}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  Reset
                </button>
              </div>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-[#00d2d3]">
                    {usageStats.queries}
                  </div>
                  <div className="text-xs text-gray-400">Queries</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#ffa502]">
                    {'$'}{usageStats.estimatedCost.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Est. Cost</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-[#2ed573]">
                    {'$'}{(10 - usageStats.estimatedCost).toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-400">Until Warning</div>
                </div>
              </div>
            </div>
          )}

          {/* Provider Selection */}
          <div>
            <label className="block text-sm font-semibold text-white mb-2">
              AI Provider
            </label>
            <div className="grid grid-cols-3 gap-3">
              <button
                onClick={() => setProvider('none')}
                className={`p-4 border rounded-lg transition-all ${
                  provider === 'none'
                    ? 'bg-[#00d2d3]/20 border-[#00d2d3]'
                    : 'bg-[#0a0e17] border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-semibold text-white mb-1">None</div>
                <div className="text-xs text-gray-400">No AI features</div>
              </button>
              <button
                onClick={() => setProvider('openai')}
                className={`p-4 border rounded-lg transition-all ${
                  provider === 'openai'
                    ? 'bg-[#00d2d3]/20 border-[#00d2d3]'
                    : 'bg-[#0a0e17] border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-semibold text-white mb-1">OpenAI</div>
                <div className="text-xs text-gray-400">GPT-4 Turbo</div>
              </button>
              <button
                onClick={() => setProvider('anthropic')}
                className={`p-4 border rounded-lg transition-all ${
                  provider === 'anthropic'
                    ? 'bg-[#00d2d3]/20 border-[#00d2d3]'
                    : 'bg-[#0a0e17] border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="text-sm font-semibold text-white mb-1">Anthropic</div>
                <div className="text-xs text-gray-400">Claude 3.5</div>
              </button>
            </div>
          </div>

          {provider !== 'none' && (
            <>
              {/* API Key Input */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder={
                      provider === 'openai' 
                        ? 'sk-...'
                        : 'sk-ant-...'
                    }
                    className="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-lg 
                               text-white placeholder-gray-500 focus:border-[#00d2d3] 
                               focus:outline-none transition-colors pr-24"
                  />
                  <button
                    onClick={() => setShowKey(!showKey)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 text-xs
                               text-gray-400 hover:text-white transition-colors"
                  >
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <div className="mt-2 flex items-start gap-2">
                  <Key size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
                  <a
                    href={
                      provider === 'openai'
                        ? 'https://platform.openai.com/api-keys'
                        : 'https://console.anthropic.com/settings/keys'
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[#00d2d3] hover:underline flex items-center gap-1"
                  >
                    Get an API key from {provider === 'openai' ? 'OpenAI' : 'Anthropic'}
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>

              {/* Model Selection */}
              <div>
                <label className="block text-sm font-semibold text-white mb-2">
                  Model
                </label>
                <select
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0a0e17] border border-gray-700 rounded-lg 
                             text-white focus:border-[#00d2d3] focus:outline-none transition-colors"
                >
                  {availableModels.map(m => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-gray-400">
                  {provider === 'openai' && 'GPT-4 Turbo recommended for best quality (~$0.01/query)'}
                  {provider === 'anthropic' && 'Claude 3.5 Sonnet recommended for best quality (~$0.015/query)'}
                </p>
              </div>

              {/* Enable Toggle */}
              <div className="flex items-center justify-between p-4 bg-[#0a0e17] rounded-lg">
                <div>
                  <div className="text-sm font-semibold text-white">Enable AI Features</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Turn AI on/off without deleting your API key
                  </div>
                </div>
                <button
                  onClick={() => setEnabled(!enabled)}
                  className={`relative w-14 h-7 rounded-full transition-colors ${
                    enabled ? 'bg-[#2ed573]' : 'bg-gray-600'
                  }`}
                >
                  <div
                    className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform ${
                      enabled ? 'translate-x-7' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </>
          )}

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-[#ff4757]/10 border border-[#ff4757]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="text-[#ff4757] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#ff4757]">{error}</p>
              </div>
            </div>
          )}

          {/* Success Message */}
          {saveSuccess && (
            <div className="p-3 bg-[#2ed573]/10 border border-[#2ed573]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <Check size={16} className="text-[#2ed573] mt-0.5 flex-shrink-0" />
                <p className="text-sm text-[#2ed573]">Settings saved successfully!</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-[#00d2d3]/20">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-[#00d2d3] hover:bg-[#00d2d3]/80 text-[#0a0e17] 
                       font-semibold rounded-lg transition-colors disabled:opacity-50
                       disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-4 h-4 border-2 border-[#0a0e17]/30 border-t-[#0a0e17] 
                                rounded-full animate-spin" />
                Saving...
              </>
            ) : (
              'Save Settings'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

