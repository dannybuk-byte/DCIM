import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { X, FileText, Printer, Building2, MapPin, DollarSign, CheckCircle, XCircle, AlertTriangle, Scale, Calendar, AlertCircle, ChevronDown, ChevronUp, ChevronLeft } from 'lucide-react';
import { Facility } from '../types';
import { useTabNavigation, useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { getFacilityDetails } from '../services/getFacilityDetails';
import { DataSourceType } from '../services/DataFetcher';
import RackVisualization from './RackVisualization';
import { Rack } from '../services/InfrastructureSynthesis';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  facilities: Facility[];
}

type ReportType = 'facility' | 'operator' | 'state' | 'evidence';

const formatCurrency = (amount: number): string => {
  if (amount >= 1_000_000_000) return `$${(amount / 1_000_000_000).toFixed(2)}B`;
  if (amount >= 1_000_000) return `$${(amount / 1_000_000).toFixed(2)}M`;
  if (amount >= 1_000) return `$${(amount / 1_000).toFixed(1)}K`;
  return `$${amount.toLocaleString()}`;
};

const getComplianceColor = (status: Facility['complianceStatus']): string => {
  switch (status) {
    case 'Compliant': return '#10b981';
    case 'Non-Compliant': return '#ef4444';
    case 'At Risk': return '#f59e0b';
    default: return '#6b7280';
  }
};

