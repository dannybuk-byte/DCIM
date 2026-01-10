/**
 * DeepNestedTree – Virtualized infinite-depth expandable tree
 * 
 * Features:
 * - Supports 20+ levels of nesting with smooth performance (virtualized via react-window)
 * - Lazy children generation (children fetched/computed only when expanded)
 * - Expand/Collapse all to depth N
 * - Global density tokens for consistent styling
 * - Inline summary metrics per node
 * - Search/filter across tree
 * - Keyboard navigation (↑/↓ to move, → expand, ← collapse, Enter select)
 */

import React, { useState, useCallback, useMemo, useRef, useEffect, memo } from 'react';
import { VariableSizeList as List } from 'react-window';
import { ChevronRight, ChevronDown, Search, Maximize2, Minimize2, ChevronsDown, ChevronsUp } from 'lucide-react';
import { useDensity } from '../../contexts/DensityContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TreeNodeData {
  id: string;
  label: string;
  /** Optional icon component */
  icon?: React.ComponentType<{ className?: string }>;
  /** Depth in tree (0 = root) */
  depth: number;
  /** Whether this node can have children */
  hasChildren: boolean;
  /** Summary metrics displayed inline */
  metrics?: { label: string; value: string | number; color?: string }[];
  /** Arbitrary payload for custom renderers */
  payload?: unknown;
}

