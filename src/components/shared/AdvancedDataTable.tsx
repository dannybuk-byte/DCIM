import { useState, useMemo } from 'react';
import { ArrowUpDown, Download, FileText, ExternalLink, Search } from 'lucide-react';
import { AutocompleteInput, AutocompleteOption } from './AutocompleteInput';

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (row: T) => React.ReactNode;
  className?: string;
  citation?: boolean; // Show citation icon
}

export interface TableSource {
  id: number;
  title: string;
  url?: string;
}

interface AdvancedDataTableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  title?: string;
  sources?: TableSource[]; // NotebookLM-style source citations
  onExportCSV?: () => void;
  onExportPDF?: () => void;
  searchable?: boolean;
  className?: string;
}

export function AdvancedDataTable<T extends Record<string, any>>({
  data,
  columns,
  title,
  sources = [],
  onExportCSV,
  onExportPDF,
  searchable = true,
  className = '',
}: AdvancedDataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchQuery, setSearchQuery] = useState('');

  const searchOptions: AutocompleteOption[] = useMemo(() => {
    // Lightweight predictive suggestions derived from table values (no backend).
    // Cap for perf; AutocompleteInput will fuzzy-filter.
    const values: string[] = [];
    const rows = (data || []).slice(0, 500);
    for (const row of rows) {
      for (const col of columns) {
        const key = String(col.key);
        const v = (row as any)[key];
        if (v === null || v === undefined) continue;
        if (typeof v === 'string') values.push(v);
        else if (typeof v === 'number') values.push(String(v));
      }
    }
    const uniq = Array.from(new Set(values.map(s => s.trim()).filter(Boolean))).slice(0, 300);
    return uniq.map((v) => ({ value: v, label: v, category: 'Table Values' }));
  }, [columns, data]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection('asc');
    }
  };

  const sortedAndFilteredData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchQuery) {
      const lowerQuery = searchQuery.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(lowerQuery)
        )
      );
    }

    // Sort
    if (sortKey) {
      result.sort((a, b) => {
        const aVal = a[sortKey];
        const bVal = b[sortKey];

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
        }

        const aStr = String(aVal).toLowerCase();
        const bStr = String(bVal).toLowerCase();
        if (sortDirection === 'asc') {
          return aStr.localeCompare(bStr);
        } else {
          return bStr.localeCompare(aStr);
        }
      });
    }

    return result;
  }, [data, searchQuery, sortKey, sortDirection]);

  const handleCSVExport = () => {
    if (onExportCSV) {
      onExportCSV();
      return;
    }

    // Default CSV export
    const headers = columns.map(col => col.label).join(',');
    const rows = sortedAndFilteredData.map(row =>
      columns.map(col => {
        const key = col.key as keyof T;
        const value = row[key];
        return `"${String(value).replace(/"/g, '""')}"`;
      }).join(',')
    );

    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || 'data'}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-gray-900 border border-gray-700 rounded-lg overflow-hidden ${className}`}>
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-1.5">
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-xs font-bold text-white">{title || 'Data Table'}</h3>
          <div className="flex gap-1">
            {onExportPDF && (
              <button
                onClick={onExportPDF}
                className="px-1.5 py-0.5 bg-red-600 hover:bg-red-700 text-white rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors"
              >
                <FileText className="w-2.5 h-2.5" />
                PDF
              </button>
            )}
            <button
              onClick={handleCSVExport}
              className="px-1.5 py-0.5 bg-green-600 hover:bg-green-700 text-white rounded text-[10px] font-medium flex items-center gap-0.5 transition-colors"
            >
              <Download className="w-2.5 h-2.5" />
              CSV
            </button>
          </div>
        </div>

        {/* Search */}
        {searchable && (
          <div className="relative">
            <AutocompleteInput
              value={searchQuery}
              onChange={setSearchQuery}
              options={searchOptions}
              placeholder="Search table..."
              icon={<Search className="w-4 h-4" />}
              minChars={1}
              maxSuggestions={10}
            />
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar">
        <table className="w-full text-[10px]">
          <thead className="bg-gray-800 border-b border-gray-700">
            <tr>
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={`px-1.5 py-1 text-left text-[9px] font-semibold text-gray-300 uppercase tracking-wider ${col.className || ''} ${col.sortable !== false ? 'cursor-pointer hover:bg-gray-700' : ''}`}
                  onClick={() => col.sortable !== false && handleSort(String(col.key))}
                >
                  <div className="flex items-center gap-0.5">
                    <span>{col.label}</span>
                    {col.sortable !== false && (
                      <ArrowUpDown className={`w-2 h-2 ${sortKey === col.key ? 'text-cyan-400' : 'text-gray-500'}`} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {sortedAndFilteredData.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-1.5 py-3 text-center text-gray-500 text-[10px]">
                  No data available
                </td>
              </tr>
            ) : (
              sortedAndFilteredData.map((row, idx) => (
                <tr key={idx} className="hover:bg-gray-800/50 transition-colors">
                  {columns.map((col) => (
                    <td key={String(col.key)} className={`px-1.5 py-1 text-gray-300 ${col.className || ''}`}>
                      {col.render ? col.render(row) : String(row[col.key as keyof T] || '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer with sources (NotebookLM-style) */}
      {sources.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 p-1.5">
          <h4 className="text-[9px] font-semibold text-gray-400 uppercase mb-1">Sources</h4>
          <div className="flex flex-wrap gap-1">
            {sources.map((source, idx) => (
              <a
                key={source.id}
                href={source.url || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 px-1 py-0.5 bg-gray-700 hover:bg-gray-600 rounded text-[9px] text-gray-300 transition-colors"
              >
                <span className="font-mono text-cyan-400">[{idx + 1}]</span>
                <span className="max-w-[200px] truncate">{source.title}</span>
                {source.url && <ExternalLink className="w-2 h-2 flex-shrink-0" />}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Row count */}
      <div className="bg-gray-900 border-t border-gray-700 px-1.5 py-0.5">
        <p className="text-[9px] text-gray-500">
          Showing {sortedAndFilteredData.length} of {data.length} rows
          {searchQuery && <span className="text-cyan-400"> (filtered)</span>}
        </p>
      </div>
    </div>
  );
}