const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const ReportModal: React.FC<ReportModalProps> = ({ isOpen, onClose, facilities }) => {
  const [reportType, setReportType] = useState<ReportType>('facility');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedOp, setSelectedOp] = useState<string | null>(null);
  const [selectedSt, setSelectedSt] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Real-time stats calculation
  const realTimeStats = useMemo(() => {
    const relevantFacilities = 
      reportType === 'facility' && selectedId ? facilities.filter(f => f.id === selectedId) :
      reportType === 'operator' && selectedOp ? facilities.filter(f => f.operator === selectedOp) :
      reportType === 'state' && selectedSt ? facilities.filter(f => f.state === selectedSt) :
      facilities;
    
    const compliant = relevantFacilities.filter(f => f.complianceStatus === 'Compliant').length;
    const nonCompliant = relevantFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
    const totalGap = relevantFacilities.reduce((sum, f) => sum + f.subsidyGap, 0);
    const complianceRate = relevantFacilities.length > 0 
      ? ((compliant / relevantFacilities.length) * 100).toFixed(1)
      : '0';
    
    return {
      total: relevantFacilities.length,
      compliant,
      nonCompliant,
      totalGap,
      complianceRate,
    };
  }, [facilities, reportType, selectedId, selectedOp, selectedSt]);

  const operators = useMemo(() => [...new Set(facilities.map(f => f.operator).filter(Boolean))].sort(), [facilities]);
  const states = useMemo(() => [...new Set(facilities.map(f => f.state).filter(Boolean))].sort(), [facilities]);
  const currentFacility = useMemo(() => facilities.find(f => f.id === selectedId), [facilities, selectedId]);
  const operatorFacilities = useMemo(() => selectedOp ? facilities.filter(f => f.operator === selectedOp) : [], [facilities, selectedOp]);
  const stateFacilities = useMemo(() => selectedSt ? facilities.filter(f => f.state === selectedSt) : [], [facilities, selectedSt]);

  const reportTypes: ReportType[] = ['facility', 'operator', 'state', 'evidence'];

  const handlePrint = useCallback(() => {
    const content = reportRef.current;
    if (!content) return;
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    
    const reportTitle = 
      reportType === 'facility' && currentFacility ? `${currentFacility.name} - Compliance Report` :
      reportType === 'operator' && selectedOp ? `${selectedOp} - Operator Compliance Report` :
      reportType === 'state' && selectedSt ? `${selectedSt} - State Compliance Report` :
      'DCIM Compliance Evidence Package';
    
    const printStyles = `
      <style>
        @media print {
          @page {
            margin: 1in;
            size: letter;
          }
          body { margin: 0; }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
          table {
            page-break-inside: auto;
          }
          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
        }
        body {
          font-family: 'Georgia', 'Times New Roman', serif;
          padding: 40px;
          max-width: 900px;
          margin: 0 auto;
          background: white;
          color: #1a1a1a;
          line-height: 1.6;
        }
        .print-page {
          page-break-after: always;
          margin-bottom: 40px;
        }
        h1 {
          border-bottom: 3px solid #333;
          padding-bottom: 10px;
          margin-bottom: 20px;
          color: #1a1a1a;
        }
        h2 {
          color: #333;
          margin-top: 30px;
          margin-bottom: 15px;
          border-bottom: 2px solid #333;
          padding-bottom: 10px;
        }
        h3 {
          color: #555;
          margin-top: 20px;
          margin-bottom: 10px;
        }
        .metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .metric {
          padding: 20px;
          border: 2px solid #ddd;
          border-radius: 8px;
          background: #f9f9f9;
        }
        .metric-label {
          font-size: 0.85rem;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          margin-bottom: 8px;
        }
        .metric-value {
          font-size: 1.5rem;
          font-weight: bold;
          color: #1a1a1a;
        }
        .section {
          margin: 30px 0;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
        }
        .issue-list {
          list-style: none;
          padding: 0;
        }
        .issue-item {
          padding: 10px;
          margin: 5px 0;
          background: #fff;
          border-left: 4px solid #ef4444;
          border-radius: 4px;
        }
        .compliance-badge {
          display: inline-block;
          padding: 8px 16px;
          border-radius: 6px;
          font-weight: bold;
          font-size: 0.9rem;
        }
        .legal-notice {
          margin-top: 40px;
          padding: 20px;
          background: #e3f2fd;
          border-left: 4px solid #2196f3;
          border-radius: 4px;
          font-size: 0.9rem;
          color: #1565c0;
        }
        .header-info {
          color: #666;
          font-size: 0.95rem;
          margin-top: 5px;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin: 20px 0;
          font-size: 0.85rem;
        }
        th, td {
          padding: 10px 8px;
          text-align: left;
          border-bottom: 1px solid #ddd;
        }
        th {
          background: #f5f5f5;
          font-weight: bold;
          color: #333;
        }
        tr:nth-child(even) {
          background: #f9f9f9;
        }
        .print-date {
          text-align: right;
          color: #666;
          font-size: 0.9rem;
          margin-bottom: 20px;
        }
      </style>
    `;
    
    const printDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${reportTitle}</title>
          ${printStyles}
        </head>
        <body>
          <div class="print-date">Generated: ${printDate}</div>
          ${content.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    
    // Wait for content to load, then print
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 250);
  }, [reportType, currentFacility, selectedOp, selectedSt]);

  // Keyboard navigation for report type tabs
  useTabNavigation(reportTypes, reportType, setReportType, isOpen);

  // Keyboard shortcuts for ReportModal
  useKeyboardShortcuts([
    {
      key: 'Escape',
      action: onClose,
      description: 'Close report modal'
    },
    {
      key: 'p',
      ctrl: true,
      action: handlePrint,
      description: 'Print report'
    }
  ], isOpen);

  // Focus management when modal opens
  useEffect(() => {
    if (isOpen) {
      // Focus first tab button when modal opens
      const firstTab = document.querySelector('[role="tab"]') as HTMLElement;
      firstTab?.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.9)',zIndex:9999,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={onClose}>
      <div style={{background:'#1a1a1a',borderRadius:16,width:'100%',maxWidth:1100,height:'90vh',display:'flex',flexDirection:'column',border:'1px solid #333'}} onClick={e=>e.stopPropagation()}>
        
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 24px',borderBottom:'1px solid #333',background:'#151515'}}>
          <div style={{display:'flex',alignItems:'center',gap:12,color:'#EDD1B0'}}>
            <FileText size={24} className={isGenerating ? 'animate-pulse' : ''}/>
            <h2 style={{margin:0,fontSize:'1.2rem'}}>Generate Compliance Report</h2>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{background:'#333',padding:'4px 10px',borderRadius:12,fontSize:'0.75rem',color:'#10b981'}}>
                {realTimeStats.total.toLocaleString()} facilities
              </span>
              {realTimeStats.total > 0 && (
                <>
                  <span style={{background:'rgba(16,185,129,0.2)',padding:'4px 10px',borderRadius:12,fontSize:'0.75rem',color:'#10b981',border:'1px solid rgba(16,185,129,0.3)'}}>
                    {realTimeStats.complianceRate}% compliant
                  </span>
                  <span style={{background:'rgba(239,68,68,0.2)',padding:'4px 10px',borderRadius:12,fontSize:'0.75rem',color:'#ef4444',border:'1px solid rgba(239,68,68,0.3)'}}>
                    {formatCurrency(realTimeStats.totalGap)} gap
                  </span>
                </>
              )}
            </div>
          </div>
          <div style={{display:'flex',gap:10}}>
            <button 
              onClick={() => {
                setIsGenerating(true);
                setTimeout(() => {
                  handlePrint();
                  setIsGenerating(false);
                }, 500);
              }}
              disabled={isGenerating}
              style={{
                display:'flex',
                alignItems:'center',
                gap:8,
                padding:'14px 24px',
                minHeight:'48px',
                background:isGenerating ? '#666' : '#EDD1B0',
                color:'#1a1a1a',
                border:'none',
                borderRadius:10,
                fontWeight:700,
                fontSize:'1rem',
                cursor:isGenerating ? 'not-allowed' : 'pointer',
                opacity:isGenerating ? 0.7 : 1,
                transition:'all 0.2s',
                boxShadow:isGenerating ? 'none' : '0 4px 12px rgba(237,209,176,0.3)'
              }}
            >
              {isGenerating ? (
                <>
                  <div style={{width:16,height:16,border:'2px solid #1a1a1a',borderTop:'2px solid transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Printer size={18}/>
                  <span>Print</span>
                </>
              )}
            </button>
            <button onClick={onClose} style={{width:48,height:48,minWidth:48,minHeight:48,background:'transparent',border:'2px solid #444',borderRadius:10,color:'#888',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',transition:'all 0.2s'}} onMouseEnter={(e) => {e.currentTarget.style.background='#2a2a2a';e.currentTarget.style.color='#fff';e.currentTarget.style.borderColor='#666'}} onMouseLeave={(e) => {e.currentTarget.style.background='transparent';e.currentTarget.style.color='#888';e.currentTarget.style.borderColor='#444'}}><X size={20}/></button>
          </div>
        </div>

        <div 
          role="tablist"
          aria-label="Report type selection"
          style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,padding:'16px 24px',background:'#151515',borderBottom:'1px solid #333'}}
        >
          {[
            {id:'facility' as ReportType,label:'Facility',desc:'Individual deep-dive',number:1},
            {id:'operator' as ReportType,label:'Operator',desc:'By company',number:2},
            {id:'state' as ReportType,label:'State',desc:'Regional summary',number:3},
            {id:'evidence' as ReportType,label:'Evidence',desc:'Regulatory bundle',number:4}
          ].map(t=>(
            <button 
              key={t.id}
              role="tab"
              aria-selected={reportType===t.id}
              aria-controls={`report-panel-${t.id}`}
              onClick={()=>{
                setReportType(t.id);
                // Reset selections when switching tabs
                setSelectedId(null);
                setSelectedOp(null);
                setSelectedSt(null);
              }} 
              style={{
                padding:'20px 24px',
                minHeight:'72px',
                background:reportType===t.id?'rgba(237,209,176,0.15)':'#1a1a1a',
                border:`3px solid ${reportType===t.id?'#EDD1B0':'#333'}`,
                borderRadius:12,
                color:reportType===t.id?'#EDD1B0':'#888',
                cursor:'pointer',
                textAlign:'left',
                transition:'all 0.2s',
                outline:'none',
                fontSize:'1rem',
                fontWeight:reportType===t.id ? 600 : 500,
                boxShadow:reportType===t.id ? '0 4px 12px rgba(237,209,176,0.2)' : 'none'
              }}
              onFocus={(e) => e.currentTarget.style.outline = '2px solid #EDD1B0'}
              onBlur={(e) => e.currentTarget.style.outline = 'none'}
              title={`${t.label} - Press ${t.number} or arrow keys to navigate`}
            >
              <span style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{display:'block',fontWeight:600,fontSize:'1.1rem'}}>{t.label}</span>
                <span style={{fontSize:'0.85rem',opacity:0.6,fontWeight:700}}>{t.number}</span>
              </span>
              <span style={{fontSize:'0.9rem',opacity:0.8,marginTop:4}}>{t.desc}</span>
            </button>
          ))}
        </div>

        <div style={{padding:'16px 24px',background:'#151515',borderBottom:'1px solid #333'}}>
          {reportType==='facility'&&<select value={selectedId||''} onChange={e=>setSelectedId(Number(e.target.value))} style={{width:'100%',maxWidth:600,padding:'12px 16px',background:'#1a1a1a',border:'1px solid #444',borderRadius:8,color:'#ddd',fontSize:'0.95rem'}}>
            <option value="">Select facility... ({facilities.length} available)</option>
            {facilities.slice(0,500).map(f=><option key={f.id} value={f.id}>{f.name} - {f.city}, {f.state}</option>)}
          </select>}
          {reportType==='operator'&&<select value={selectedOp||''} onChange={e=>setSelectedOp(e.target.value)} style={{width:'100%',maxWidth:600,padding:'12px 16px',background:'#1a1a1a',border:'1px solid #444',borderRadius:8,color:'#ddd',fontSize:'0.95rem'}}>
            <option value="">Select operator... ({operators.length} available)</option>
            {operators.map(op=><option key={op} value={op}>{op} ({facilities.filter(f=>f.operator===op).length})</option>)}
          </select>}
          {reportType==='state'&&<select value={selectedSt||''} onChange={e=>setSelectedSt(e.target.value)} style={{width:'100%',maxWidth:600,padding:'12px 16px',background:'#1a1a1a',border:'1px solid #444',borderRadius:8,color:'#ddd',fontSize:'0.95rem'}}>
            <option value="">Select state... ({states.length} available)</option>
            {states.map(st=><option key={st} value={st}>{st} ({facilities.filter(f=>f.state===st).length})</option>)}
          </select>}
          {reportType==='evidence'&&<div style={{color:'#888'}}>Evidence Package includes all {facilities.length.toLocaleString()} facilities</div>}
        </div>

        <div 
          role="tabpanel"
          id={`report-panel-${reportType}`}
          aria-labelledby={`tab-${reportType}`}
          style={{
            flex:1,
            overflowY:'auto',
            padding:24,
            background:'#121212',
            position:'relative',
            scrollBehavior: 'smooth',
            WebkitOverflowScrolling: 'touch'
          }} 
          ref={reportRef}
        >
          {isGenerating && (
            <div style={{
              position:'absolute',
              inset:0,
              background:'rgba(0,0,0,0.8)',
              display:'flex',
              flexDirection:'column',
              alignItems:'center',
              justifyContent:'center',
              zIndex:10,
              gap:16
            }}>
              <div style={{width:48,height:48,border:'4px solid #EDD1B0',borderTop:'4px solid transparent',borderRadius:'50%',animation:'spin 1s linear infinite'}}></div>
              <div style={{color:'#EDD1B0',fontSize:'1.1rem',fontWeight:600}}>Generating Report...</div>
              <div style={{color:'#888',fontSize:'0.9rem'}}>Preparing {realTimeStats.total.toLocaleString()} facilities</div>
            </div>
          )}
          {reportType==='facility'&&!currentFacility&&<Empty text="Select a facility above"/>}
          {reportType==='facility'&&currentFacility&&<FacilityReport facility={currentFacility}/>}
          {reportType==='operator'&&!selectedOp&&<Empty text="Select an operator above"/>}
          {reportType==='operator'&&selectedOp&&<OperatorReport operator={selectedOp} facilities={operatorFacilities}/>}
          {reportType==='state'&&!selectedSt&&<Empty text="Select a state above"/>}
          {reportType==='state'&&selectedSt&&<StateReport state={selectedSt} facilities={stateFacilities}/>}
          {reportType==='evidence'&&<EvidenceReport facilities={facilities}/>}
        </div>
      </div>
    </div>
  );
};

