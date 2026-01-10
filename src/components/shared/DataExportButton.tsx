/**
 * DataExportButton - Antifragile Data Preservation UI
 * 
 * A simple, safe component that allows users to export their data.
 * Does not modify any existing functionality.
 */

import { useState } from 'react';
import { Download, FileJson, FileSpreadsheet, Database, Check, Loader2, AlertCircle } from 'lucide-react';
import { 
  exportToJSON, 
  exportToCSV, 
  exportStateSummary, 
  exportFullBackup,
  formatFileSize,
  ExportResult 
} from '../../utils/dataExport';
import { Facility } from '../../types';

interface DataExportButtonProps {
  facilities: Facility[];
  variant?: 'button' | 'dropdown' | 'icon';
  className?: string;
}

export function DataExportButton({ 
  facilities, 
  variant = 'dropdown',
  className = '' 
}: DataExportButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [lastResult, setLastResult] = useState<ExportResult | null>(null);

  const handleExport = async (type: 'json' | 'csv' | 'state-summary' | 'full-backup') => {
    setIsExporting(true);
    setLastResult(null);

    let result: ExportResult;

    try {
      switch (type) {
        case 'json':
          result = await exportToJSON(facilities, { includeMetadata: true });
          break;
        case 'csv':
          result = await exportToCSV(facilities);
          break;
        case 'state-summary':
          result = await exportStateSummary(facilities);
          break;
        case 'full-backup':
          result = await exportFullBackup();
          break;
        default:
          result = { success: false, filename: '', recordCount: 0, fileSize: 0, error: 'Unknown export type' };
      }
    } catch (error) {
      result = { 
        success: false, 
        filename: '', 
        recordCount: 0, 
        fileSize: 0, 
        error: error instanceof Error ? error.message : 'Export failed' 
      };
    }

    setLastResult(result);
    setIsExporting(false);
    
    // Auto-close after successful export
    if (result.success) {
      setTimeout(() => setIsOpen(false), 2000);
    }
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={() => handleExport('json')}
        disabled={isExporting || facilities.length === 0}
        className={`p-2 hover:bg-gray-100 rounded-lg transition-colors ${className}`}
        title="Export data"
      >
        {isExporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
      </button>
    );
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={facilities.length === 0}
        className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Download className="w-4 h-4" />
        Export Data
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)} 
          />
          
          {/* Dropdown */}
          <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Export Options</h3>
              <p className="text-xs text-gray-500 mt-1">
                {facilities.length.toLocaleString()} facilities available
              </p>
            </div>

            <div className="p-2 space-y-1">
              {/* JSON Export */}
              <button
                onClick={() => handleExport('json')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <div className="p-2 bg-blue-100 rounded-lg">
                  <FileJson className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">JSON Format</div>
                  <div className="text-xs text-gray-500">Full data with metadata</div>
                </div>
              </button>

              {/* CSV Export */}
              <button
                onClick={() => handleExport('csv')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <div className="p-2 bg-green-100 rounded-lg">
                  <FileSpreadsheet className="w-4 h-4 text-green-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">CSV Spreadsheet</div>
                  <div className="text-xs text-gray-500">Excel/Google Sheets compatible</div>
                </div>
              </button>

              {/* State Summary */}
              <button
                onClick={() => handleExport('state-summary')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors text-left"
              >
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileJson className="w-4 h-4 text-purple-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">State Summary</div>
                  <div className="text-xs text-gray-500">Aggregated by state for reports</div>
                </div>
              </button>

              <div className="border-t border-gray-200 my-2" />

              {/* Full Backup */}
              <button
                onClick={() => handleExport('full-backup')}
                disabled={isExporting}
                className="w-full flex items-center gap-3 p-3 hover:bg-amber-50 rounded-lg transition-colors text-left border border-amber-200"
              >
                <div className="p-2 bg-amber-100 rounded-lg">
                  <Database className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-800">Full Backup</div>
                  <div className="text-xs text-gray-500">All data including AI agents</div>
                </div>
              </button>
            </div>

            {/* Status indicator */}
            {isExporting && (
              <div className="p-3 bg-blue-50 border-t border-blue-200 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span className="text-sm text-blue-700">Exporting...</span>
              </div>
            )}

            {lastResult && (
              <div className={`p-3 border-t flex items-center gap-2 ${
                lastResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                {lastResult.success ? (
                  <>
                    <Check className="w-4 h-4 text-green-600" />
                    <span className="text-sm text-green-700">
                      Exported {lastResult.recordCount.toLocaleString()} records ({formatFileSize(lastResult.fileSize)})
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-700">{lastResult.error}</span>
                  </>
                )}
              </div>
            )}

            <div className="p-2 bg-gray-50 border-t border-gray-200">
              <p className="text-[10px] text-gray-400 text-center">
                🛡️ Data stays on your device • No server upload
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default DataExportButton;
