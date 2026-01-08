/**
 * DataImportButton - Antifragile Data Restoration UI
 * 
 * Provides UI for importing backup files:
 * - File picker with validation preview
 * - Import mode selection (merge vs replace)
 * - Progress and status feedback
 * - Error handling with clear messages
 * 
 * ANTIFRAGILE: Validates before importing, never corrupts existing data
 */

import { useState, useCallback } from 'react';
import { 
  Upload, FileJson, Check, Loader2, AlertCircle, 
  AlertTriangle, Info, RefreshCw, X
} from 'lucide-react';
import { 
  validateImportFile, 
  importFacilities, 
  openFilePicker,
  ImportValidation,
  ImportResult,
  ImportOptions
} from '../../utils/dataImport';

// ============================================================================
// TYPES
// ============================================================================

interface DataImportButtonProps {
  onImportComplete?: () => void;
  className?: string;
}

type ImportState = 
  | { stage: 'idle' }
  | { stage: 'validating'; file: File }
  | { stage: 'preview'; file: File; validation: ImportValidation }
  | { stage: 'importing'; file: File; options: ImportOptions }
  | { stage: 'complete'; result: ImportResult }
  | { stage: 'error'; message: string };

// ============================================================================
// COMPONENT
// ============================================================================

export function DataImportButton({ 
  onImportComplete,
  className = '' 
}: DataImportButtonProps) {
  const [state, setState] = useState<ImportState>({ stage: 'idle' });
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [showModal, setShowModal] = useState(false);

  const handleSelectFile = useCallback(async () => {
    const file = await openFilePicker();
    if (!file) return;

    setState({ stage: 'validating', file });
    setShowModal(true);

    try {
      const validation = await validateImportFile(file);
      setState({ stage: 'preview', file, validation });
    } catch (error) {
      setState({ 
        stage: 'error', 
        message: error instanceof Error ? error.message : 'Validation failed' 
      });
    }
  }, []);

  const handleImport = useCallback(async () => {
    if (state.stage !== 'preview') return;

    const { file } = state;
    const options: ImportOptions = { mode: importMode };

    setState({ stage: 'importing', file, options });

    try {
      const result = await importFacilities(file, options);
      setState({ stage: 'complete', result });
      
      if (result.success && onImportComplete) {
        // Delay callback to let user see success message
        setTimeout(onImportComplete, 1500);
      }
    } catch (error) {
      setState({ 
        stage: 'error', 
        message: error instanceof Error ? error.message : 'Import failed' 
      });
    }
  }, [state, importMode, onImportComplete]);

  const handleClose = useCallback(() => {
    setShowModal(false);
    setState({ stage: 'idle' });
  }, []);

  const handleReset = useCallback(() => {
    setState({ stage: 'idle' });
  }, []);

  return (
    <>
      {/* Trigger Button */}
      <button
        onClick={handleSelectFile}
        className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${className}`}
      >
        <Upload size={16} />
        Import Data
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-800">Import Data</h3>
              </div>
              <button 
                onClick={handleClose}
                className="p-1 hover:bg-gray-200 rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Validating */}
              {state.stage === 'validating' && (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600">Validating file...</p>
                  <p className="text-sm text-gray-400 mt-1">{state.file.name}</p>
                </div>
              )}

              {/* Preview */}
              {state.stage === 'preview' && (
                <div className="space-y-4">
                  {/* File Info */}
                  <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <FileJson className="w-8 h-8 text-blue-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 truncate">{state.file.name}</p>
                      <p className="text-sm text-gray-500">
                        {(state.file.size / 1024).toFixed(1)} KB • {state.validation.fileType}
                      </p>
                    </div>
                    {state.validation.isValid ? (
                      <Check className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500" />
                    )}
                  </div>

                  {/* Validation Status */}
                  {state.validation.isValid ? (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-green-700">
                        <Check className="w-4 h-4" />
                        <span className="font-medium">File validated successfully</span>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-center gap-2 text-red-700 mb-2">
                        <AlertCircle className="w-4 h-4" />
                        <span className="font-medium">Validation errors</span>
                      </div>
                      <ul className="text-sm text-red-600 space-y-1">
                        {state.validation.errors.map((err, i) => (
                          <li key={i}>• {err}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Warnings */}
                  {state.validation.warnings.length > 0 && (
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex items-center gap-2 text-yellow-700 mb-2">
                        <AlertTriangle className="w-4 h-4" />
                        <span className="font-medium">Warnings</span>
                      </div>
                      <ul className="text-sm text-yellow-600 space-y-1">
                        {state.validation.warnings.map((warn, i) => (
                          <li key={i}>• {warn}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Preview Stats */}
                  {state.validation.isValid && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3 bg-blue-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-blue-700">
                          {state.validation.preview.facilityCount?.toLocaleString() || 0}
                        </p>
                        <p className="text-xs text-blue-600">Facilities</p>
                      </div>
                      <div className="p-3 bg-purple-50 rounded-lg text-center">
                        <p className="text-2xl font-bold text-purple-700">
                          {state.validation.preview.tables?.length || 1}
                        </p>
                        <p className="text-xs text-purple-600">Tables</p>
                      </div>
                    </div>
                  )}

                  {/* Import Mode Selection */}
                  {state.validation.isValid && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-gray-700">Import Mode</label>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setImportMode('merge')}
                          className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                            importMode === 'merge'
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className={`font-medium ${importMode === 'merge' ? 'text-blue-700' : 'text-gray-700'}`}>
                            Merge
                          </p>
                          <p className="text-xs text-gray-500">Add to existing data</p>
                        </button>
                        <button
                          onClick={() => setImportMode('replace')}
                          className={`flex-1 p-3 rounded-lg border-2 transition-colors ${
                            importMode === 'replace'
                              ? 'border-red-500 bg-red-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <p className={`font-medium ${importMode === 'replace' ? 'text-red-700' : 'text-gray-700'}`}>
                            Replace
                          </p>
                          <p className="text-xs text-gray-500">Clear existing first</p>
                        </button>
                      </div>
                      {importMode === 'replace' && (
                        <p className="text-xs text-red-600 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          Warning: This will delete all existing data
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Importing */}
              {state.stage === 'importing' && (
                <div className="flex flex-col items-center py-8">
                  <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
                  <p className="text-gray-600">Importing data...</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Mode: {state.options.mode === 'merge' ? 'Merging with existing' : 'Replacing all'}
                  </p>
                </div>
              )}

              {/* Complete */}
              {state.stage === 'complete' && (
                <div className="space-y-4">
                  {state.result.success ? (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                        <Check className="w-8 h-8 text-green-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-800">Import Complete!</p>
                      <p className="text-sm text-gray-500 mt-1">{state.result.message}</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center py-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                        <AlertCircle className="w-8 h-8 text-red-600" />
                      </div>
                      <p className="text-lg font-medium text-gray-800">Import Failed</p>
                      <p className="text-sm text-gray-500 mt-1">{state.result.message}</p>
                      {state.result.errors.length > 0 && (
                        <ul className="mt-3 text-sm text-red-600 space-y-1">
                          {state.result.errors.map((err, i) => (
                            <li key={i}>• {err}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Import Summary */}
                  {state.result.success && state.result.imported && (
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-sm font-medium text-gray-700 mb-2">Imported:</p>
                      {state.result.imported.facilities !== undefined && (
                        <p className="text-sm text-gray-600">
                          • {state.result.imported.facilities.toLocaleString()} facilities
                        </p>
                      )}
                      {state.result.imported.tables && (
                        Object.entries(state.result.imported.tables).map(([table, count]) => (
                          <p key={table} className="text-sm text-gray-600">
                            • {count.toLocaleString()} {table}
                          </p>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Error */}
              {state.stage === 'error' && (
                <div className="flex flex-col items-center py-6">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                    <AlertCircle className="w-8 h-8 text-red-600" />
                  </div>
                  <p className="text-lg font-medium text-gray-800">Error</p>
                  <p className="text-sm text-red-600 mt-1">{state.message}</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-1 text-xs text-gray-400">
                <Info className="w-3 h-3" />
                <span>Data validated locally before import</span>
              </div>
              <div className="flex gap-2">
                {state.stage === 'preview' && state.validation.isValid && (
                  <button
                    onClick={handleImport}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                  >
                    <Upload size={16} />
                    Import
                  </button>
                )}
                {(state.stage === 'complete' || state.stage === 'error') && (
                  <button
                    onClick={handleReset}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <RefreshCw size={16} />
                    Import Another
                  </button>
                )}
                <button
                  onClick={handleClose}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                >
                  {state.stage === 'complete' && state.result.success ? 'Done' : 'Cancel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DataImportButton;