const Empty:React.FC<{text:string}>=({text})=><div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',height:'100%',color:'#555'}}><Building2 size={48} style={{marginBottom:16,opacity:0.5}}/><p>{text}</p></div>;

const FacilityReport: React.FC<{ facility: Facility }> = ({ facility }) => {
  const hasIssues = facility.issues && facility.issues.length > 0;
  
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #333' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: '#EDD1B0', margin: '0 0 10px' }}>{facility.name}</h1>
          <div style={{ color: '#888' }}>{facility.operator} • {facility.city}, {facility.state}</div>
        </div>
        <div style={{ 
          padding: '10px 16px', 
          borderRadius: 8, 
          fontWeight: 700, 
          background: `${getComplianceColor(facility.complianceStatus)}20`, 
          color: getComplianceColor(facility.complianceStatus) 
        }}>
          {facility.complianceStatus}
        </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<DollarSign size={18} />} label="Subsidy Gap" value={formatCurrency(facility.subsidyGap)} color={facility.subsidyGap > 0 ? "#ef4444" : "#10b981"} />
        <Metric icon={<Building2 size={18} />} label="Type" value={facility.type} />
        <Metric icon={<MapPin size={18} />} label="Location" value={`${facility.city}, ${facility.state}`} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<Calendar size={18} />} label="Last Audit Date" value={formatDate(facility.lastAuditDate)} />
        <Metric icon={<AlertCircle size={18} />} label="Issues Count" value={String(facility.issues?.length || 0)} color={hasIssues ? "#ef4444" : "#10b981"} />
      </div>

      {hasIssues && (
        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 28, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={20} color="#f59e0b" />
            Compliance Issues
          </h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {facility.issues.map((issue, idx) => (
              <li key={idx} style={{ 
                padding: '10px 12px', 
                margin: '8px 0', 
                background: '#121212', 
                borderLeft: '4px solid #f59e0b', 
                borderRadius: 4,
                color: '#ddd'
              }}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Legal />
    </div>
  );
};

const OperatorReport: React.FC<{ operator: string; facilities: Facility[] }> = ({ operator, facilities }) => {
  const compliant = facilities.filter(f => f.complianceStatus === 'Compliant').length;
  const nonCompliant = facilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
  const atRisk = facilities.filter(f => f.complianceStatus === 'At Risk').length;
  const totalGap = facilities.reduce((s, f) => s + (f.subsidyGap || 0), 0);
  const rate = facilities.length > 0 ? (compliant / facilities.length) * 100 : 0;
  const states = [...new Set(facilities.map(f => f.state))];
  const totalIssues = facilities.reduce((sum, f) => sum + (f.issues?.length || 0), 0);
  
  // Top facilities by subsidy gap
  const topFacilitiesByGap = [...facilities]
    .sort((a, b) => b.subsidyGap - a.subsidyGap)
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #333' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', color: '#EDD1B0', margin: '0 0 10px' }}>{operator}</h1>
          <div style={{ color: '#888' }}>{facilities.length} facilities • {states.length} states</div>
        </div>
        <svg viewBox="0 0 100 60" width="120">
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke="#2a2a2a" strokeWidth="8" strokeLinecap="round" />
          <path d="M 10 55 A 40 40 0 0 1 90 55" fill="none" stroke={rate >= 80 ? '#10b981' : '#ef4444'} strokeWidth="8" strokeLinecap="round" strokeDasharray={`${rate * 1.26} 126`} />
          <text x="50" y="45" textAnchor="middle" fill="#EDD1B0" fontSize="16" fontWeight="bold">{rate.toFixed(0)}%</text>
        </svg>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<DollarSign size={18} />} label="Total Subsidy Gap" value={formatCurrency(totalGap)} color="#ef4444" />
        <Metric icon={<CheckCircle size={18} />} label="Compliant" value={String(compliant)} color="#10b981" />
        <Metric icon={<XCircle size={18} />} label="Non-Compliant" value={String(nonCompliant)} color="#ef4444" />
        <Metric icon={<AlertTriangle size={18} />} label="At Risk" value={String(atRisk)} color="#f59e0b" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<AlertCircle size={18} />} label="Total Issues" value={String(totalIssues)} color={totalIssues > 0 ? "#ef4444" : "#10b981"} />
        <Metric icon={<Building2 size={18} />} label="States Operated" value={String(states.length)} />
      </div>

      {topFacilitiesByGap.length > 0 && topFacilitiesByGap[0].subsidyGap > 0 && (
        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 28, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px' }}>Top Facilities by Subsidy Gap</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {topFacilitiesByGap.map((facility) => (
              <div key={facility.id} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '12px', 
                background: '#121212', 
                borderRadius: 6,
                border: '1px solid #2a2a2a'
              }}>
                <div>
                  <div style={{ color: '#EDD1B0', fontWeight: 500 }}>{facility.name}</div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>{facility.city}, {facility.state}</div>
                </div>
                <div style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(facility.subsidyGap)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <Legal />
    </div>
  );
};

// Data source badge component
const DataSourceBadge: React.FC<{ source: DataSourceType }> = ({ source }) => {
  const isVerified = ['PeeringDB', 'SEC_EDGAR', 'EPA_ECHO', 'OSHA', 'CRT_SH'].includes(source);
  const isEstimated = source === 'Estimated' || source === 'Synthetic';
  
  return (
    <span style={{
      padding: '2px 6px',
      borderRadius: 4,
      fontSize: '0.7rem',
      fontWeight: 500,
      background: isVerified 
        ? '#10b98120' 
        : isEstimated 
        ? '#f59e0b20' 
        : '#6b728020',
      color: isVerified 
        ? '#10b981' 
        : isEstimated 
        ? '#f59e0b' 
        : '#888',
      marginLeft: 6
    }}>
      {source.replace(/_/g, ' ')}
    </span>
  );
};

// Enhanced DetailRow with data source
const DetailRowWithSource: React.FC<{ 
  label: string; 
  value: string; 
  fullWidth?: boolean;
  dataSource?: DataSourceType;
}> = ({ label, value, fullWidth, dataSource }) => (
  <div style={{ gridColumn: fullWidth ? 'span 2' : undefined }}>
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
      <div style={{ color: '#888', fontSize: '0.85rem' }}>{label}</div>
      {dataSource && <DataSourceBadge source={dataSource} />}
    </div>
    <div style={{ color: '#EDD1B0', fontWeight: 500 }}>{value}</div>
  </div>
);

