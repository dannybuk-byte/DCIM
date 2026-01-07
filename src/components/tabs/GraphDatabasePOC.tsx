/**
 * Graph Database POC - Testing Kuzu-WASM feasibility
 * 
 * Tests:
 * - Load time and bundle size impact
 * - Query performance with 100 and 11,992 records
 * - Memory usage
 * - Browser compatibility
 */

import { useEffect, useState, useCallback } from 'react';
import { Facility } from '../../types';
import { db } from '../../db/database';
import { Activity, Database, Zap, HardDrive, Clock, AlertTriangle, CheckCircle } from 'lucide-react';

interface POCMetrics {
  loadTime: number;
  initTime: number;
  schemaCreationTime: number;
  insertTime100: number;
  insertTime11992?: number;
  queryTime100: number;
  queryTime11992?: number;
  bundleSize: number;
  memoryUsage: number;
  status: 'idle' | 'loading' | 'success' | 'error';
  error?: string;
}

interface QueryResult {
  facilities: Array<{ name: string; operator: string; subsidyGap: number }>;
  queryTime: number;
  rowCount: number;
}

export function GraphDatabasePOC() {
  const [metrics, setMetrics] = useState<POCMetrics>({
    loadTime: 0,
    initTime: 0,
    schemaCreationTime: 0,
    insertTime100: 0,
    queryTime100: 0,
    bundleSize: 0,
    memoryUsage: 0,
    status: 'idle',
  });

  const [queryResult100, setQueryResult100] = useState<QueryResult | null>(null);
  const [queryResult11992, setQueryResult11992] = useState<QueryResult | null>(null);
  const [testSize, setTestSize] = useState<100 | 11992>(100);
  const [facilities, setFacilities] = useState<Facility[]>([]);

  // Load facilities from IndexedDB
  useEffect(() => {
    async function loadFacilities() {
      const allFacilities = await db.facilities.toArray();
      setFacilities(allFacilities);
    }
    loadFacilities();
  }, []);

  const runPOC = useCallback(async (recordCount: 100 | 11992) => {
    setMetrics(prev => ({ ...prev, status: 'loading' }));
    
    const startMemory = (performance as any).memory?.usedJSHeapSize || 0;
    
    try {
      // Step 1: Load Kuzu-WASM
      const loadStart = performance.now();
      // @ts-ignore - @kuzu/kuzu-wasm is an optional dependency
      const kuzu_wasm = await import('@kuzu/kuzu-wasm');
      const loadTime = performance.now() - loadStart;
      
      // Step 2: Initialize database
      const initStart = performance.now();
      const kuzu = await kuzu_wasm.default();
      const database = await kuzu.Database();
      const conn = await kuzu.Connection(database);
      const initTime = performance.now() - initStart;
      
      // Step 3: Create schema
      const schemaStart = performance.now();
      await conn.execute(`
        CREATE NODE TABLE Facility(
          id STRING PRIMARY KEY,
          name STRING,
          operator STRING,
          state STRING,
          city STRING,
          subsidy_gap INT64,
          compliance_status STRING,
          promised_jobs INT32,
          actual_jobs INT32
        );
      `);
      
      await conn.execute(`
        CREATE NODE TABLE Operator(
          name STRING PRIMARY KEY,
          total_facilities INT32
        );
      `);
      
      await conn.execute(`
        CREATE REL TABLE OPERATES(FROM Operator TO Facility);
      `);
      const schemaCreationTime = performance.now() - schemaStart;
      
      // Step 4: Insert data
      const insertStart = performance.now();
      const testData = facilities.slice(0, recordCount);
      
      // Batch insert facilities
      for (const f of testData) {
        await conn.execute(`
          CREATE (f:Facility {
            id: $id,
            name: $name,
            operator: $operator,
            state: $state,
            city: $city,
            subsidy_gap: $subsidyGap,
            compliance_status: $complianceStatus,
            promised_jobs: $promisedJobs,
            actual_jobs: $actualJobs
          })
        `, {
          id: String(f.id),
          name: f.name,
          operator: f.operator,
          state: f.state || 'Unknown',
          city: f.city || 'Unknown',
          subsidyGap: BigInt(Math.floor(f.subsidyGap || 0)),
          complianceStatus: f.complianceStatus,
          promisedJobs: f.jobsPromised || 0,
          actualJobs: f.jobsCreated || 0,
        });
      }
      
      const insertTime = performance.now() - insertStart;
      
      // Step 5: Test query performance
      const queryStart = performance.now();
      const result = await conn.execute(`
        MATCH (f:Facility)
        WHERE f.subsidy_gap > 1000000
        RETURN f.name, f.operator, f.subsidy_gap
        ORDER BY f.subsidy_gap DESC
        LIMIT 10
      `);
      const queryTime = performance.now() - queryStart;
      
      // Get all rows
      const rows: Array<{ name: string; operator: string; subsidyGap: number }> = [];
      while (await result.hasNext()) {
        const row = await result.getNext();
        rows.push({
          name: row.name as string,
          operator: row.operator as string,
          subsidyGap: Number(row.subsidy_gap),
        });
      }
      
      const endMemory = (performance as any).memory?.usedJSHeapSize || 0;
      const memoryUsage = endMemory - startMemory;
      
      // Update metrics
      const newMetrics: POCMetrics = {
        loadTime,
        initTime,
        schemaCreationTime,
        insertTime100: recordCount === 100 ? insertTime : metrics.insertTime100,
        insertTime11992: recordCount === 11992 ? insertTime : metrics.insertTime11992,
        queryTime100: recordCount === 100 ? queryTime : metrics.queryTime100,
        queryTime11992: recordCount === 11992 ? queryTime : metrics.queryTime11992,
        bundleSize: 0, // Will need to check network tab
        memoryUsage,
        status: 'success',
      };
      
      setMetrics(newMetrics);
      
      const queryResultData = {
        facilities: rows,
        queryTime,
        rowCount: rows.length,
      };
      
      if (recordCount === 100) {
        setQueryResult100(queryResultData);
      } else {
        setQueryResult11992(queryResultData);
      }
      
    } catch (error) {
      console.error('POC Error:', error);
      setMetrics(prev => ({
        ...prev,
        status: 'error',
        error: error instanceof Error ? error.message : String(error),
      }));
    }
  }, [facilities, metrics.insertTime100, metrics.queryTime100, metrics.insertTime11992]);

  const getStatusBadge = (value: number, thresholds: { good: number; warning: number }) => {
    if (value <= thresholds.good) {
      return <span className="text-green-400">✅ Excellent</span>;
    } else if (value <= thresholds.warning) {
      return <span className="text-yellow-400">⚠️ Acceptable</span>;
    } else {
      return <span className="text-red-400">❌ Poor</span>;
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b border-gray-800 pb-4">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Database className="w-6 h-6" />
          Graph Database POC - Kuzu-WASM
        </h2>
        <p className="text-sm text-gray-400 mt-2">
          Testing feasibility of graph database integration for DCIM Compliance App
        </p>
      </div>

      {/* Test Controls */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Activity className="w-5 h-5" />
          Run Tests
        </h3>
        
        <div className="flex gap-4">
          <button
            onClick={() => {
              setTestSize(100);
              runPOC(100);
            }}
            disabled={metrics.status === 'loading' || facilities.length === 0}
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Test with 100 Records
          </button>
          
          <button
            onClick={() => {
              setTestSize(11992);
              runPOC(11992);
            }}
            disabled={metrics.status === 'loading' || facilities.length === 0}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded transition-colors"
          >
            Test with All 11,992 Records
          </button>
        </div>

        {facilities.length === 0 && (
          <p className="text-yellow-400 text-sm mt-2">⏳ Loading facilities from IndexedDB...</p>
        )}
        
        {metrics.status === 'loading' && (
          <p className="text-cyan-400 text-sm mt-2 animate-pulse">
            ⏳ Running POC with {testSize} records...
          </p>
        )}
      </div>

      {/* Performance Metrics */}
      {metrics.status === 'success' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Load Time */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-5 h-5 text-cyan-400" />
              <h3 className="text-lg font-semibold text-white">Load Time</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Kuzu-WASM Load:</span>
                <span className="text-white font-mono">{metrics.loadTime.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Assessment:</span>
                {getStatusBadge(metrics.loadTime, { good: 2000, warning: 5000 })}
              </div>
            </div>
          </div>

          {/* Initialization */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Database className="w-5 h-5 text-purple-400" />
              <h3 className="text-lg font-semibold text-white">Initialization</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">DB Init:</span>
                <span className="text-white font-mono">{metrics.initTime.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Schema Creation:</span>
                <span className="text-white font-mono">{metrics.schemaCreationTime.toFixed(2)}ms</span>
              </div>
            </div>
          </div>

          {/* Insert Performance */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-yellow-400" />
              <h3 className="text-lg font-semibold text-white">Insert Performance</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">100 records:</span>
                <span className="text-white font-mono">{metrics.insertTime100.toFixed(2)}ms</span>
              </div>
              {metrics.insertTime11992 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">11,992 records:</span>
                    <span className="text-white font-mono">{metrics.insertTime11992.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Per record:</span>
                    <span className="text-white font-mono">{(metrics.insertTime11992 / 11992).toFixed(2)}ms</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Query Performance */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-green-400" />
              <h3 className="text-lg font-semibold text-white">Query Performance</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">100 records:</span>
                <span className="text-white font-mono">{metrics.queryTime100.toFixed(2)}ms</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Assessment:</span>
                {getStatusBadge(metrics.queryTime100, { good: 50, warning: 200 })}
              </div>
              {metrics.queryTime11992 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-400">11,992 records:</span>
                    <span className="text-white font-mono">{metrics.queryTime11992.toFixed(2)}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Assessment:</span>
                    {getStatusBadge(metrics.queryTime11992, { good: 500, warning: 2000 })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Memory Usage */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <HardDrive className="w-5 h-5 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Memory Usage</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Heap Increase:</span>
                <span className="text-white font-mono">{(metrics.memoryUsage / 1024 / 1024).toFixed(2)}MB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Assessment:</span>
                {getStatusBadge(metrics.memoryUsage / 1024 / 1024, { good: 200, warning: 500 })}
              </div>
            </div>
          </div>

          {/* Bundle Size */}
          <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Bundle Size</h3>
            </div>
            <div className="space-y-2">
              <p className="text-gray-400 text-sm">
                Check browser DevTools → Network tab for actual transfer size of kuzu-wasm.js
              </p>
              <p className="text-yellow-400 text-sm">
                ⚠️ Expected: ~4-6MB additional bundle size
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Query Results */}
      {queryResult100 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Query Results (100 records)</h3>
          </div>
          <p className="text-gray-400 text-sm mb-2">
            Query: Top 10 facilities with subsidy gap &gt; $1M
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 py-2">Facility</th>
                  <th className="text-left text-gray-400 py-2">Operator</th>
                  <th className="text-right text-gray-400 py-2">Subsidy Gap</th>
                </tr>
              </thead>
              <tbody>
                {queryResult100.facilities.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="text-gray-200 py-2">{f.name}</td>
                    <td className="text-gray-300 py-2">{f.operator}</td>
                    <td className="text-right text-red-400 font-mono py-2">
                      ${(f.subsidyGap / 1000000).toFixed(2)}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {queryResult11992 && (
        <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h3 className="text-lg font-semibold text-white">Query Results (11,992 records)</h3>
          </div>
          <p className="text-gray-400 text-sm mb-2">
            Query: Top 10 facilities with subsidy gap &gt; $1M (from full dataset)
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left text-gray-400 py-2">Facility</th>
                  <th className="text-left text-gray-400 py-2">Operator</th>
                  <th className="text-right text-gray-400 py-2">Subsidy Gap</th>
                </tr>
              </thead>
              <tbody>
                {queryResult11992.facilities.map((f, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="text-gray-200 py-2">{f.name}</td>
                    <td className="text-gray-300 py-2">{f.operator}</td>
                    <td className="text-right text-red-400 font-mono py-2">
                      ${(f.subsidyGap / 1000000).toFixed(2)}M
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Error Display */}
      {metrics.status === 'error' && (
        <div className="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-400" />
            <h3 className="text-lg font-semibold text-red-400">Error</h3>
          </div>
          <p className="text-red-300 font-mono text-sm">{metrics.error}</p>
        </div>
      )}

      {/* Decision Criteria */}
      <div className="bg-gray-900 border border-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-white mb-4">✅ Success Criteria</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <div className="font-semibold text-gray-300 mb-2">Acceptable Thresholds:</div>
            <ul className="space-y-1 text-gray-400">
              <li>• Load time: &lt; 2s</li>
              <li>• Query (100): &lt; 50ms</li>
              <li>• Query (11,992): &lt; 500ms</li>
              <li>• Memory: &lt; 200MB</li>
              <li>• Bundle size: &lt; 5MB</li>
            </ul>
          </div>
          <div>
            <div className="font-semibold text-gray-300 mb-2">Deal-breakers:</div>
            <ul className="space-y-1 text-gray-400">
              <li>• Load time: &gt; 5s</li>
              <li>• Query (100): &gt; 200ms</li>
              <li>• Query (11,992): &gt; 2s</li>
              <li>• Memory: &gt; 500MB</li>
              <li>• Bundle size: &gt; 10MB</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