export interface DeepNestedTreeProps {
  /** Root nodes (depth 0) */
  roots: TreeNodeData[];
  /** Called when a node is expanded and we need its children. Return children nodes. */
  getChildren: (node: TreeNodeData) => TreeNodeData[] | Promise<TreeNodeData[]>;
  /** Called when a node is selected */
  onSelect?: (node: TreeNodeData) => void;
  /** Optional header title */
  title?: string;
  /** Height of the tree container (px) */
  height?: number;
  /** Class name for outer wrapper */
  className?: string;
  /** Maximum depth to allow expanding (default 25) */
  maxDepth?: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Flattened row for virtual list
// ─────────────────────────────────────────────────────────────────────────────

interface FlatRow {
  node: TreeNodeData;
  expanded: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

export const DeepNestedTree: React.FC<DeepNestedTreeProps> = memo(function DeepNestedTree({
  roots,
  getChildren,
  onSelect,
  title = 'Tree',
  height = 500,
  className = '',
  maxDepth = 25,
}) {
  const { tokens, cn } = useDensity();

  // Expansion state: Set of expanded node IDs
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Children cache: node ID -> children
  const [childrenCache, setChildrenCache] = useState<Map<string, TreeNodeData[]>>(new Map());
  // Loading state per node
  const [loading, setLoading] = useState<Set<string>>(new Set());
  // Selected node ID
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Search query
  const [searchQuery, setSearchQuery] = useState('');
  // Focused row index for keyboard nav
  const [focusedIndex, setFocusedIndex] = useState<number>(0);

  const listRef = useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ───────────────────────────────────────────────────────────────────────────
  // Flatten tree into virtual list rows
  // ───────────────────────────────────────────────────────────────────────────

  const flatRows = useMemo(() => {
    const rows: FlatRow[] = [];
    const lowerQuery = searchQuery.toLowerCase();

    function traverse(nodes: TreeNodeData[]) {
      for (const node of nodes) {
        // Apply search filter (show node if it matches OR has matching descendants)
        const matchesSearch = !searchQuery || node.label.toLowerCase().includes(lowerQuery);
        const isExpanded = expanded.has(node.id);
        const children = childrenCache.get(node.id) || [];

        // Determine if any descendant matches (recursive check would be expensive, so we just show expanded subtrees)
        const showNode = matchesSearch || isExpanded;

        if (showNode || !searchQuery) {
          rows.push({ node, expanded: isExpanded });
        }

        if (isExpanded && children.length > 0) {
          traverse(children);
        }
      }
    }

    traverse(roots);
    return rows;
  }, [roots, expanded, childrenCache, searchQuery]);

  // ───────────────────────────────────────────────────────────────────────────
  // Expand / Collapse
  // ───────────────────────────────────────────────────────────────────────────

  const toggleExpand = useCallback(async (node: TreeNodeData) => {
    const nodeId = node.id;
    const isCurrentlyExpanded = expanded.has(nodeId);

    if (isCurrentlyExpanded) {
      // Collapse
      setExpanded(prev => {
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    } else {
      // Expand: load children if not cached
      if (!childrenCache.has(nodeId) && node.hasChildren && node.depth < maxDepth) {
        setLoading(prev => new Set(prev).add(nodeId));
        try {
          const children = await getChildren(node);
          setChildrenCache(prev => new Map(prev).set(nodeId, children));
        } finally {
          setLoading(prev => {
            const next = new Set(prev);
            next.delete(nodeId);
            return next;
          });
        }
      }
      setExpanded(prev => new Set(prev).add(nodeId));
    }
  }, [expanded, childrenCache, getChildren, maxDepth]);

  // ───────────────────────────────────────────────────────────────────────────
  // Expand/Collapse All to Depth
  // ───────────────────────────────────────────────────────────────────────────

  const expandAllToDepth = useCallback(async (targetDepth: number) => {
    // BFS expansion
    const toExpand: TreeNodeData[] = [...roots];
    const newExpanded = new Set<string>();
    const newCache = new Map(childrenCache);

    while (toExpand.length > 0) {
      const node = toExpand.shift()!;
      if (node.depth >= targetDepth || !node.hasChildren) continue;

      newExpanded.add(node.id);

      if (!newCache.has(node.id)) {
        try {
          const children = await getChildren(node);
          newCache.set(node.id, children);
          toExpand.push(...children);
        } catch {
          // skip
        }
      } else {
        toExpand.push(...(newCache.get(node.id) || []));
      }
    }

    setChildrenCache(newCache);
    setExpanded(newExpanded);
  }, [roots, childrenCache, getChildren]);

  const collapseAll = useCallback(() => {
    setExpanded(new Set());
  }, []);

  // ───────────────────────────────────────────────────────────────────────────
  // Selection
  // ───────────────────────────────────────────────────────────────────────────

  const handleSelect = useCallback((node: TreeNodeData) => {
    setSelectedId(node.id);
    onSelect?.(node);
  }, [onSelect]);

  // ───────────────────────────────────────────────────────────────────────────
  // Keyboard Navigation
  // ───────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => Math.min(prev + 1, flatRows.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => Math.max(prev - 1, 0));
          break;
        case 'ArrowRight': {
          e.preventDefault();
          const row = flatRows[focusedIndex];
          if (row && row.node.hasChildren && !row.expanded) {
            toggleExpand(row.node);
          }
          break;
        }
        case 'ArrowLeft': {
          e.preventDefault();
          const row = flatRows[focusedIndex];
          if (row && row.expanded) {
            toggleExpand(row.node);
          }
          break;
        }
        case 'Enter': {
          e.preventDefault();
          const row = flatRows[focusedIndex];
          if (row) handleSelect(row.node);
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [flatRows, focusedIndex, toggleExpand, handleSelect]);

  // Scroll focused row into view
  useEffect(() => {
    listRef.current?.scrollToItem(focusedIndex, 'smart');
  }, [focusedIndex]);

  // ───────────────────────────────────────────────────────────────────────────
  // Row Renderer
  // ───────────────────────────────────────────────────────────────────────────

  const Row = useCallback(({ index, style }: { index: number; style: React.CSSProperties }) => {
    const { node, expanded: isExpanded } = flatRows[index];
    const isLoading = loading.has(node.id);
    const isSelected = selectedId === node.id;
    const isFocused = focusedIndex === index;
    const Icon = node.icon;
    const indent = node.depth * 16;

    return (
      <div
        style={{ ...style, paddingLeft: indent + 8 }}
        className={cn(
          'flex items-center cursor-pointer transition-colors border-l-2',
          tokens.gap2,
          tokens.px2,
          isSelected ? 'bg-cyan-500/20 border-cyan-500' : 'border-transparent hover:bg-slate-800/50',
          isFocused && 'ring-1 ring-cyan-500/50'
        )}
        onClick={() => handleSelect(node)}
        onDoubleClick={() => node.hasChildren && toggleExpand(node)}
        tabIndex={0}
      >
        {/* Expand/Collapse */}
        {node.hasChildren ? (
          <button
            onClick={(e) => { e.stopPropagation(); toggleExpand(node); }}
            className="text-slate-400 hover:text-white flex-shrink-0"
            aria-label={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isLoading ? (
              <span className="w-4 h-4 border-2 border-slate-500 border-t-cyan-400 rounded-full animate-spin" />
            ) : isExpanded ? (
              <ChevronDown className="w-4 h-4" />
            ) : (
              <ChevronRight className="w-4 h-4" />
            )}
          </button>
        ) : (
          <span className="w-4" />
        )}

        {/* Icon */}
        {Icon && <Icon className="w-4 h-4 text-cyan-400 flex-shrink-0" />}

        {/* Label */}
        <span className={cn('text-white font-medium truncate flex-1', tokens.textBase)}>
          {node.label}
        </span>

        {/* Inline Metrics */}
        {node.metrics && node.metrics.length > 0 && (
          <div className={cn('flex items-center', tokens.gap2, 'flex-shrink-0')}>
            {node.metrics.map((m, i) => (
              <span
                key={i}
                className={cn(
                  tokens.textXs,
                  tokens.px2,
                  tokens.py1,
                  tokens.rounded,
                  'border bg-slate-800/50'
                )}
                style={{ color: m.color || '#8b9dc3', borderColor: m.color ? `${m.color}44` : '#1e2d42' }}
                title={m.label}
              >
                {m.value}
              </span>
            ))}
          </div>
        )}
      </div>
    );
  }, [flatRows, loading, selectedId, focusedIndex, tokens, cn, handleSelect, toggleExpand]);

  // Row height getter (all same for now)
  const getItemSize = useCallback(() => tokens.rowHeight, [tokens.rowHeight]);

  // ───────────────────────────────────────────────────────────────────────────
  // Render
  // ───────────────────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className={cn('bg-slate-900/50 border border-slate-700', tokens.roundedLg, 'overflow-hidden flex flex-col', className)}
      tabIndex={-1}
    >
      {/* Header */}
      <div className={cn('flex items-center justify-between border-b border-slate-700', tokens.px3, tokens.py2, 'bg-slate-800/50')}>
        <h3 className={cn('font-semibold text-cyan-400', tokens.textLg)}>{title}</h3>
        <div className={cn('flex items-center', tokens.gap2)}>
          <button
            onClick={() => expandAllToDepth(3)}
            className={cn(tokens.textXs, tokens.px2, tokens.py1, 'bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center gap-1')}
            title="Expand all to depth 3"
          >
            <ChevronsDown className="w-3 h-3" /> Expand
          </button>
          <button
            onClick={collapseAll}
            className={cn(tokens.textXs, tokens.px2, tokens.py1, 'bg-slate-700 hover:bg-slate-600 text-slate-300 rounded flex items-center gap-1')}
            title="Collapse all"
          >
            <ChevronsUp className="w-3 h-3" /> Collapse
          </button>
        </div>
      </div>

      {/* Search */}
      <div className={cn('border-b border-slate-700', tokens.px3, tokens.py2)}>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search tree..."
            className={cn(
              'w-full pl-8 pr-3 bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500',
              tokens.textSm,
              tokens.py1,
              tokens.rounded
            )}
          />
        </div>
      </div>

      {/* Summary */}
      <div className={cn('border-b border-slate-700 text-slate-400', tokens.textXs, tokens.px3, tokens.py1)}>
        {flatRows.length} nodes visible • {expanded.size} expanded
      </div>

      {/* Virtualized List */}
      <List
        ref={listRef}
        height={height - 120} // Subtract header/search/summary height
        itemCount={flatRows.length}
        itemSize={getItemSize}
        width="100%"
        className="custom-scrollbar"
      >
        {Row}
      </List>
    </div>
  );
});

export default DeepNestedTree;

