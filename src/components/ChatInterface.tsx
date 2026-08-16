import { useState, useRef, useEffect } from 'react';
import { db, Source, NetworkSecurity } from '../db/database';
import { Facility } from '../types';
import { detectReportIntent, ReportIntent } from '../utils/reportIntent';
import { InlineReportRenderer } from './ReportRenderer';
import { Sparkles, Send, Zap, FileText } from 'lucide-react';
import { AutocompleteInput } from './shared/AutocompleteInput';
import { useNLPSearchSuggestions } from '../hooks/useNLPSearchSuggestions';
import { recordSearch } from '../db/searchHistory';
import { circuitBreakers } from '../utils/circuitBreaker';
import { withTimeout } from '../utils/timeout';
import { rateLimiters } from '../utils/rateLimiter';
import { sanitizeSearchQuery } from '../utils/sanitization';
import { trackError } from '../utils/errorTracking';
import { safeDbOperation } from '../utils/dbOperations';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  reportIntent?: ReportIntent;
  facilities?: Facility[];
  sources?: Source[]; // NotebookLM-style source citations
  deepResearch?: boolean; // Flag for deep research mode
}

export default function ChatInterface({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [deepResearchMode, setDeepResearchMode] = useState(false); // NotebookLM Deep Research toggle
  const [allFacilities, setAllFacilities] = useState<Facility[]>([]);
  const [allSources, setAllSources] = useState<Source[]>([]);
  const [networkSecurityData, setNetworkSecurityData] = useState<NetworkSecurity[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // AI chat backend decommissioned 2026-08-15; endpoint must be explicitly configured.
  const WORKER_URL = (import.meta.env.VITE_CLAUDE_PROXY_URL as string | undefined) ?? '';
  
  // Get AI search suggestions for autocomplete
  const aiSuggestions = useNLPSearchSuggestions({
    context: 'ai',
    facilities: allFacilities,
    sources: allSources,
    includeFacilities: true,
    includeOperators: true,
    includePlaces: true,
    includeSourceTags: true,
  });

  useEffect(() => {
    let isMounted = true;
    const abortController = new AbortController();

    async function loadData() {
      try {
        const [facilities, sources, networkSec] = await Promise.all([
          safeDbOperation(
            () => db.facilities.toArray(),
            () => [] // Fallback: empty array
          ),
          safeDbOperation(
            () => db.sources.toArray(),
            () => [] // Fallback: empty array
          ),
          safeDbOperation(
            () => db.networkSecurity.toArray(),
            () => [] // Fallback: empty array
          ),
        ]);
        if (isMounted && !abortController.signal.aborted) {
          setAllFacilities(facilities);
          setAllSources(sources);
          setNetworkSecurityData(networkSec);
        }
      } catch (error) {
        console.error('Error loading data in chat:', error);
        trackError(error instanceof Error ? error : new Error(String(error)), {
          context: 'ChatInterface.loadData'
        });
        if (isMounted) {
          setAllFacilities([]);
          setAllSources([]);
          setNetworkSecurityData([]);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getData = async (q: string, includeDeepData = false) => {
    try {
      const all = await safeDbOperation(
        () => db.facilities.toArray(),
        () => [] // Fallback: empty array
      );
      const qLower = q.toLowerCase();
      const byCity: Record<string, { count: number; gap: number; comp: number; nonComp: number }> = {};
      const byOp: Record<string, { count: number; gap: number; comp: number; nonComp: number }> = {};
      const bySt: Record<string, { count: number; gap: number; comp: number; nonComp: number }> = {};

      // Single pass through facilities (optimized)
      for (let i = 0; i < all.length; i++) {
        const f = all[i];
        const op = f.operator || 'Unknown';
        const ck = `${f.city}, ${f.state}`;
        
        if (!byCity[ck]) byCity[ck] = { count: 0, gap: 0, comp: 0, nonComp: 0 };
        if (!byOp[op]) byOp[op] = { count: 0, gap: 0, comp: 0, nonComp: 0 };
        if (!bySt[f.state]) bySt[f.state] = { count: 0, gap: 0, comp: 0, nonComp: 0 };
        
        byCity[ck].count++;
        byCity[ck].gap += f.subsidyGap;
        byOp[op].count++;
        byOp[op].gap += f.subsidyGap;
        bySt[f.state].count++;
        bySt[f.state].gap += f.subsidyGap;
        
        if (f.complianceStatus === 'Compliant') {
          byCity[ck].comp++;
          byOp[op].comp++;
          bySt[f.state].comp++;
        } else if (f.complianceStatus === 'Non-Compliant') {
          byCity[ck].nonComp++;
          byOp[op].nonComp++;
          bySt[f.state].nonComp++;
        }
      }

      const matched = Object.entries(byCity).filter(([c]) => qLower.includes(c.split(',')[0].toLowerCase()));
      const topC = Object.entries(byCity).sort((a, b) => b[1].gap - a[1].gap).slice(0, 30);
      
      const baseData = {
        total: all.length,
        cities: matched.length > 0 ? matched : topC,
        operators: Object.entries(byOp).sort((a, b) => b[1].gap - a[1].gap),
        states: Object.entries(bySt).sort((a, b) => b[1].gap - a[1].gap)
      };

      // Deep Research Mode: Include sources and network security data
      if (includeDeepData) {
        const sources = await db.sources.toArray();
        const networkSec = await db.networkSecurity.toArray();
        
        return JSON.stringify({
          ...baseData,
          sources: sources.slice(0, 20).map(s => ({ // Limit for token efficiency
            title: s.title,
            type: s.type,
            summary: s.summary,
            credibility: s.credibility,
            tags: s.tags,
          })),
          networkSecurity: {
            total: networkSec.length,
            rpkiSafe: networkSec.filter(n => n.rpkiStatus === 'Safe').length,
            rpkiUnsafe: networkSec.filter(n => n.rpkiStatus === 'Unsafe').length,
            withDDoS: networkSec.filter(n => n.ddosMitigation).length,
          },
        });
      }
      
      return JSON.stringify(baseData);
    } catch (error) {
      console.error('Error getting data for chat:', error);
      // Return minimal data structure on error
      return JSON.stringify({
        total: 0,
        cities: [],
        operators: [],
        states: []
      });
    }
  };

  const ask = async (q: string, deepMode = false) => {
    if (!WORKER_URL) {
      return 'AI chat is not configured — no backend endpoint is set. Local data analysis is still available below.';
    }
    const d = await getData(q, deepMode);
    const systemPrompt = deepMode
      ? `You are an expert compliance analyst with access to comprehensive data including facility information, source documents, and network security infrastructure. 
         Provide in-depth analysis with specific citations to sources when available. 
         Consider network security (RPKI, ASN, BGP) implications for compliance findings.
         Data: ${d}`
      : `You are a compliance analyst. Data: ${d}`;

    try {
      // Apply rate limiting
      await rateLimiters.claudeAPI.check();
      
      // Use circuit breaker, timeout, and sanitization
      const sanitizedQuery = sanitizeSearchQuery(q);
      
      const response = await circuitBreakers.claudeAPI.execute(
        async () => {
          return await withTimeout(
            fetch(WORKER_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                max_tokens: deepMode ? 8192 : 4096,
                system: systemPrompt,
                messages: [{ role: 'user', content: sanitizedQuery }]
              })
            }),
            30000, // 30 second timeout
            () => {
              throw new Error('Request timed out');
            }
          );
        },
        () => {
          // Fallback: return error response
          return {
            ok: false,
            json: async () => ({ 
              content: [{ text: 'AI service temporarily unavailable. Using local data analysis...' }] 
            })
          } as Response;
        }
      );

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const j = await response.json();
      return j.content?.[0]?.text || 'I found relevant compliance data. Please review the report below.';
    } catch (error) {
      console.error('Error calling Claude API:', error);
      trackError(error instanceof Error ? error : new Error(String(error)), {
        context: 'ChatInterface.ask',
        query: q.substring(0, 100),
        deepMode
      });
      return 'I found relevant compliance data. Please review the report below.';
    }
  };

  const submit = async (e?: React.FormEvent | React.MouseEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;
    
    const query = sanitizeSearchQuery(input.trim());
    if (!query) return; // Sanitization removed all content
    
    // Record search with circuit breaker protection
    await circuitBreakers.nlpSearch.execute(
      () => recordSearch(query, 'ai'),
      () => {} // Silent fallback - search history is non-critical
    );
    setInput('');
    
    // Detect report intent
    const intent = detectReportIntent(query);
    
    // Add user message
    const userMessage: Message = { role: 'user', content: query };
    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    // For report intents, add streaming placeholder message first
    let streamingMessageId = -1;
    if (intent.type !== 'none') {
      const placeholderMessage: Message = {
        role: 'assistant',
        content: deepResearchMode ? 'Conducting deep research...' : 'Generating report...',
        reportIntent: intent,
        facilities: allFacilities,
        deepResearch: deepResearchMode,
      };
      setMessages(prev => {
        const newMessages = [...prev, placeholderMessage];
        streamingMessageId = newMessages.length - 1;
        return newMessages;
      });
    }

    // Generate AI response with optional deep research
    let aiResponse = '';
    let relevantSources: Source[] = [];
    try {
      aiResponse = await ask(query, deepResearchMode);
      
      // Find relevant sources (simple keyword matching for now)
      if (deepResearchMode && allSources.length > 0) {
        const queryLower = query.toLowerCase();
        relevantSources = allSources.filter(s => 
          s.title.toLowerCase().includes(queryLower) ||
          s.summary?.toLowerCase().includes(queryLower) ||
          s.tags?.some(tag => queryLower.includes(tag.toLowerCase()))
        ).slice(0, 5); // Limit to 5 most relevant
      }
    } catch (error) {
      aiResponse = intent.type !== 'none' 
        ? 'I found relevant compliance data. Review the report below.'
        : 'I encountered an error. Please try again.';
    }

    // Update or create assistant message
    if (streamingMessageId >= 0) {
      // Update streaming message
      setMessages(prev => {
        const updated = [...prev];
        updated[streamingMessageId] = {
          role: 'assistant',
          content: aiResponse,
          reportIntent: intent,
          facilities: allFacilities,
          sources: relevantSources.length > 0 ? relevantSources : undefined,
          deepResearch: deepResearchMode,
        };
        return updated;
      });
    } else {
      // Create new message
      const assistantMessage: Message = {
        role: 'assistant',
        content: aiResponse,
        reportIntent: intent.type !== 'none' ? intent : undefined,
        facilities: intent.type !== 'none' ? allFacilities : undefined,
        sources: relevantSources.length > 0 ? relevantSources : undefined,
        deepResearch: deepResearchMode,
      };
      setMessages(prev => [...prev, assistantMessage]);
    }

    setIsProcessing(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex bg-black bg-opacity-50">
      <div className="w-full md:w-2/3 lg:w-1/2 bg-gray-800 flex flex-col border-l border-gray-700">
        <div className="bg-gray-900 px-4 py-3 flex justify-between items-center border-b border-gray-700">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-white">AI Assistant</span>
            {/* Deep Research Mode Toggle */}
            <button
              onClick={() => setDeepResearchMode(!deepResearchMode)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                deepResearchMode
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/30'
                  : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
              }`}
            >
              <Zap className="w-3.5 h-3.5" />
              Deep Research
            </button>
            {deepResearchMode && (
              <span className="text-xs text-purple-400 animate-pulse">
                • Analyzing {allSources.length} sources
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white w-10 h-10 rounded-lg hover:bg-gray-800 flex items-center justify-center transition-all duration-200 text-lg font-bold" aria-label="Close chat">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth content-scroll" style={{ scrollBehavior: 'smooth', WebkitOverflowScrolling: 'touch', overscrollBehavior: 'contain', scrollPadding: '0' }}>
          {messages.length === 0 && (
            <div className="text-gray-400 text-sm space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 mb-4">
                <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
                <p className="font-semibold text-gray-300">AI Assistant Ready</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-4 border border-gray-700">
                <p className="mb-3 text-gray-300">Quick Suggestions:</p>
                <div className="space-y-2">
                  {[
                    "Show me non-compliant facilities in Texas",
                    "What's the total subsidy gap by state?",
                    "Which operators have the most compliance issues?",
                    "Generate a report for California facilities"
                  ].map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setInput(suggestion);
                        setTimeout(() => {
                          const form = document.querySelector('form');
                          if (form) {
                            const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                            form.dispatchEvent(submitEvent);
                          }
                        }, 100);
                      }}
                      className="w-full text-left px-4 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-all duration-200 border border-gray-700 hover:border-blue-500 font-medium min-h-[48px]"
                    >
                      💡 {suggestion}
                    </button>
                  ))}
                </div>
              </div>
              <div className="text-xs space-y-1">
                <p className="text-gray-500">Or use commands:</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li><code className="bg-gray-700 px-1 rounded">/report state TX</code> - Generate state report</li>
                  <li><code className="bg-gray-700 px-1 rounded">/report operator "Amazon Web Services"</code> - Generate operator report</li>
                  <li><code className="bg-gray-700 px-1 rounded">/evidence MI switch</code> - Generate evidence package</li>
                </ul>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={m.role === 'user' ? 'flex justify-end' : 'flex'}>
              <div className={`rounded-lg px-4 py-3 max-w-[85%] ${
                m.role === 'user' 
                  ? 'bg-blue-600 text-white' 
                  : m.deepResearch
                  ? 'bg-gradient-to-br from-purple-900/50 to-gray-700 text-gray-200 border border-purple-700/50'
                  : 'bg-gray-700 text-gray-200'
              }`}>
                {m.role === 'assistant' ? (
                  <div className="space-y-3">
                    {/* Deep Research Badge */}
                    {m.deepResearch && (
                      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-purple-700/30">
                        <Zap className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-semibold text-purple-300 uppercase">Deep Research Mode</span>
                      </div>
                    )}
                    
                    {/* AI Text Response */}
                    <div className="whitespace-pre-wrap text-sm">{m.content}</div>
                    
                    {/* Inline Report */}
                    {m.reportIntent && m.facilities && (
                      <InlineReportRenderer
                        intent={m.reportIntent}
                        facilities={m.facilities}
                        inline={true}
                      />
                    )}

                    {/* Source Citations (NotebookLM-style) */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-gray-600">
                        <div className="flex items-center gap-2 mb-2">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          <span className="text-xs font-semibold text-gray-400 uppercase">Sources</span>
                        </div>
                        <div className="space-y-1">
                          {m.sources.map((source, idx) => (
                            <a
                              key={source.id}
                              href={source.url || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                            >
                              [{idx + 1}] {source.title}
                              {source.credibility && (
                                <span className={`ml-2 px-1 py-0.5 rounded text-[10px] font-semibold ${
                                  source.credibility === 'High' ? 'bg-green-600/20 text-green-400' :
                                  source.credibility === 'Medium' ? 'bg-yellow-600/20 text-yellow-400' :
                                  'bg-red-600/20 text-red-400'
                                }`}>
                                  {source.credibility}
                                </span>
                              )}
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">{m.content}</div>
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
            <div className="flex justify-start animate-in fade-in">
              <div className={`rounded-lg px-4 py-3 text-gray-300 text-sm border ${
                deepResearchMode
                  ? 'bg-gradient-to-r from-purple-900/50 to-blue-900/50 border-purple-700/50'
                  : 'bg-gradient-to-r from-blue-900/50 to-purple-900/50 border-blue-700/50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1">
                    <div className={`w-2 h-2 rounded-full animate-bounce ${deepResearchMode ? 'bg-purple-400' : 'bg-blue-400'}`} style={{ animationDelay: '0ms' }}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${deepResearchMode ? 'bg-purple-400' : 'bg-blue-400'}`} style={{ animationDelay: '150ms' }}></div>
                    <div className={`w-2 h-2 rounded-full animate-bounce ${deepResearchMode ? 'bg-purple-400' : 'bg-blue-400'}`} style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className="flex items-center gap-2">
                    {deepResearchMode ? (
                      <>
                        <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
                        Conducting deep research across {allSources.length} sources and {allFacilities.length} facilities...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-blue-400 animate-pulse" />
                        Analyzing data and generating report...
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
        {/* Input area - React state + button handler (Rule 3: NO <form> elements) */}
        <div className="p-3 border-t border-gray-700 flex gap-2 bg-gray-900">
          <AutocompleteInput
            value={input}
            onChange={setInput}
            options={aiSuggestions}
            placeholder="Ask about compliance data or use /commands..."
            disabled={isProcessing}
            icon={<Sparkles className="w-4 h-4" />}
            loading={isProcessing}
            minChars={2}
            maxSuggestions={6}
            id="chat-input"
            className="flex-1 bg-gray-700 rounded text-sm text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey && input.trim() && !isProcessing) {
                e.preventDefault();
                submit(e as any);
              }
            }}
          />
          <button 
            onClick={submit}
            disabled={!input.trim() || isProcessing} 
            className="bg-blue-600 px-8 py-3 rounded-lg text-base font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition-all duration-200 hover:shadow-lg min-h-[48px] min-w-[100px] flex items-center gap-2 justify-center"
          >
            <Send className="w-5 h-5" />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
