import { memo, useState, useEffect, useMemo } from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, Network, Globe, Radio, Server, Plus, Edit2, ExternalLink, AlertCircle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import { db, NetworkSecurity } from '../../db/database';
import { Facility } from '../../types';
import { AdvancedDataTable, TableColumn, TableSource } from '../shared/AdvancedDataTable';
import { Tooltip } from '../shared/Tooltip';
import { ErrorBoundary } from '../ErrorBoundary';
import { seedNotebookLMFeatures } from '../../db/seedNotebookLM';
import { AutocompleteInput, AutocompleteOption } from '../shared/AutocompleteInput';
import { BGPRouteMonitor } from '../shared/BGPRouteMonitor';
import { Spinner, ProgressBar, SkeletonTable, SkeletonCard } from '../shared/ProgressIndicators';

interface NetworkSecurityTabProps {
  facilities: Facility[];
}

const NetworkSecurityTab = memo(({ facilities }: NetworkSecurityTabProps) => {
  const [networkData, setNetworkData] = useState<NetworkSecurity[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedFacility, setSelectedFacility] = useState<Facility | null>(null);
  const [editingRecord, setEditingRecord] = useState<NetworkSecurity | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showBGPMonitor, setShowBGPMonitor] = useState(true);

  const asnOptions: AutocompleteOption[] = useMemo(() => {
    const uniq = Array.from(new Set(networkData.map(n => n.asn).filter(Boolean) as string[])).slice(0, 200);
    return uniq.map(v => ({ value: v, label: v, category: 'ASNs' }));
  }, [networkData]);

  const asnNameOptions: AutocompleteOption[] = useMemo(() => {
    const uniq = Array.from(new Set(networkData.map(n => n.asnName).filter(Boolean) as string[])).slice(0, 200);
    return uniq.map(v => ({ value: v, label: v, category: 'ASN Names' }));
  }, [networkData]);

  const providerOptions: AutocompleteOption[] = useMemo(() => {
    const vals = new Set<string>();
    networkData.forEach(n => {
      if (n.networkProvider) vals.add(n.networkProvider);
      (n.transitProviders || []).forEach(p => vals.add(p));
    });
    return Array.from(vals).slice(0, 200).map(v => ({ value: v, label: v, category: 'Providers' }));
  }, [networkData]);

  const ddosOptions: AutocompleteOption[] = useMemo(() => {
    const vals = Array.from(new Set(networkData.map(n => n.ddosMitigation).filter(Boolean) as string[])).slice(0, 200);
    const common = ['Cloudflare', 'Akamai', 'Radware', 'Arbor', 'Fastly', 'Google Cloud Armor', 'AWS Shield'];
    const uniq = Array.from(new Set([...vals, ...common])).slice(0, 200);
    return uniq.map(v => ({ value: v, label: v, category: 'DDoS Mitigation' }));
  }, [networkData]);

  // Load network security data
  useEffect(() => {
    loadNetworkData();
  }, []);

  const loadNetworkData = async () => {
    try {
      const data = await db.networkSecurity.toArray();
      setNetworkData(data);
    } catch (error) {
      console.error('Failed to load network security data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSeedData = async () => {
    if (!confirm('This will populate network security data for all facilities using real ASN/RPKI information from your NotebookLM research. Continue?')) {
      return;
    }

    setIsSeeding(true);
    try {
      const results = await seedNotebookLMFeatures();
      console.log('Seeding results:', results);
      await loadNetworkData(); // Reload data
      alert(`✅ Successfully seeded!\n\n📊 Network Security: ${results.networkSecurity?.total || 0} records\n📚 Sources: ${results.sources?.total || 0} documents`);
    } catch (error) {
      console.error('Seeding error:', error);
      alert('❌ Error seeding data. Check console for details.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Combine facilities with network security data
  const enrichedData = useMemo(() => {
    return facilities.map(facility => {
      const netSec = networkData.find(n => n.facilityId === facility.id);
      return {
        facilityId: facility.id || 0,
        name: facility.name,
        operator: facility.operator || 'Unknown',
        state: facility.state,
        city: facility.city,
        asn: netSec?.asn || '—',
        asnName: netSec?.asnName || '—',
        rpkiStatus: netSec?.rpkiStatus || 'Unknown',
        networkProvider: netSec?.networkProvider || '—',
        ddosMitigation: netSec?.ddosMitigation || '—',
        securityScore: calculateSecurityScore(netSec),
        hasData: !!netSec,
        networkSecId: netSec?.id,
      };
    });
  }, [facilities, networkData]);

  // Calculate security score
  function calculateSecurityScore(netSec?: NetworkSecurity): number {
    if (!netSec) return 0;
    let score = 0;
    if (netSec.rpkiStatus === 'Safe') score += 40;
    else if (netSec.rpkiStatus === 'Partially Safe') score += 20;
    if (netSec.ddosMitigation) score += 30;
    if (netSec.securityFeatures && netSec.securityFeatures.length > 0) score += 30;
    return Math.min(score, 100);
  }

  // RPKI Status Icon
  const getRPKIIcon = (status: string) => {
    switch (status) {
      case 'Safe':
        return <ShieldCheck className="w-4 h-4 text-green-400" />;
      case 'Partially Safe':
        return <ShieldAlert className="w-4 h-4 text-yellow-400" />;
      case 'Unsafe':
        return <ShieldX className="w-4 h-4 text-red-400" />;
      default:
        return <Shield className="w-4 h-4 text-gray-500" />;
    }
  };

  // Security score badge
  const getSecurityBadge = (score: number) => {
    if (score >= 80) return <span className="px-2 py-0.5 bg-green-600/20 text-green-400 rounded text-xs font-semibold">{score}%</span>;
    if (score >= 50) return <span className="px-2 py-0.5 bg-yellow-600/20 text-yellow-400 rounded text-xs font-semibold">{score}%</span>;
    if (score > 0) return <span className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-xs font-semibold">{score}%</span>;
    return <span className="px-2 py-0.5 bg-gray-700 text-gray-400 rounded text-xs">No Data</span>;
  };

  // Table columns
  const columns: TableColumn<typeof enrichedData[0]>[] = [
    {
      key: 'name',
      label: 'Facility',
      render: (row) => (
        <div>
          <div className="font-semibold text-white">{row.name}</div>
          <div className="text-xs text-gray-500">{row.city}, {row.state}</div>
        </div>
      ),
    },
    {
      key: 'operator',
      label: 'Operator',
      render: (row) => <span className="text-cyan-400">{row.operator}</span>,
    },
    {
      key: 'asn',
      label: 'ASN',
      render: (row) => (
        <div>
          <div className="font-mono text-sm">{row.asn}</div>
          {row.asnName !== '—' && <div className="text-xs text-gray-500">{row.asnName}</div>}
        </div>
      ),
    },
    {
      key: 'rpkiStatus',
      label: 'RPKI Status',
      render: (row) => (
        <div className="flex items-center gap-2">
          {getRPKIIcon(row.rpkiStatus)}
          <span>{row.rpkiStatus}</span>
        </div>
      ),
    },
    {
      key: 'networkProvider',
      label: 'Network Provider',
    },
    {
      key: 'ddosMitigation',
      label: 'DDoS Protection',
    },
    {
      key: 'securityScore',
      label: 'Security Score',
      render: (row) => getSecurityBadge(row.securityScore),
    },
    {
      key: 'facilityId',
      label: 'Actions',
      sortable: false,
      render: (row) => (
        <div className="flex gap-2">
          {row.hasData ? (
            <button
              onClick={() => handleEdit(row.facilityId)}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => handleAdd(row.facilityId)}
              className="p-1 hover:bg-gray-700 rounded text-gray-400 hover:text-green-400 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ];

  const handleAdd = (facilityId: number) => {
    const facility = facilities.find(f => f.id === facilityId);
    if (facility) {
      setSelectedFacility(facility);
      setEditingRecord(null);
      setShowAddModal(true);
    }
  };

  const handleEdit = async (facilityId: number) => {
    const facility = facilities.find(f => f.id === facilityId);
    const netSec = networkData.find(n => n.facilityId === facilityId);
    if (facility && netSec) {
      setSelectedFacility(facility);
      setEditingRecord(netSec);
      setShowAddModal(true);
    }
  };

  // Statistics
  const stats = useMemo(() => {
    const total = enrichedData.length;
    const withData = enrichedData.filter(d => d.hasData).length;
    const safe = enrichedData.filter(d => d.rpkiStatus === 'Safe').length;
    const unsafe = enrichedData.filter(d => d.rpkiStatus === 'Unsafe').length;
    const withDDoS = enrichedData.filter(d => d.ddosMitigation !== '—').length;

    return { total, withData, safe, unsafe, withDDoS };
  }, [enrichedData]);

  // Sources for NotebookLM-style citations
  const sources: TableSource[] = [
    { id: 1, title: 'Is BGP safe yet? - Cloudflare', url: 'https://isbgpsafeyet.com/' },
    { id: 2, title: 'RPKI Validator - RIPE NCC', url: 'https://www.ripe.net/manage-ips-and-asns/resource-management/certification' },
    { id: 3, title: 'BGP Hijacking Report - Datacenters.com', url: 'https://www.datacenters.com/news/bgp-hijacking' },
  ];

  if (loading) {
    return (
      <div className="space-y-3 p-3">
        {/* Header skeleton */}
        <div className="flex items-center gap-3">
          <Spinner size="sm" label="Loading network security data..." />
        </div>
        
        {/* Stats skeletons */}
        <div className="grid grid-cols-4 gap-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
        
        {/* Table skeleton */}
        <SkeletonTable rows={8} columns={6} />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="space-y-1.5 p-1">
        {/* Header - Ultra-compact */}
        <div className="flex items-center justify-between bg-gray-900/50 rounded px-2 py-1 border border-gray-800">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-bold text-white">Network Security</span>
            <span className="text-[9px] text-gray-500">• ASN, RPKI, BGP, DDoS</span>
          </div>
          <div className="flex gap-1">
            {stats.withData === 0 && (
              <button onClick={handleSeedData} disabled={isSeeding} className="flex items-center gap-1 px-2 py-0.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 text-white rounded text-[10px] font-semibold">
                <Zap className="w-3 h-3" />
                {isSeeding ? '...' : 'Seed'}
              </button>
            )}
            <a href="https://isbgpsafeyet.com/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2 py-0.5 bg-gray-800 hover:bg-gray-700 text-gray-200 rounded text-[10px]">
              <ExternalLink className="w-3 h-3" />
              RPKI
            </a>
          </div>
        </div>

        {/* Stats Row - Ultra-compact inline */}
        <div className="grid grid-cols-10 gap-0.5">
          <div className="col-span-2 bg-gray-800 rounded p-1.5 text-center">
            <Network className="w-3 h-3 text-cyan-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-white">{stats.total.toLocaleString()}</div>
            <div className="text-[8px] text-gray-500">TOTAL</div>
          </div>
          <div className="col-span-2 bg-gray-800 rounded p-1.5 text-center">
            <Server className="w-3 h-3 text-blue-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-white">{stats.withData.toLocaleString()}</div>
            <div className="text-[8px] text-blue-400">{((stats.withData / stats.total) * 100).toFixed(0)}% data</div>
          </div>
          <div className="col-span-2 bg-green-500/10 rounded p-1.5 text-center">
            <ShieldCheck className="w-3 h-3 text-green-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-green-400">{stats.safe.toLocaleString()}</div>
            <div className="text-[8px] text-green-400/70">SAFE</div>
          </div>
          <div className="col-span-2 bg-red-500/10 rounded p-1.5 text-center">
            <ShieldX className="w-3 h-3 text-red-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-red-400">{stats.unsafe.toLocaleString()}</div>
            <div className="text-[8px] text-red-400/70">UNSAFE</div>
          </div>
          <div className="col-span-2 bg-purple-500/10 rounded p-1.5 text-center">
            <Radio className="w-3 h-3 text-purple-400 mx-auto mb-0.5" />
            <div className="text-sm font-bold text-purple-400">{stats.withDDoS.toLocaleString()}</div>
            <div className="text-[8px] text-purple-400/70">DDoS</div>
          </div>
        </div>

        {/* Secondary metrics strip - inline */}
        <div className="flex items-center gap-1 bg-gray-800/30 rounded px-2 py-0.5 border border-gray-800 text-[9px]">
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-green-400" />Safe:{stats.safe}</span>
          <span className="text-gray-700">|</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />Partial:{enrichedData.filter(d => d.rpkiStatus === 'Partially Safe').length}</span>
          <span className="text-gray-700">|</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-red-400" />Unsafe:{stats.unsafe}</span>
          <span className="text-gray-700">|</span>
          <span className="flex items-center gap-0.5"><span className="w-1.5 h-1.5 rounded-full bg-gray-500" />?:{enrichedData.filter(d => d.rpkiStatus === 'Unknown').length}</span>
          <span className="flex-1" />
          <span className="text-gray-500">Avg Score: <span className="text-cyan-400 font-bold">{enrichedData.length ? Math.round(enrichedData.reduce((a, d) => a + d.securityScore, 0) / enrichedData.length) : 0}%</span></span>
        </div>

        {/* Alert - compact */}
        {stats.unsafe > 0 && (
          <div className="bg-red-900/20 border border-red-700/50 rounded px-2 py-1 flex items-center gap-2 text-[10px]">
            <AlertCircle className="w-3 h-3 text-red-400" />
            <span className="text-red-300"><strong>{stats.unsafe}</strong> facilities vulnerable to BGP hijacking (no RPKI)</span>
          </div>
        )}

        {/* BGP Route Monitor - Collapsible */}
        <div>
          <button onClick={() => setShowBGPMonitor(prev => !prev)} className="flex items-center gap-1 text-[10px] font-semibold text-gray-400 hover:text-white">
            {showBGPMonitor ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            <Radio className="w-3 h-3 text-cyan-400" />
            BGP Monitor
            <span className="px-1 py-0.5 rounded text-[8px] bg-green-500/20 text-green-400">LIVE</span>
          </button>
          {showBGPMonitor && <BGPRouteMonitor enabled={true} maxUpdates={150} />}
        </div>

        {/* Empty State with Seed Button */}
        {stats.withData === 0 && !loading && (
          <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-purple-700/50 rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-16 h-16 bg-purple-600/20 rounded-full flex items-center justify-center">
                <Zap className="w-8 h-8 text-purple-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white mb-2">No Network Security Data Yet</h3>
                <p className="text-gray-400 mb-4 max-w-lg mx-auto">
                  Click the <strong className="text-purple-400">"Populate Data"</strong> button above to automatically seed network security information using real ASN/RPKI data from your NotebookLM research.
                </p>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>📡 Includes real ASN numbers for major operators (Google, Microsoft, AWS, etc.)</p>
                  <p>🛡️ RPKI security status from Cloudflare's "Is BGP safe yet?" tracker</p>
                  <p>📚 Links to 15+ sources from your NotebookLM notebook</p>
                </div>
              </div>
              <button
                onClick={handleSeedData}
                disabled={isSeeding}
                className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-bold transition-colors text-lg shadow-lg"
              >
                <Zap className="w-5 h-5" />
                {isSeeding ? 'Populating Data...' : 'Populate All NotebookLM Data'}
              </button>
            </div>
          </div>
        )}

        {/* Main Data Table */}
        {stats.withData > 0 ? (
          <AdvancedDataTable
            data={enrichedData}
            columns={columns}
            title="Network Security & Infrastructure Registry"
            sources={sources}
            searchable={true}
            className="mt-6"
          />
        ) : null}

        {/* Add/Edit Modal */}
        {showAddModal && selectedFacility && (
          <NetworkSecurityModal
            facility={selectedFacility}
            existingRecord={editingRecord}
            asnOptions={asnOptions}
            asnNameOptions={asnNameOptions}
            providerOptions={providerOptions}
            ddosOptions={ddosOptions}
            onClose={() => {
              setShowAddModal(false);
              setSelectedFacility(null);
              setEditingRecord(null);
            }}
            onSave={() => {
              loadNetworkData();
              setShowAddModal(false);
              setSelectedFacility(null);
              setEditingRecord(null);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
});

NetworkSecurityTab.displayName = 'NetworkSecurityTab';

// Add/Edit Modal Component
interface NetworkSecurityModalProps {
  facility: Facility;
  existingRecord: NetworkSecurity | null;
  asnOptions: AutocompleteOption[];
  asnNameOptions: AutocompleteOption[];
  providerOptions: AutocompleteOption[];
  ddosOptions: AutocompleteOption[];
  onClose: () => void;
  onSave: () => void;
}

function NetworkSecurityModal({ facility, existingRecord, asnOptions, asnNameOptions, providerOptions, ddosOptions, onClose, onSave }: NetworkSecurityModalProps) {
  const [formData, setFormData] = useState<Partial<NetworkSecurity>>(
    existingRecord || {
      facilityId: facility.id || 0,
      rpkiStatus: 'Unknown',
    }
  );

  const handleSubmit = async () => {
    try {
      if (existingRecord) {
        await db.networkSecurity.update(existingRecord.id!, formData);
      } else {
        await db.networkSecurity.add(formData as NetworkSecurity);
      }
      onSave();
    } catch (error) {
      console.error('Failed to save network security data:', error);
      alert('Failed to save data. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-gray-800 border-b border-gray-700 p-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">
            {existingRecord ? 'Edit' : 'Add'} Network Security Data
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-3 mb-4">
            <div className="text-sm font-semibold text-white">{facility.name}</div>
            <div className="text-xs text-gray-500">{facility.city}, {facility.state} • {facility.operator}</div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ASN</label>
              <AutocompleteInput
                value={formData.asn || ''}
                onChange={(v) => setFormData({ ...formData, asn: v })}
                options={asnOptions}
                placeholder="e.g., AS15169"
                minChars={1}
                maxSuggestions={8}
                allowCustomValue
                id="netsec-asn"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">ASN Name</label>
              <AutocompleteInput
                value={formData.asnName || ''}
                onChange={(v) => setFormData({ ...formData, asnName: v })}
                options={asnNameOptions}
                placeholder="e.g., Google LLC"
                minChars={1}
                maxSuggestions={8}
                allowCustomValue
                id="netsec-asn-name"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">RPKI Status *</label>
            <select
              value={formData.rpkiStatus}
              onChange={(e) => setFormData({ ...formData, rpkiStatus: e.target.value as any })}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
              required
            >
              <option value="Unknown">Unknown</option>
              <option value="Safe">Safe (Full RPKI)</option>
              <option value="Partially Safe">Partially Safe</option>
              <option value="Unsafe">Unsafe (No RPKI)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Network Provider</label>
            <AutocompleteInput
              value={formData.networkProvider || ''}
              onChange={(v) => setFormData({ ...formData, networkProvider: v })}
              options={providerOptions}
              placeholder="e.g., Level 3, Cogent"
              minChars={1}
              maxSuggestions={8}
              allowCustomValue
              id="netsec-provider"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">DDoS Mitigation</label>
            <AutocompleteInput
              value={formData.ddosMitigation || ''}
              onChange={(v) => setFormData({ ...formData, ddosMitigation: v })}
              options={ddosOptions}
              placeholder="e.g., Cloudflare, Akamai"
              minChars={1}
              maxSuggestions={8}
              allowCustomValue
              id="netsec-ddos"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
            <textarea
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              placeholder="Additional security notes..."
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={handleSubmit}
              className="flex-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg py-2 font-semibold transition-colors"
            >
              {existingRecord ? 'Update' : 'Add'} Network Security Data
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 bg-gray-700 hover:bg-gray-600 text-white rounded-lg py-2 font-semibold transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default NetworkSecurityTab;