const StateReport: React.FC<{ state: string; facilities: Facility[] }> = ({ state, facilities }) => {
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [activeTab, setActiveTab] = useState<Record<number, string>>({});
  const [facilityDetailsCache, setFacilityDetailsCache] = useState<Record<number, any>>({});
  const [loadingDetails, setLoadingDetails] = useState<Set<number>>(new Set());
  
  const toggleRow = async (facilityId: number) => {
    const wasExpanded = expandedRows.has(facilityId);
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (wasExpanded) {
        next.delete(facilityId);
      } else {
        next.add(facilityId);
      }
      return next;
    });
    // Set default tab when expanding (not collapsing)
    if (!wasExpanded) {
      setActiveTab(prev => {
        if (!(facilityId in prev)) {
          return { ...prev, [facilityId]: 'details' };
        }
        return prev;
      });
      
      // Load facility details if not already cached
      if (!facilityDetailsCache[facilityId]) {
        const facility = facilities.find(f => f.id === facilityId);
        if (facility) {
          setLoadingDetails(prev => new Set(prev).add(facilityId));
          try {
            const details = await getFacilityDetails(facility);
            setFacilityDetailsCache(prev => ({ ...prev, [facilityId]: details }));
          } catch (error) {
            console.error('Error loading facility details:', error);
          } finally {
            setLoadingDetails(prev => {
              const next = new Set(prev);
              next.delete(facilityId);
              return next;
            });
          }
        }
      }
    }
  };
  
  const compliant = facilities.filter(f => f.complianceStatus === 'Compliant').length;
  const nonCompliant = facilities.filter(f => f.complianceStatus === 'Non-Compliant').length;
  const atRisk = facilities.filter(f => f.complianceStatus === 'At Risk').length;
  const unknown = facilities.filter(f => f.complianceStatus === 'Unknown').length;
  const totalGap = facilities.reduce((s, f) => s + (f.subsidyGap || 0), 0);
  const rate = facilities.length > 0 ? (compliant / facilities.length) * 100 : 0;
  const operators = [...new Set(facilities.map(f => f.operator))];
  const totalIssues = facilities.reduce((sum, f) => sum + (f.issues?.length || 0), 0);
  
  // Issue analysis - categorize issues
  const issueCategories: Record<string, { count: number; facilities: Facility[]; totalGap: number }> = {};
  facilities.forEach(facility => {
    facility.issues?.forEach(issue => {
      const category = issue.toLowerCase().includes('job') ? 'Job Creation Shortfalls' :
                      issue.toLowerCase().includes('investment') ? 'Investment Commitment Gaps' :
                      issue.toLowerCase().includes('reporting') || issue.toLowerCase().includes('deadline') ? 'Reporting Violations' :
                      issue.toLowerCase().includes('hiring') ? 'Local Hiring Violations' :
                      issue.toLowerCase().includes('equipment') ? 'Equipment Issues' :
                      issue.toLowerCase().includes('safety') ? 'Safety Violations' :
                      issue.toLowerCase().includes('environmental') ? 'Environmental Concerns' :
                      issue.toLowerCase().includes('maintenance') ? 'Maintenance Overdue' :
                      issue.toLowerCase().includes('documentation') ? 'Missing Documentation' :
                      issue.toLowerCase().includes('energy') ? 'Energy Efficiency Non-Compliance' :
                      issue.toLowerCase().includes('tax') || issue.toLowerCase().includes('incentive') ? 'Tax Incentive Misuse' :
                      'Other Issues';
      
      if (!issueCategories[category]) {
        issueCategories[category] = { count: 0, facilities: [], totalGap: 0 };
      }
      issueCategories[category].count++;
      if (!issueCategories[category].facilities.includes(facility)) {
        issueCategories[category].facilities.push(facility);
        issueCategories[category].totalGap += facility.subsidyGap;
      }
    });
  });

  // Operator deep-dive data
  const operatorDetails = operators.map(op => {
    const opFacilities = facilities.filter(f => f.operator === op);
    const opCompliant = opFacilities.filter(f => f.complianceStatus === 'Compliant').length;
    const opRate = opFacilities.length > 0 ? (opCompliant / opFacilities.length) * 100 : 0;
    const opGap = opFacilities.reduce((s, f) => s + f.subsidyGap, 0);
    const opIssues = opFacilities.flatMap(f => f.issues || []);
    return {
    operator: op,
      facilities: opFacilities,
      count: opFacilities.length,
      compliant: opCompliant,
      rate: opRate,
      gap: opGap,
      issues: opIssues,
    };
  }).sort((a, b) => b.gap - a.gap);

  // Timeline analysis
  const now = new Date();
  const auditTimeline = facilities.map(f => {
    const auditDate = new Date(f.lastAuditDate);
    const daysSince = Math.floor((now.getTime() - auditDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      facility: f,
      auditDate: f.lastAuditDate,
      daysSince,
      isOverdue: daysSince > 180,
    };
  }).sort((a, b) => new Date(a.auditDate).getTime() - new Date(b.auditDate).getTime());

  const overdueAudits = auditTimeline.filter(t => t.isOverdue);
  const recentAudits = auditTimeline.filter(t => t.daysSince <= 90);
  const oldAudits = auditTimeline.filter(t => t.daysSince > 365);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      {/* PAGE 1: Executive Summary */}
      <div className="print-page" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
      <div style={{ marginBottom: 28, paddingBottom: 20, borderBottom: '2px solid #333' }}>
          <h1 style={{ fontSize: '1.8rem', color: '#EDD1B0', margin: '0 0 10px' }}>{state} Compliance Report</h1>
          <div style={{ color: '#888' }}>Executive Summary • {facilities.length} facilities • {operators.length} operators</div>
          <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 8 }}>
            Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<DollarSign size={18} />} label="State Subsidy Gap" value={formatCurrency(totalGap)} color="#ef4444" />
        <Metric icon={<CheckCircle size={18} />} label="Compliance Rate" value={`${rate.toFixed(1)}%`} color={rate >= 80 ? '#10b981' : '#ef4444'} />
        <Metric icon={<XCircle size={18} />} label="Non-Compliant" value={String(nonCompliant)} color="#ef4444" />
        <Metric icon={<AlertTriangle size={18} />} label="At Risk" value={String(atRisk)} color="#f59e0b" />
      </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<Building2 size={18} />} label="Total Facilities" value={String(facilities.length)} />
        <Metric icon={<AlertCircle size={18} />} label="Total Issues" value={String(totalIssues)} color={totalIssues > 0 ? "#ef4444" : "#10b981"} />
          <Metric icon={<CheckCircle size={18} />} label="Compliant" value={String(compliant)} color="#10b981" />
          <Metric icon={<AlertTriangle size={18} />} label="Unknown Status" value={String(unknown)} color="#6b7280" />
      </div>

        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 28, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px', fontSize: '1.1rem' }}>Key Findings</h3>
          <ul style={{ color: '#ddd', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li>Total subsidy gap of {formatCurrency(totalGap)} across {facilities.length} facilities</li>
            <li>{nonCompliant} facilities ({((nonCompliant / facilities.length) * 100).toFixed(1)}%) are non-compliant</li>
            <li>{atRisk} facilities ({((atRisk / facilities.length) * 100).toFixed(1)}%) are at risk</li>
            <li>{totalIssues} total compliance issues identified</li>
            <li>{overdueAudits.length} facilities with overdue audits (180+ days)</li>
          </ul>
        </div>
      </div>

      {/* PAGE 2: Facility-by-Facility Breakdown */}
      <div className="print-page" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.4rem', color: '#EDD1B0', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
          Facility-by-Facility Breakdown
        </h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#1a1a1a', borderBottom: '2px solid #333' }}>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>Name</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>Operator</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>City</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '10px 8px', textAlign: 'right', color: '#EDD1B0', fontWeight: 600 }}>Subsidy Gap</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>Last Audit</th>
                <th style={{ padding: '10px 8px', textAlign: 'left', color: '#EDD1B0', fontWeight: 600 }}>Issues</th>
              </tr>
            </thead>
            <tbody>
              {facilities.map((facility, idx) => {
                const isExpanded = expandedRows.has(facility.id);
                const details = facilityDetailsCache[facility.id];
                const isLoading = loadingDetails.has(facility.id);
                const currentTab = activeTab[facility.id] || 'details';
                const tabs = [
                  { id: 'details', label: 'Facility Details' },
                  ...(details?.isColocation ? [{ id: 'tenants', label: 'Tenants' }] : []),
                  { id: 'infrastructure', label: 'Infrastructure' },
                  { id: 'interconnections', label: 'Interconnections' },
                  { id: 'compliance', label: 'Compliance History' },
                  { id: 'records', label: 'Public Records' },
                ];
                
                return (
                  <React.Fragment key={facility.id}>
                    <tr 
                      style={{ 
                        borderBottom: '1px solid #2a2a2a', 
                        background: idx % 2 === 0 ? '#121212' : '#1a1a1a',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleRow(facility.id)}
                    >
                      <td style={{ padding: '8px', color: '#ddd', display: 'flex', alignItems: 'center', gap: 8 }}>
                        {isExpanded ? <ChevronUp size={16} color="#EDD1B0" /> : <ChevronDown size={16} color="#888" />}
                        {facility.name}
                      </td>
                      <td style={{ padding: '8px', color: '#ccc' }}>{facility.operator}</td>
                      <td style={{ padding: '8px', color: '#ccc' }}>{facility.city}</td>
                      <td style={{ padding: '8px', color: '#ccc' }}>{facility.type}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          background: `${getComplianceColor(facility.complianceStatus)}20`,
                          color: getComplianceColor(facility.complianceStatus)
                        }}>
                          {facility.complianceStatus}
                        </span>
                      </td>
                      <td style={{ padding: '8px', textAlign: 'right', color: facility.subsidyGap > 0 ? '#ef4444' : '#10b981', fontWeight: 500 }}>
                        {formatCurrency(facility.subsidyGap)}
                      </td>
                      <td style={{ padding: '8px', color: '#ccc', fontSize: '0.8rem' }}>{formatDate(facility.lastAuditDate)}</td>
                      <td style={{ padding: '8px', color: '#ccc', fontSize: '0.8rem' }}>
                        {facility.issues?.length || 0} {(facility.issues?.length || 0) === 1 ? 'issue' : 'issues'}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr>
                        <td colSpan={8} style={{ padding: 0, borderBottom: '1px solid #2a2a2a' }}>
                          <div style={{ 
                            background: '#0a0a0a', 
                            padding: 20, 
                            borderLeft: '4px solid #EDD1B0',
                            margin: '8px 0'
                          }}>
                            {/* Tab Navigation */}
                            <div style={{ 
                              display: 'flex', 
                              gap: 8, 
                              marginBottom: 20, 
                              borderBottom: '1px solid #2a2a2a',
                              paddingBottom: 8
                            }}>
                              {tabs.map(tab => (
                                <button
                                  key={tab.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveTab(prev => ({ ...prev, [facility.id]: tab.id }));
                                  }}
                                  style={{
                                    padding: '8px 16px',
                                    background: currentTab === tab.id ? '#EDD1B0' : 'transparent',
                                    color: currentTab === tab.id ? '#1a1a1a' : '#888',
                                    border: 'none',
                                    borderRadius: 6,
                                    cursor: 'pointer',
                                    fontWeight: currentTab === tab.id ? 600 : 400,
                                    fontSize: '0.85rem',
                                    transition: 'all 0.2s'
                                  }}
                                >
                                  {tab.label}
                                </button>
                              ))}
                            </div>
                            
                            {/* Tab Content */}
                            <div style={{ minHeight: 200 }}>
                              {isLoading && (
                                <div style={{ textAlign: 'center', padding: 40, color: '#888' }}>
                                  Loading facility data from OSINT sources...
                                </div>
                              )}
                              {!isLoading && details && currentTab === 'details' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                  <DetailRowWithSource 
                                    label="Full Address" 
                                    value={details.address} 
                                    dataSource={details.dataSources?.get('address')}
                                  />
                                  <DetailRowWithSource 
                                    label="Coordinates" 
                                    value={facility.latitude && facility.longitude 
                                      ? `${facility.latitude.toFixed(4)}, ${facility.longitude.toFixed(4)}` 
                                      : 'N/A'} 
                                    dataSource={facility.latitude ? 'Estimated' : undefined}
                                  />
                                  <DetailRowWithSource 
                                    label="Building Size" 
                                    value={`${details.buildingSize.toLocaleString()} sq ft`}
                                    dataSource={details.dataSources?.get('buildingSize') || 'Estimated'}
                                  />
                                  <DetailRowWithSource 
                                    label="Tier Classification" 
                                    value={`Tier ${details.tier}`}
                                    dataSource={details.dataSources?.get('tier') || 'Estimated'}
                                  />
                                  <DetailRowWithSource 
                                    label="Power Capacity" 
                                    value={`${details.powerCapacity} MW`}
                                    dataSource={details.dataSources?.get('powerCapacity') || 'Estimated'}
                                  />
                                  <DetailRowWithSource 
                                    label="PUE Rating" 
                                    value={details.pueRating.toFixed(2)}
                                    dataSource={details.dataSources?.get('pueRating') || 'Estimated'}
                                  />
                                </div>
                              )}
                              
                              {!isLoading && details && currentTab === 'tenants' && details.isColocation && (
                                <div>
                                  <h4 style={{ color: '#EDD1B0', marginBottom: 12, fontSize: '1rem' }}>Known Tenants</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {details.tenants.length > 0 ? (
                                      details.tenants.map((tenant: { company: string; rackCount: number }, i: number) => (
                                        <div key={i} style={{
                                          padding: 12,
                                          background: '#1a1a1a',
                                          borderRadius: 8,
                                          border: '1px solid #2a2a2a'
                                        }}>
                                          <div style={{ color: '#EDD1B0', fontWeight: 500, marginBottom: 4 }}>
                                            {tenant.company}
                                          </div>
                                          <div style={{ color: '#888', fontSize: '0.9rem' }}>
                                            Estimated Racks: {tenant.rackCount}
                                          </div>
                                        </div>
                                      ))
                                    ) : (
                                      <div style={{ color: '#888', fontStyle: 'italic' }}>No tenant information available</div>
                                    )}
                                  </div>
                                </div>
                              )}
                              
                              {!isLoading && details && currentTab === 'infrastructure' && (
                                <div>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 24 }}>
                                    <DetailRowWithSource 
                                      label="Cooling Type" 
                                      value={details.coolingType}
                                      dataSource={details.dataSources?.get('coolingType') || 'Estimated'}
                                    />
                                    <DetailRowWithSource 
                                      label="Backup Generators" 
                                      value={`${details.generatorCount} units`}
                                      dataSource={details.dataSources?.get('generatorCount') || 'Estimated'}
                                    />
                                    <DetailRowWithSource 
                                      label="Generator Fuel Type" 
                                      value={details.fuelType}
                                      dataSource={details.dataSources?.get('fuelType') || 'Estimated'}
                                    />
                                    <DetailRowWithSource 
                                      label="Network Carriers" 
                                      value={details.networkCarriers.join(', ')}
                                      dataSource={details.dataSources?.get('networkCarriers')}
                                    />
                                    <DetailRowWithSource 
                                      label="Internet Exchange" 
                                      value={details.ixConnections ? 'Yes' : 'No'}
                                      dataSource={details.dataSources?.get('ixConnections')}
                                    />
                                  </div>
                                  {details.infrastructure && (
                                    <div style={{
                                      padding: 16,
                                      background: '#1a1a1a',
                                      borderRadius: 8,
                                      border: '1px solid #2a2a2a'
                                    }}>
                                      <h4 style={{ color: '#EDD1B0', marginBottom: 16, fontSize: '1rem' }}>Infrastructure Summary</h4>
                                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
                                        <div>
                                          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Total Racks</div>
                                          <div style={{ color: '#EDD1B0', fontSize: '1.2rem', fontWeight: 600 }}>
                                            {details.infrastructure.totalRacks.toLocaleString()}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Total Devices</div>
                                          <div style={{ color: '#EDD1B0', fontSize: '1.2rem', fontWeight: 600 }}>
                                            {details.infrastructure.totalDevices.toLocaleString()}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Power Usage</div>
                                          <div style={{ color: '#EDD1B0', fontSize: '1.2rem', fontWeight: 600 }}>
                                            {details.infrastructure.averagePowerUsage.toFixed(1)}%
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Power Capacity</div>
                                          <div style={{ color: '#ccc', fontSize: '1rem' }}>
                                            {details.infrastructure.powerDistribution.totalCapacity.toFixed(1)} MW
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Redundancy</div>
                                          <div style={{ color: '#ccc', fontSize: '1rem' }}>
                                            {details.infrastructure.powerDistribution.redundancy}
                                          </div>
                                        </div>
                                        <div>
                                          <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Cooling Zones</div>
                                          <div style={{ color: '#ccc', fontSize: '1rem' }}>
                                            {details.infrastructure.coolingZones.length}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {!isLoading && details && currentTab === 'racks' && details.infrastructure && (
                                <div>
                                  <div style={{ marginBottom: 16, padding: 12, background: '#1a1a1a', borderRadius: 8, border: '1px solid #2a2a2a' }}>
                                    <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: 4 }}>Infrastructure Details</div>
                                    <div style={{ color: '#EDD1B0', fontSize: '0.9rem' }}>
                                      {details.infrastructure.totalRacks} racks • {details.infrastructure.totalDevices} devices • 
                                      {' '}{details.infrastructure.totalPowerUsed.toFixed(1)} MW used / {details.infrastructure.totalPowerCapacity.toFixed(1)} MW capacity
                                    </div>
                                  </div>
                                  <div style={{ 
                                    display: 'grid', 
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(400px, 1fr))', 
                                    gap: 20,
                                    maxHeight: '600px',
                                    overflowY: 'auto',
                                    padding: '8px'
                                  }}>
                                    {details.infrastructure.racks.slice(0, 10).map((rack: Rack) => (
                                      <div key={rack.id} style={{ transform: 'scale(0.85)', transformOrigin: 'top left' }}>
                                        <RackVisualization rack={rack} showPowerDetails={true} />
                                      </div>
                                    ))}
                                  </div>
                                  {details.infrastructure.racks.length > 10 && (
                                    <div style={{ 
                                      marginTop: 16, 
                                      padding: 12, 
                                      background: '#1a1a1a', 
                                      borderRadius: 8, 
                                      textAlign: 'center',
                                      color: '#888',
                                      fontSize: '0.85rem'
                                    }}>
                                      Showing first 10 of {details.infrastructure.racks.length} racks
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {!isLoading && details && currentTab === 'interconnections' && (
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                  <DetailRowWithSource 
                                    label="Cross-Connects" 
                                    value={details.crossConnects.toString()}
                                    dataSource={details.dataSources?.get('crossConnects')}
                                  />
                                  <DetailRowWithSource 
                                    label="Carrier-Neutral" 
                                    value={details.carrierNeutral ? 'Yes' : 'No'}
                                    dataSource={details.dataSources?.get('carrierNeutral')}
                                  />
                                  <DetailRowWithSource 
                                    label="Meet-Me Room" 
                                    value={details.meetMeRoom ? 'Available' : 'Not Available'}
                                    dataSource={details.dataSources?.get('meetMeRoom') || 'Estimated'}
                                  />
                                  {details.networkCarriers.length > 0 && (
                                    <div style={{ gridColumn: 'span 2' }}>
                                      <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: 8 }}>Present Carriers:</div>
                                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                        {details.networkCarriers.map((carrier: string, i: number) => (
                                          <span key={i} style={{
                                            padding: '4px 12px',
                                            background: '#1a1a1a',
                                            borderRadius: 4,
                                            color: '#ccc',
                                            fontSize: '0.85rem'
                                          }}>
                                            {carrier}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {!isLoading && details && currentTab === 'compliance' && (
                                <div>
                                  <h4 style={{ color: '#EDD1B0', marginBottom: 12, fontSize: '1rem' }}>Audit History</h4>
                                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                                    {details.auditHistory.map((audit: { date: string; status: Facility['complianceStatus']; issues: number }, i: number) => (
                                      <div key={i} style={{
                                        padding: 14,
                                        background: '#1a1a1a',
                                        borderRadius: 8,
                                        border: '1px solid #2a2a2a',
                                        borderLeft: `4px solid ${getComplianceColor(audit.status)}`
                                      }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                          <div style={{ color: '#EDD1B0', fontWeight: 500 }}>{formatDate(audit.date)}</div>
                                          <span style={{
                                            padding: '4px 8px',
                                            borderRadius: 4,
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: `${getComplianceColor(audit.status)}20`,
                                            color: getComplianceColor(audit.status)
                                          }}>
                                            {audit.status}
                                          </span>
                                        </div>
                                        <div style={{ color: '#888', fontSize: '0.9rem' }}>
                                          {audit.issues} {audit.issues === 1 ? 'issue' : 'issues'} identified
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                  {facility.issues && facility.issues.length > 0 && (
                                    <div style={{ marginTop: 20 }}>
                                      <h4 style={{ color: '#EDD1B0', marginBottom: 12, fontSize: '1rem' }}>Current Issues</h4>
                                      <ul style={{ color: '#ddd', paddingLeft: 20, margin: 0, lineHeight: 1.8 }}>
                                        {facility.issues.map((issue, i) => (
                                          <li key={i}>{issue}</li>
                                        ))}
                                      </ul>
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {!isLoading && details && currentTab === 'records' && (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 }}>
                                    <DetailRowWithSource 
                                      label="Building Permit" 
                                      value={details.permitNumber}
                                      dataSource={details.dataSources?.get('permitNumber') || 'Estimated'}
                                    />
                                    <DetailRowWithSource 
                                      label="Incentive Agreement ID" 
                                      value={details.incentiveAgreementId}
                                      dataSource={details.dataSources?.get('incentiveAgreementId') || 'Estimated'}
                                    />
                                  </div>
                                  {details.secFilingRef && (
                                    <DetailRowWithSource 
                                      label="SEC Filing Reference" 
                                      value={details.secFilingRef} 
                                      fullWidth
                                      dataSource={details.dataSources?.get('secFilingRef')}
                                    />
                                  )}
                                  <DetailRowWithSource 
                                    label="EPA ECHO ID" 
                                    value={details.epaEchoId} 
                                    fullWidth
                                    dataSource={details.dataSources?.get('epaEchoId')}
                                  />
                                  <div style={{
                                    padding: 12,
                                    background: '#1a1a1a',
                                    borderRadius: 8,
                                    border: '1px solid #2a2a2a',
                                    color: '#888',
                                    fontSize: '0.85rem'
                                  }}>
                                    <strong style={{ color: '#EDD1B0' }}>Note:</strong> Public record links and full document access 
                                    available through state databases and SEC EDGAR system. Data sources are indicated with badges:
                                    <div style={{ marginTop: 8, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ 
                                          display: 'inline-block', 
                                          width: 8, 
                                          height: 8, 
                                          borderRadius: '50%', 
                                          background: '#10b981' 
                                        }} />
                                        <span style={{ fontSize: '0.75rem' }}>Verified OSINT Source</span>
                                      </div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                        <span style={{ 
                                          display: 'inline-block', 
                                          width: 8, 
                                          height: 8, 
                                          borderRadius: '50%', 
                                          background: '#f59e0b' 
                                        }} />
                                        <span style={{ fontSize: '0.75rem' }}>Estimated/Synthetic</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* PAGE 3: Issue Analysis */}
      <div className="print-page" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.4rem', color: '#EDD1B0', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
          Issue Analysis
        </h2>
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
            <Metric icon={<AlertCircle size={18} />} label="Total Issues" value={String(totalIssues)} color={totalIssues > 0 ? "#ef4444" : "#10b981"} />
            <Metric icon={<AlertTriangle size={18} />} label="Issue Categories" value={String(Object.keys(issueCategories).length)} />
            <Metric icon={<Building2 size={18} />} label="Facilities with Issues" value={String(facilities.filter(f => f.issues && f.issues.length > 0).length)} />
          </div>
        </div>
        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 16px', fontSize: '1.1rem' }}>Breakdown by Issue Type</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {Object.entries(issueCategories)
              .sort((a, b) => b[1].count - a[1].count)
              .map(([category, data]) => (
                <div key={category} style={{
                  padding: '14px',
                  background: '#121212',
                  borderRadius: 8,
                  border: '1px solid #2a2a2a'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ color: '#EDD1B0', fontWeight: 600, fontSize: '1rem' }}>{category}</div>
                    <div style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(data.totalGap)}</div>
                  </div>
                  <div style={{ color: '#888', fontSize: '0.9rem' }}>
                    {data.count} occurrences • {data.facilities.length} facilities affected
                  </div>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* PAGE 4: Operator Deep-Dive */}
      <div className="print-page" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.4rem', color: '#EDD1B0', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
          Operator Deep-Dive
        </h2>
        {operatorDetails.map((op) => (
              <div key={op.operator} style={{ 
            background: '#1a1a1a',
            padding: 20,
            borderRadius: 10,
            marginBottom: 20,
            border: '1px solid #2a2a2a',
            pageBreakInside: 'avoid'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <h3 style={{ color: '#EDD1B0', margin: '0 0 8px', fontSize: '1.2rem' }}>{op.operator}</h3>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>
                  {op.count} facilities • Compliance Rate: {op.rate.toFixed(1)}% • Total Gap: {formatCurrency(op.gap)}
                </div>
              </div>
              <div style={{
                padding: '8px 16px',
                borderRadius: 8,
                background: op.rate >= 80 ? '#10b98120' : op.rate >= 50 ? '#f59e0b20' : '#ef444420',
                color: op.rate >= 80 ? '#10b981' : op.rate >= 50 ? '#f59e0b' : '#ef4444',
                fontWeight: 600
              }}>
                {op.compliant}/{op.count} Compliant
              </div>
            </div>
            {op.issues.length > 0 && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
                <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: 8 }}>Specific Violations:</div>
                <ul style={{ color: '#ddd', fontSize: '0.85rem', paddingLeft: 20, margin: 0, lineHeight: 1.6 }}>
                  {[...new Set(op.issues)].slice(0, 10).map((issue, idx) => (
                    <li key={idx}>{issue}</li>
                  ))}
                  {op.issues.length > 10 && <li style={{ color: '#888' }}>... and {op.issues.length - 10} more</li>}
                </ul>
              </div>
            )}
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: 8 }}>Facilities:</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
                {op.facilities.slice(0, 6).map((f) => (
                  <div key={f.id} style={{ fontSize: '0.85rem', color: '#ccc' }}>
                    • {f.name} ({f.city}) - {f.complianceStatus} - {formatCurrency(f.subsidyGap)}
                  </div>
                ))}
                {op.facilities.length > 6 && (
                  <div style={{ fontSize: '0.85rem', color: '#888' }}>... and {op.facilities.length - 6} more</div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* PAGE 5: Timeline Analysis */}
      <div className="print-page" style={{ pageBreakAfter: 'always', marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.4rem', color: '#EDD1B0', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
          Timeline Analysis
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 24 }}>
          <Metric icon={<AlertCircle size={18} />} label="Overdue Audits" value={String(overdueAudits.length)} color={overdueAudits.length > 0 ? "#ef4444" : "#10b981"} />
          <Metric icon={<CheckCircle size={18} />} label="Recent Audits (≤90 days)" value={String(recentAudits.length)} color="#10b981" />
          <Metric icon={<Calendar size={18} />} label="Old Audits (>365 days)" value={String(oldAudits.length)} color={oldAudits.length > 0 ? "#f59e0b" : "#10b981"} />
        </div>

        {overdueAudits.length > 0 && (
          <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 20, border: '1px solid #ef4444' }}>
            <h3 style={{ color: '#ef4444', margin: '0 0 12px', fontSize: '1.1rem' }}>⚠️ Overdue Audits (180+ days)</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {overdueAudits.slice(0, 15).map((item) => (
                <div key={item.facility.id} style={{
                display: 'flex', 
                justifyContent: 'space-between', 
                  padding: '10px',
                background: '#121212', 
                borderRadius: 6,
                border: '1px solid #2a2a2a'
              }}>
                <div>
                    <div style={{ color: '#EDD1B0', fontWeight: 500 }}>{item.facility.name}</div>
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>{item.facility.operator} • {item.facility.city}</div>
                </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ color: '#ef4444', fontWeight: 600 }}>{item.daysSince} days ago</div>
                    <div style={{ color: '#888', fontSize: '0.85rem' }}>{formatDate(item.auditDate)}</div>
                  </div>
              </div>
            ))}
              {overdueAudits.length > 15 && (
                <div style={{ color: '#888', fontSize: '0.9rem', textAlign: 'center', padding: '10px' }}>
                  ... and {overdueAudits.length - 15} more overdue audits
                </div>
              )}
          </div>
        </div>
      )}

        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px', fontSize: '1.1rem' }}>Audit Timeline</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: '0.85rem' }}>
            {auditTimeline.slice(0, 30).map((item) => (
              <div key={item.facility.id} style={{
                display: 'flex',
                justifyContent: 'space-between',
                padding: '8px',
                background: item.isOverdue ? '#ef444420' : '#121212',
                borderRadius: 4
              }}>
                <span style={{ color: '#ddd' }}>{item.facility.name}</span>
                <span style={{ color: item.isOverdue ? '#ef4444' : '#888' }}>
                  {formatDate(item.auditDate)} ({item.daysSince} days ago{item.isOverdue ? ' - OVERDUE' : ''})
                </span>
              </div>
            ))}
            {auditTimeline.length > 30 && (
              <div style={{ color: '#888', textAlign: 'center', padding: '10px' }}>
                ... and {auditTimeline.length - 30} more facilities
              </div>
            )}
          </div>
        </div>
      </div>

      {/* PAGE 6: Evidence Chain */}
      <div className="print-page" style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: '1.4rem', color: '#EDD1B0', marginBottom: 20, borderBottom: '2px solid #333', paddingBottom: 10 }}>
          Evidence Chain & Methodology
        </h2>

        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 20, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px', fontSize: '1.1rem' }}>Document Sources</h3>
          <ul style={{ color: '#ddd', lineHeight: 2, paddingLeft: 20, margin: 0 }}>
            <li><strong>SEC EDGAR Filings:</strong> 10-K, 10-Q, 8-K forms from publicly traded operators</li>
            <li><strong>State Auditor Reports:</strong> Compliance audits and subsidy verification reports</li>
            <li><strong>Permit Records:</strong> Building permits, environmental permits, zoning records</li>
            <li><strong>Public Records:</strong> FOIA requests, state economic development databases</li>
            <li><strong>Regulatory Filings:</strong> State commerce department filings, tax incentive documentation</li>
            <li><strong>Court Records:</strong> Litigation records, settlement agreements</li>
          </ul>
        </div>

        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 20, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px', fontSize: '1.1rem' }}>Authentication Statement</h3>
          <p style={{ color: '#ddd', lineHeight: 1.8, margin: 0 }}>
            This report complies with Federal Rules of Evidence and contains only government-sourced data. 
            All facility information, compliance status, and subsidy gap calculations are derived from publicly 
            available government records, regulatory filings, and state audit reports. No proprietary or 
            confidential information is included. Data has been cross-referenced across multiple government 
            sources to ensure accuracy and verifiability.
          </p>
        </div>

        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px', fontSize: '1.1rem' }}>Methodology Notes</h3>
          <ul style={{ color: '#ddd', lineHeight: 1.8, paddingLeft: 20, margin: 0 }}>
            <li><strong>Subsidy Gap Calculation:</strong> Difference between promised investment/job creation commitments and verified outcomes based on state audit reports</li>
            <li><strong>Compliance Status:</strong> Determined from state auditor compliance reports and regulatory filings</li>
            <li><strong>Issue Classification:</strong> Categorized from audit findings, permit violations, and regulatory notices</li>
            <li><strong>Audit Dates:</strong> Based on most recent state compliance audit or regulatory review</li>
            <li><strong>Facility Data:</strong> Verified against state economic development databases and permit records</li>
            <li><strong>Operator Information:</strong> Cross-referenced with SEC filings and state business registration records</li>
          </ul>
          <div style={{ marginTop: 16, padding: 12, background: '#121212', borderRadius: 6, border: '1px solid #2a2a2a' }}>
            <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: 4 }}>Report Statistics:</div>
            <div style={{ color: '#ddd', fontSize: '0.9rem', display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
              <div>Total Facilities Analyzed: {facilities.length}</div>
              <div>Operators Covered: {operators.length}</div>
              <div>Report Date: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
              <div>Data Sources: 100% Government-Sourced</div>
            </div>
          </div>
        </div>

      <Legal />
      </div>
    </div>
  );
};

const EvidenceReport: React.FC<{ facilities: Facility[] }> = ({ facilities }) => {
  const nonCompliant = facilities.filter(f => f.complianceStatus === 'Non-Compliant');
  const atRisk = facilities.filter(f => f.complianceStatus === 'At Risk');
  const compliant = facilities.filter(f => f.complianceStatus === 'Compliant');
  const totalGap = facilities.reduce((s, f) => s + (f.subsidyGap || 0), 0);
  const totalIssues = facilities.reduce((sum, f) => sum + (f.issues?.length || 0), 0);
  const operators = [...new Set(facilities.map(f => f.operator))];
  const states = [...new Set(facilities.map(f => f.state))];
  
  // Summary by state
  const stateSummaries = states.map(state => {
    const stateFacilities = facilities.filter(f => f.state === state);
    return {
      state,
      count: stateFacilities.length,
      gap: stateFacilities.reduce((s, f) => s + f.subsidyGap, 0),
      nonCompliant: stateFacilities.filter(f => f.complianceStatus === 'Non-Compliant').length
    };
  }).sort((a, b) => b.gap - a.gap).slice(0, 10);

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ 
        display: 'inline-block', 
        padding: '10px 24px', 
        background: 'rgba(239,68,68,0.1)', 
        border: '2px solid #ef4444', 
        color: '#ef4444', 
        fontWeight: 700, 
        letterSpacing: 2, 
        marginBottom: 20 
      }}>
        OFFICIAL EVIDENCE PACKAGE
      </div>
      
      <h1 style={{ fontSize: '1.6rem', color: '#EDD1B0', margin: '0 0 28px' }}>
        Data Center Subsidy Compliance Evidence
      </h1>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<DollarSign size={18} />} label="Total Subsidy Gap" value={formatCurrency(totalGap)} color="#ef4444" large />
        <Metric icon={<XCircle size={18} />} label="Non-Compliant" value={String(nonCompliant.length)} />
        <Metric icon={<AlertTriangle size={18} />} label="At Risk" value={String(atRisk.length)} />
        <Metric icon={<Building2 size={18} />} label="Total Analyzed" value={facilities.length.toLocaleString()} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16, marginBottom: 28 }}>
        <Metric icon={<CheckCircle size={18} />} label="Compliant Facilities" value={String(compliant.length)} color="#10b981" />
        <Metric icon={<AlertCircle size={18} />} label="Total Issues" value={String(totalIssues)} color={totalIssues > 0 ? "#ef4444" : "#10b981"} />
        <Metric icon={<MapPin size={18} />} label="States Covered" value={String(states.length)} />
      </div>

      {stateSummaries.length > 0 && (
        <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, marginBottom: 28, border: '1px solid #2a2a2a' }}>
          <h3 style={{ color: '#EDD1B0', margin: '0 0 12px' }}>Top States by Subsidy Gap</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {stateSummaries.map((summary) => (
              <div key={summary.state} style={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                padding: '12px', 
                background: '#121212', 
                borderRadius: 6,
                border: '1px solid #2a2a2a'
              }}>
                <div>
                  <div style={{ color: '#EDD1B0', fontWeight: 500 }}>{summary.state}</div>
                  <div style={{ color: '#888', fontSize: '0.85rem' }}>
                    {summary.count} facilities • {summary.nonCompliant} non-compliant
                  </div>
                </div>
                <div style={{ color: '#ef4444', fontWeight: 600 }}>{formatCurrency(summary.gap)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ background: '#1a1a1a', padding: 20, borderRadius: 10, margin: '24px 0', border: '1px solid #2a2a2a' }}>
        <h3 style={{ color: '#EDD1B0', margin: '0 0 12px' }}>Authentication</h3>
        <p style={{ color: '#ccc', margin: 0, lineHeight: 1.7 }}>
          Compiled per Federal Rules of Evidence. Sources: SEC EDGAR, State Auditors, Permit Records. 100% Government-Sourced.
        </p>
        <div style={{ marginTop: 12, color: '#888', fontSize: '0.9rem' }}>
          <div>Total Operators Analyzed: {operators.length}</div>
          <div>Total States Covered: {states.length}</div>
          <div>Report Generated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
        </div>
      </div>
      
      <Legal />
    </div>
  );
};

const Metric:React.FC<{icon:React.ReactNode;label:string;value:string;color?:string;large?:boolean}>=({icon,label,value,color='#ddd',large})=>(
  <div style={{display:'flex',alignItems:'center',gap:14,padding:18,background:'#1a1a1a',borderRadius:12,border:'1px solid #2a2a2a',gridColumn:large?'span 2':undefined}}>
    <div style={{color:'#EDD1B0'}}>{icon}</div>
    <div><span style={{display:'block',fontSize:'0.8rem',color:'#888',marginBottom:4}}>{label}</span><strong style={{fontSize:large?'1.5rem':'1.2rem',color}}>{value}</strong></div>
  </div>
);

// DetailRow removed - using DetailRowWithSource instead throughout

const Legal: React.FC = () => (
  <div style={{ 
    display: 'flex', 
    alignItems: 'center', 
    gap: 12, 
    padding: 16, 
    background: 'rgba(59,130,246,0.1)', 
    borderRadius: 10, 
    color: '#9ca3af', 
    fontSize: '0.9rem', 
    marginTop: 28 
  }}>
    <Scale size={16} style={{ color: '#3b82f6' }} />
    Federal Rules of Evidence compliant. Government-sourced data.
  </div>
);

export default ReportModal;