
import React, { useState, useRef, useEffect } from 'react';
import { 
    Layers, Sparkles, Bot, User, FileText, ChevronDown, ChevronRight, 
    ArrowRight, Zap, Activity, Hash, AlertOctagon, Search, Loader2, 
    Trash2, AlertTriangle, BarChart2, AlignLeft, Network, X, Command,
    Table, FileCode, FileType, File, GitBranch, ListOrdered, Target, Code, Braces,
    Link, MapPin, Gauge, Split, FolderOpen, Database, Medal, Globe, Eye, Copy, Check
} from 'lucide-react';
import Button from '../ui/Button';
import { NotebookConfig } from '../../App';
import { StrategySelector } from './StrategySelector';

// --- Types ---

export interface DynamicChunk {
  id: string;
  [key: string]: any; 
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: DynamicChunk[]; // Array of retrieved chunks used for this answer
  strategyId?: string;        // ID of the strategy used (for custom rendering)
  rawRetrieval?: any;         // Raw data for debugging/fallback
  timestamp: Date;
  isError?: boolean;
}

// --- Utility Components ---

const RecursiveProperty: React.FC<{ data: any, depth?: number }> = ({ data, depth = 0 }) => {
    if (data === null) return <span className="text-text-subtle italic">null</span>;
    if (data === undefined) return <span className="text-text-subtle italic">undefined</span>;
    
    if (Array.isArray(data)) {
        if (data.length === 0) return <span className="text-text-subtle italic">[]</span>;
        return (
            <div className="flex flex-col gap-1">
                {data.map((item, i) => (
                    <div key={i} className="flex gap-2">
                        <span className="text-text-subtle opacity-50">-</span>
                        <RecursiveProperty data={item} depth={depth + 1} />
                    </div>
                ))}
            </div>
        );
    }

    if (typeof data === 'object') {
        if (Object.keys(data).length === 0) return <span className="text-text-subtle italic">{"{}"}</span>;
        return (
            <div className={`flex flex-col gap-1 ${depth > 0 ? 'pl-2 border-l border-white/10' : ''}`}>
                {Object.entries(data).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[auto_1fr] gap-2 text-xs">
                        <span className="text-primary/70 font-mono whitespace-nowrap">{key}:</span>
                        <div className="min-w-0 break-words">
                            <RecursiveProperty data={value} depth={depth + 1} />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    return <span className="text-text-subtle break-words">{String(data)}</span>;
};

// Helper to flatten n8n structure if present
const unwrapData = (data: any): any => {
    if (!data) return data;
    // Handle array of n8n items [{json: ...}, {json: ...}]
    if (Array.isArray(data)) {
        return data.map(item => item && typeof item === 'object' && item.json ? { ...item.json, ...item } : item);
    }
    // Handle single n8n item {json: ...}
    if (typeof data === 'object' && data.json) {
        return { ...data.json, ...data };
    }
    return data;
};

// Shared Helper to resolve titles consistently across cards and chat text
const resolveTitleHelper = (d: any) => {
    if (!d) return 'Unknown Source';
    const data = unwrapData(d);

    const isValid = (v: any) => {
        if (!v || typeof v !== 'string') return null;
        const str = v.trim();
        if (str.length === 0) return null;
        if (['blob', 'unknown', 'undefined', 'null', 'rag', 'object', '[object object]'].includes(str.toLowerCase())) return null;
        return str;
    };

    const findInObj = (obj: any, targetKeys: string[]) => {
        if (!obj || typeof obj !== 'object') return null;
        for (const k of targetKeys) {
            if (isValid(obj[k])) return obj[k];
        }
        // Case-insensitive search
        const keys = Object.keys(obj);
        for (const k of targetKeys) {
            const lowerK = k.toLowerCase();
            const match = keys.find(objKey => objKey.toLowerCase().trim() === lowerK);
            if (match && isValid(obj[match])) return obj[match];
        }
        return null;
    };

    // Priority Check
    const title = findInObj(data, ['enriched_title', 'generated_title', 'summary_title']) ||
                  findInObj(data.metadata, ['title', 'file_title', 'doc_title', 'name', 'file_name']) ||
                  findInObj(data, ['file_title', 'title', 'doc_title', 'name', 'file_name', 'source', 'url']);

    if (title) return title;
    
    // Fallback to checking source URL path
    const src = findInObj(data, ['source', 'url', 'link']);
    if (src) {
         const parts = src.split(/[/\\]/);
         const last = parts[parts.length - 1];
         if (isValid(last)) return last;
    }

    return 'Unknown Source';
};

const getFileIcon = (filename: string) => {
    if (!filename) return FileText;
    const lower = filename.toLowerCase();
    
    if (lower.endsWith('.csv') || lower.endsWith('.xlsx') || lower.endsWith('.xls') || lower.endsWith('.tsv')) {
        return Table;
    }
    if (lower.endsWith('.json') || lower.endsWith('.xml') || lower.endsWith('.js') || lower.endsWith('.ts') || lower.endsWith('.py') || lower.endsWith('.sql')) {
        return FileCode;
    }
    if (lower.endsWith('.pdf')) {
        return FileText;
    }
    if (lower.endsWith('.png') || lower.endsWith('.jpg') || lower.endsWith('.jpeg')) {
        return FileType;
    }
    
    return File; 
};

// Helper to normalize data for easier rendering
export const normalizeDocument = (rawData: any): { 
    title: string; 
    content: string; 
    score: number; 
    metadata: Record<string, any>;
    sourceType: string;
    url?: string;
} => {
    const data = unwrapData(rawData);
    
    // Resolve Title
    const title = resolveTitleHelper(data);
    
    // Resolve Content
    let content = data.enriched_text || data.enriched_content || data.summary || data.chunk || data.chunk_text || data.content || data.text || data.pageContent || data.page_content || data.body || data.output || data.result;
    
    if (!content && typeof data === 'object') {
        const candidates = Object.entries(data)
            .filter(([k, v]) => typeof v === 'string' && v.length > 50 && !['url', 'source', 'id', 'file_path', 'json'].includes(k))
            .map(([_, v]) => v);
        if (candidates.length > 0) content = candidates[0];
        else content = JSON.stringify(data, (key, value) => {
             if (['embedding', 'vectors', 'metadata', 'json', 'headers', 'uuid'].includes(key)) return undefined;
             return value;
        }, 2);
    }
    
    // Resolve Score
    const rawScore = data.relevance ?? data.rerank_score ?? data.combined_score ?? data.vector_score ?? data.score ?? data.similarity;
    const score = typeof rawScore === 'number' ? rawScore : 0;
    
    // Resolve Metadata & URL
    const metadata = { ...(data.metadata || {}), ...data };
    // Remove heavy fields from metadata view
    ['content', 'text', 'pageContent', 'enriched_text', 'summary', 'json', 'embedding', 'vectors', 'output', 'result', 'chunk', 'chunk_text'].forEach(k => delete metadata[k]);
    
    const url = metadata.source || metadata.url || data.source || data.url;
    
    return { title, content, score, metadata, sourceType: 'file', url };
};

// --- CONTENT CARD ---
export const ContentCard: React.FC<{ data: DynamicChunk, rank?: number, showScore?: boolean, highlight?: boolean }> = ({ data: rawData, rank, showScore = true, highlight = false }) => {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  
  const { title, content, score, metadata, url } = normalizeDocument(rawData);
  const FileIcon = getFileIcon(title);
  
  const handleCopy = (e: React.MouseEvent) => {
      e.stopPropagation();
      navigator.clipboard.writeText(typeof content === 'string' ? content : JSON.stringify(content));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  };

  // Score visualization logic
  const scoreColor = score > 0.8 ? 'text-emerald-400 border-emerald-500/30 bg-emerald-500/10' : 
                     score > 0.5 ? 'text-primary border-primary/30 bg-primary/10' : 
                     'text-amber-400 border-amber-500/30 bg-amber-500/10';

  return (
    <div className={`group relative flex flex-col rounded-xl border transition-all duration-300 overflow-hidden mb-3 ${
        expanded ? 'bg-[#121218] border-primary/50 shadow-[0_0_30px_-10px_rgba(126,249,255,0.15)] z-10' : 
        highlight ? 'bg-[#16161D] border-primary/30 shadow-[0_0_20px_-10px_rgba(126,249,255,0.1)]' : 
        'bg-[#16161D]/80 border-white/5 hover:border-white/10'
    }`}>
        {/* Header */}
        <div className="flex items-start gap-3 p-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
            {/* Rank / Icon */}
            <div className="flex flex-col items-center gap-1 pt-1">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${
                    highlight ? 'bg-primary/10 border-primary/20 text-primary' : 'bg-white/5 border-white/5 text-text-subtle group-hover:text-white'
                }`}>
                    <FileIcon className="w-4 h-4" />
                </div>
                {rank !== undefined && (
                    <span className={`text-[9px] font-mono font-bold ${rank < 3 ? 'text-primary' : 'text-text-subtle/50'}`}>#{rank + 1}</span>
                )}
            </div>

            {/* Main Header Content */}
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-start gap-2">
                    <h4 className={`text-xs font-bold truncate leading-snug ${expanded ? 'text-white' : 'text-gray-300 group-hover:text-white'} transition-colors`} title={title}>
                        {title}
                    </h4>
                    
                    {showScore && score > 0 && (
                        <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${scoreColor}`}>
                            <Activity className="w-3 h-3" />
                            {score > 1 ? score.toFixed(2) : `${(score * 100).toFixed(0)}%`}
                        </div>
                    )}
                </div>
                
                {/* Metadata Badges */}
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    {url && (
                         <a href={url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-[9px] bg-white/5 hover:bg-primary/10 text-text-subtle hover:text-primary px-1.5 py-0.5 rounded border border-white/5 transition-colors">
                            <Link className="w-2.5 h-2.5" />
                            Source
                         </a>
                    )}
                    {(metadata.page || metadata.page_number) && (
                        <span className="flex items-center gap-1 text-[9px] bg-white/5 text-text-subtle px-1.5 py-0.5 rounded border border-white/5">
                            <MapPin className="w-2.5 h-2.5 opacity-70" />
                            Pg {metadata.page || metadata.page_number}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Chevron */}
            <div className="pt-1 text-text-subtle group-hover:text-white transition-colors">
                {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </div>
        </div>

        {/* Content Preview / Full */}
        <div className={`px-3 pb-3 transition-all ${expanded ? 'block' : 'block'}`}>
            <div className={`relative rounded-lg bg-black/20 border border-white/5 p-3 overflow-hidden group/content`}>
                <div className={`text-[11px] font-mono leading-relaxed text-gray-400 ${expanded ? 'whitespace-pre-wrap' : 'line-clamp-2'}`}>
                    {typeof content === 'string' ? content : JSON.stringify(content)}
                </div>
                
                {/* Copy Button (Visible on hover) */}
                <div className={`absolute top-2 right-2 transition-opacity ${expanded ? 'opacity-100' : 'opacity-0 group-hover/content:opacity-100'}`}>
                     <button 
                        onClick={handleCopy}
                        className="p-1.5 rounded bg-surface border border-white/10 hover:border-white/20 text-text-subtle hover:text-white transition-colors"
                        title="Copy text"
                     >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                     </button>
                </div>
            </div>
        </div>

        {/* Expanded Details */}
        {expanded && (
            <div className="border-t border-white/5 bg-black/20 px-4 py-3">
                <div className="flex items-center gap-2 mb-2">
                    <ListOrdered className="w-3 h-3 text-text-subtle" />
                    <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Metadata Properties</span>
                </div>
                <div className="grid grid-cols-1 gap-1 pl-1">
                    <RecursiveProperty data={metadata} />
                </div>
            </div>
        )}
    </div>
  );
};

// --- DATA EXTRACTION UTILITIES ---

/**
 * Robustly finds chunks in arbitrary JSON structures.
 * Looks for objects that smell like documents (have content/text/summary fields).
 */
export const findDocsDeep = (node: any, maxDepth = 4, currentDepth = 0): any[] => {
    if (!node || currentDepth > maxDepth) return [];
    
    // Unwrap n8n
    node = unwrapData(node);

    if (Array.isArray(node)) {
        // If array contains chunks directly
        const potentialDocs = node.filter(i => {
             const u = unwrapData(i);
             return u && (u.pageContent || u.text || u.content || u.summary || u.enriched_text || u.chunk || u.chunk_text);
        });
        
        if (potentialDocs.length > 0 && potentialDocs.length === node.length) {
            return potentialDocs.map(unwrapData);
        }
        
        // Otherwise recurse
        return node.flatMap(i => findDocsDeep(i, maxDepth, currentDepth + 1));
    }

    if (typeof node === 'object') {
        // Known keys that hold lists of docs
        const containerKeys = ['results', 'output', 'docs', 'documents', 'fused_results', 'reranked_results'];
        for (const k of containerKeys) {
            if (node[k] && Array.isArray(node[k])) {
                return findDocsDeep(node[k], maxDepth, currentDepth + 1);
            }
        }
        
        // Return self if it looks like a doc
        if (node.pageContent || node.text || node.content || node.summary || node.enriched_text || node.chunk || node.chunk_text) {
            return [node];
        }

        // Recurse into values
        return Object.values(node).flatMap(v => findDocsDeep(v, maxDepth, currentDepth + 1));
    }

    return [];
};

/**
 * Specialized extractor for Multi-Query responses.
 * Tries to preserve the relationship between Query -> Results.
 */
export const extractMultiQueryData = (raw: any): { query: string, chunks: any[] }[] => {
    const data = unwrapData(raw);
    const groups: { query: string, chunks: any[] }[] = [];
    const seenQueries = new Set<string>();

    const addGroup = (q: string, docs: any[]) => {
        if (!q || docs.length === 0) return;
        if (seenQueries.has(q)) return; // Simple dedup
        seenQueries.add(q);
        groups.push({ query: q, chunks: docs });
    };

    // Strategy 1: Array of objects { query: "...", output: [...] }
    if (Array.isArray(data)) {
        data.forEach(item => {
            const u = unwrapData(item);
            const q = u.query || u.generated_query || u.search_query;
            const docs = findDocsDeep(u.output || u.results || u.data);
            
            if (q && docs.length > 0) {
                addGroup(q, docs);
            } else if (!q && docs.length > 0) {
                // Check if metadata inside docs has query
                const firstQ = docs[0].metadata?.query || docs[0].query;
                if (firstQ) addGroup(firstQ, docs);
            }
        });
    } else if (typeof data === 'object') {
        // Strategy 2: Keys are queries?
        // Strategy 3: Single object with 'queries' array?
        if (data.queries && Array.isArray(data.queries)) {
             return extractMultiQueryData(data.queries);
        }
    }

    // Fallback: Flatten everything and group by metadata.query
    if (groups.length === 0) {
        const allDocs = findDocsDeep(data);
        const map: Record<string, any[]> = {};
        allDocs.forEach(d => {
            const q = d.query || d.metadata?.query || d.generated_query || "Direct Match (No Query)";
            if (!map[q]) map[q] = [];
            map[q].push(d);
        });
        Object.entries(map).forEach(([k, v]) => addGroup(k, v));
    }

    return groups;
};


// --- STRATEGY SPECIFIC VIEWS ---

/**
 * 1. MULTI-QUERY VIEW
 */
const MultiQueryView: React.FC<{ raw: any }> = ({ raw }) => {
    const groups = extractMultiQueryData(raw);

    // If fallback was used and all results are under "Direct Match", show a cleaner aggregated view
    if (groups.length === 1 && groups[0].query === "Direct Match (No Query)") {
         return (
            <div className="space-y-6 pb-6">
                <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-tertiary/10 to-transparent border border-tertiary/10 animate-fade-in-up">
                     <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary">
                        <ListOrdered className="w-5 h-5" />
                     </div>
                     <div>
                         <h3 className="text-sm font-bold text-white">Aggregated Multi-Query Results</h3>
                         <p className="text-xs text-text-subtle">Results from multiple sub-queries have been fused into a single ranking.</p>
                     </div>
                 </div>
                 <div className="space-y-2 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
                    {groups[0].chunks.map((chunk, idx) => <ContentCard key={idx} data={chunk} rank={idx} highlight={idx < 3} />)}
                 </div>
            </div>
         );
    }

    if (groups.length === 0) {
         return (
             <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                 <AlertOctagon className="w-6 h-6 mx-auto mb-2 text-text-subtle" />
                 <p className="text-xs text-text-subtle">Could not identify multi-query structure. Showing raw results.</p>
                 <StandardRetrievalView raw={raw} />
             </div>
         );
    }

    return (
        <div className="space-y-6 pb-6">
             {/* Header */}
             <div className="flex items-center gap-3 p-4 rounded-xl bg-gradient-to-r from-tertiary/10 to-transparent border border-tertiary/10">
                 <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary">
                    <Split className="w-5 h-5" />
                 </div>
                 <div>
                     <h3 className="text-sm font-bold text-white">Multi-Query Execution</h3>
                     <p className="text-xs text-text-subtle">Generated <span className="text-tertiary font-mono font-bold">{groups.length}</span> sub-queries to maximize coverage.</p>
                 </div>
             </div>

            {groups.map((group, i) => (
                <div key={i} className="animate-fade-in-up" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-center gap-3 mb-3 pl-1">
                        <div className="w-6 h-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary text-[10px] font-bold">
                            Q{i + 1}
                        </div>
                        <span className="text-xs font-bold text-white italic opacity-90 truncate">"{group.query}"</span>
                        <div className="h-px flex-1 bg-white/10"></div>
                        <span className="text-[9px] font-mono text-text-subtle uppercase">{group.chunks.length} hits</span>
                    </div>
                    <div className="space-y-2 pl-3 border-l border-white/5 ml-3">
                        {group.chunks.map((chunk, idx) => <ContentCard key={idx} data={chunk} rank={idx} highlight={idx === 0} />)}
                    </div>
                </div>
            ))}
        </div>
    );
};

/**
 * 2. RERANK / FUSION VIEW
 * Expects a flat list of results with scores.
 */
const RerankView: React.FC<{ raw: any, type: 'semantic' | 'hybrid' | 'fusion' | 'expanded' }> = ({ raw, type }) => {
    const docs = findDocsDeep(raw); // Flatten everything into a list

    // Config based on type
    const config = {
        semantic: { icon: Target, title: 'Semantic Rerank', text: 'Documents re-ordered using cross-encoder precision.', color: 'text-secondary', bg: 'bg-secondary/10', border: 'border-secondary/20' },
        hybrid: { icon: Layers, title: 'Hybrid Rerank', text: 'Combined keyword and vector results, then reranked.', color: 'text-tertiary', bg: 'bg-tertiary/10', border: 'border-tertiary/20' },
        fusion: { icon: Gauge, title: 'Fusion Rank', text: 'Reciprocal Rank Fusion (RRF) of multiple retrieval methods.', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' },
        expanded: { icon: Sparkles, title: 'Expanded Hybrid Rerank', text: 'Query expansion with hybrid retrieval and cross-encoder scoring.', color: 'text-primary', bg: 'bg-primary/10', border: 'border-primary/20' }
    }[type];

    const Icon = config.icon;

    if (docs.length === 0) {
        return (
             <div className="p-4 bg-white/5 border border-white/10 rounded-xl text-center">
                 <p className="text-xs text-text-subtle">No documents found in response.</p>
             </div>
        );
    }

    return (
        <div className="space-y-4 pb-6">
            <div className={`p-4 ${config.bg} border ${config.border} rounded-xl flex items-start gap-3 mb-4 animate-fade-in-up`}>
                 <div className={`p-2 rounded-lg bg-black/20 ${config.color}`}>
                    <Icon className="w-5 h-5" />
                 </div>
                 <div className="space-y-1 pt-0.5">
                     <h4 className="text-xs font-bold text-white uppercase tracking-wider">{config.title}</h4>
                     <p className="text-xs text-white/80 leading-relaxed">
                         {config.text}
                     </p>
                 </div>
            </div>
            
            <div className="space-y-3">
                {docs.map((chunk, idx) => (
                    <div key={idx} className="relative animate-fade-in-up" style={{ animationDelay: `${idx * 0.05}s` }}>
                        {/* Rank Indicator for Top 3 */}
                        {idx < 3 && (
                            <div className="absolute -left-3 top-4 flex flex-col items-center gap-1 z-10">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg border ${
                                    idx === 0 ? 'bg-amber-400 text-black border-amber-300' : 
                                    idx === 1 ? 'bg-gray-300 text-black border-gray-200' : 
                                    'bg-amber-700 text-white border-amber-600'
                                }`}>
                                    {idx + 1}
                                </div>
                            </div>
                        )}
                        <div className={idx < 3 ? 'pl-4' : ''}>
                             <ContentCard data={chunk} rank={idx} showScore={true} highlight={idx < 3} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

/**
 * 3. STANDARD VIEW
 */
const StandardRetrievalView: React.FC<{ raw: any }> = ({ raw }) => {
    const docs = findDocsDeep(raw);

    return (
        <div className="space-y-3 pb-6">
            <div className="p-3 bg-white/5 border border-white/10 rounded-lg flex items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-text-subtle" />
                    <span className="text-xs font-bold text-white">Retrieved Context</span>
                </div>
                <div className="text-[10px] font-mono text-text-subtle px-2 py-0.5 rounded bg-white/5 border border-white/5">
                    {docs.length} Documents
                </div>
            </div>
            
            {docs.length === 0 && <div className="text-text-subtle text-xs italic p-4 text-center">No documents retrieved.</div>}
            {docs.map((chunk, idx) => <ContentCard key={idx} data={chunk} rank={idx} showScore={true} />)}
        </div>
    );
};

// --- RETRIEVAL PANEL CONTROLLER ---

export const RetrievalPanel: React.FC<{ 
    strategyId: string | undefined, 
    citations: any[], 
    rawRetrieval: any 
}> = ({ strategyId, citations, rawRetrieval }) => {
    const [viewMode, setViewMode] = useState<'parsed' | 'raw'>('parsed');

    // Prefer rawRetrieval for accurate rendering, fallback to citations if raw is missing
    const dataToRender = rawRetrieval || citations;
    const hasData = dataToRender && (Array.isArray(dataToRender) ? dataToRender.length > 0 : Object.keys(dataToRender).length > 0);

    const renderStrategy = () => {
        if (!hasData) {
             return (
                <div className="h-full flex flex-col items-center justify-center text-text-subtle opacity-50 p-8 text-center animate-fade-in">
                    <FolderOpen className="w-12 h-12 mb-4 stroke-1 opacity-50" />
                    <h3 className="text-lg font-bold text-white mb-2">No Context Available</h3>
                    <p className="max-w-xs text-xs mb-6 leading-relaxed">The retrieval step returned empty results or the format was unrecognized.</p>
                    <Button variant="outline" onClick={() => setViewMode('raw')} className="!h-8 !text-xs !px-4">Inspect Raw JSON</Button>
                </div>
             );
        }

        // Strategy Router
        switch (strategyId) {
            case 'multi-query':
                return <MultiQueryView raw={dataToRender} />;
            case 'expanded-hybrid':
                return <RerankView raw={dataToRender} type="expanded" />;
            case 'semantic-rerank':
                return <RerankView raw={dataToRender} type="semantic" />;
            case 'hybrid-rerank':
                return <RerankView raw={dataToRender} type="hybrid" />;
            case 'fusion':
                return <RerankView raw={dataToRender} type="fusion" />;
            case 'semantic-context':
            default:
                return <StandardRetrievalView raw={dataToRender} />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#0A0A0F]">
            {/* Toolbar */}
            <div className="flex p-4 gap-2 border-b border-white/5 bg-[#0A0A0F] shrink-0">
                  <button 
                    onClick={() => setViewMode('parsed')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center justify-center gap-2 ${viewMode === 'parsed' ? 'text-white bg-white/5 border-white/10 shadow-inner' : 'text-text-subtle hover:text-white border-transparent hover:bg-white/5'}`}
                  >
                      <ListOrdered className="w-3.5 h-3.5" />
                      Visual
                  </button>
                  <button 
                    onClick={() => setViewMode('raw')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider rounded-lg border transition-all flex items-center justify-center gap-2 ${viewMode === 'raw' ? 'text-secondary bg-secondary/5 border-secondary/20 shadow-inner' : 'text-text-subtle hover:text-white border-transparent hover:bg-white/5'}`}
                  >
                      <Code className="w-3.5 h-3.5" />
                      Raw JSON
                  </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-5 relative">
                {viewMode === 'parsed' ? renderStrategy() : (
                    <div className="h-full relative group animate-fade-in">
                        <div className="absolute top-2 right-2 flex gap-2 z-10">
                             <span className="text-[10px] font-mono bg-white/10 px-2 py-1 rounded text-text-subtle border border-white/5">ReadOnly</span>
                        </div>
                        <pre className="text-[10px] font-mono text-gray-400 bg-[#050508] p-4 rounded-xl border border-white/5 h-full overflow-auto leading-relaxed">
                            {JSON.stringify(rawRetrieval || citations, null, 2)}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};

// --- MAIN CHAT COMPONENT ---

const SAVE_HISTORY_WEBHOOK = 'https://n8nserver.sportnavi.de/webhook/e7d2f3b6-5029-4eb9-a115-f9f2b16eacb0-save-notebook-chat';
const PULL_HISTORY_WEBHOOK = 'https://n8nserver.sportnavi.de/webhook/e7d2f3b6-5029-4eb9-a115-f9f2b16eacb0-pull-notebook-chat';
const CLEAR_HISTORY_WEBHOOK = 'https://n8nserver.sportnavi.de/webhook/e7d2f3b6-5029-4eb9-a115-f9f2b16eacb0-clear-notebook-chat';

interface NotebookChatProps {
  config: NotebookConfig;
  notebookId: string;
  notebookName: string;
  onConfigChange: (newConfig: NotebookConfig) => void;
}

const NotebookChat: React.FC<NotebookChatProps> = ({ config, notebookId, notebookName, onConfigChange }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [activeMessage, setActiveMessage] = useState<Message | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // --- NORMALIZE CHUNKS (For Chat Citations Only) ---
  const normalizeChunks = (rawData: any): any[] => {
      // Reuse the deep finder for consistency
      const chunks = findDocsDeep(rawData);
      
      // Simple deduplication based on content
      const unique = new Map();
      chunks.forEach(c => {
          const content = c.pageContent || c.text || c.content || c.chunk || c.chunk_text || JSON.stringify(c);
          if (!unique.has(content)) {
              unique.set(content, c);
          }
      });
      
      return Array.from(unique.values());
  };

  // Fetch History
  useEffect(() => {
    let isMounted = true;

    const fetchHistory = async () => {
        setIsLoadingHistory(true);
        try {
            const response = await fetch(PULL_HISTORY_WEBHOOK, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId })
            });

            const text = await response.text();
            let data: any[] = [];
            if (text) {
                try {
                    const parsed = JSON.parse(text);
                    data = Array.isArray(parsed) ? parsed : (parsed.data ? parsed.data : [parsed]);
                } catch (e) {
                    console.warn("Invalid JSON response from history webhook");
                }
            }

            if (!isMounted) return;

            const historyMessages: Message[] = data.map((item: any) => {
                const msgData = item.json ? item.json : item; // Handle n8n wrapping
                const ts = msgData.created_at ? new Date(msgData.created_at) : new Date();

                // Restore Citations
                let citations: DynamicChunk[] = [];
                if (msgData.citations && Array.isArray(msgData.citations)) {
                    citations = msgData.citations;
                }

                return {
                    id: msgData.id || crypto.randomUUID(),
                    role: (msgData.role === 'user' || msgData.role === 'assistant') ? msgData.role : 'user',
                    content: msgData.content || '',
                    citations: citations,
                    strategyId: msgData.run_metadata?.strategy_id, // Restore Strategy ID
                    rawRetrieval: msgData.run_metadata?.raw_retrieval, // Restore Raw Retrieval if saved
                    timestamp: !isNaN(ts.getTime()) ? ts : new Date(),
                    isError: !!msgData.run_metadata?.error
                };
            });
            
            historyMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            setMessages(historyMessages);

        } catch (err) {
            console.error("Failed to load conversation history:", err);
        } finally {
            if (isMounted) setIsLoadingHistory(false);
        }
    };

    if (notebookId) {
        setMessages([]);
        fetchHistory();
    }

    return () => { isMounted = false; };
  }, [notebookId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoadingHistory]);

  useEffect(() => {
      if (!isLoadingHistory) {
          inputRef.current?.focus();
      }
  }, [isLoadingHistory]);

  const saveMessageToHistory = (msg: Message, runMetadata?: any) => {
      const payload = {
          id: msg.id,
          notebook_id: notebookId,
          role: msg.role,
          content: msg.content,
          citations: msg.citations || [],
          run_metadata: {
              ...(runMetadata || {}),
              strategy_id: msg.strategyId,
              raw_retrieval: msg.rawRetrieval // Persist raw data for detailed inspection
          },
          created_at: msg.timestamp.toISOString()
      };
      fetch(SAVE_HISTORY_WEBHOOK, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
      }).catch(err => console.error("Failed to save chat history:", err));
  };

  const executeClearHistory = async () => {
    setShowClearConfirm(false);
    const payload = { 
        notebook_id: notebookId,
        timestamp: new Date().toISOString()
    };
    try {
        await fetch(CLEAR_HISTORY_WEBHOOK, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain' },
            body: JSON.stringify(payload)
        });
        setMessages([]);
        setActiveMessage(null);
    } catch (error) {
        console.error("❌ Network Error Clearing History:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isProcessing) return;

    const userMsg: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsProcessing(true);
    setActiveMessage(null); 
    saveMessageToHistory(userMsg);

    try {
        const activeStrategy = config.strategies[config.activeStrategyId];
        
        if (!activeStrategy.retrievalWebhook) throw new Error("Retrieval Webhook URL is missing.");
        if (!activeStrategy.agenticWebhook) throw new Error("Agentic Webhook URL is missing.");

        const commonConfig = {
            notebook_id: notebookId,
            active_strategy_id: config.activeStrategyId,
            strategies_config: config.strategies,
            inference_config: config.inference,
            system_prompts: config.systemPrompts,
            embedding_model: config.embeddingModel
        };

        const retrievalPayload = { question: userMsg.content, ...commonConfig };
        const agenticPayload = {
            question: userMsg.content,
            chat_history: messages.map(m => ({ role: m.role, content: m.content })),
            ...commonConfig
        };

        const [retrievalRes, agenticRes] = await Promise.all([
            fetch(activeStrategy.retrievalWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(retrievalPayload)
            }),
            fetch(activeStrategy.agenticWebhook, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(agenticPayload)
            })
        ]);

        if (!retrievalRes.ok) throw new Error(`Retrieval Failed: ${retrievalRes.status}`);
        if (!agenticRes.ok) throw new Error(`Agent Generation Failed: ${agenticRes.status}`);

        const [retrievalData, agenticData] = await Promise.all([
            retrievalRes.json(),
            agenticRes.json()
        ]);

        const normalizedChunks = normalizeChunks(retrievalData);
        
        // Handle n8n agent response
        const dataItem = Array.isArray(agenticData) ? agenticData[0] : agenticData;
        const answerText = dataItem.output || dataItem.text || dataItem.answer || dataItem.content || "No text response generated.";

        const assistantMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: answerText,
            citations: normalizedChunks,
            strategyId: config.activeStrategyId, // Save Strategy ID
            rawRetrieval: retrievalData, // Save Raw Data for dedicated renderers
            timestamp: new Date()
        };

        setMessages(prev => [...prev, assistantMsg]);
        saveMessageToHistory(assistantMsg, { chunks_count: normalizedChunks.length });

    } catch (error: any) {
        console.error("Pipeline Error:", error);
        const errorMsg: Message = {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${error.message || "Unknown error in RAG pipeline."}`,
            timestamp: new Date(),
            isError: true
        };
        setMessages(prev => [...prev, errorMsg]);
    } finally {
        setIsProcessing(false);
        setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex h-full animate-fade-in relative">
        
      {/* LEFT: Chat Area */}
      <div className={`flex flex-col h-full transition-all duration-300 ${activeMessage ? 'w-2/3 border-r border-white/5' : 'w-full'}`}>
        
        {/* Header - Added z-50 for Dropdown Stacking */}
        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#050508]/80 backdrop-blur-sm shrink-0 relative z-50">
             <div className="flex items-center gap-3">
                 <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
                     <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                     <span className="text-xs font-bold text-white">RAG Agent Active</span>
                 </div>

                 {/* Strategy Selector */}
                 <div className="h-4 w-px bg-white/10"></div>
                 <StrategySelector 
                    currentStrategyId={config.activeStrategyId}
                    onSelect={(id) => onConfigChange({...config, activeStrategyId: id})}
                 />

                 <div className="h-4 w-px bg-white/10"></div>
                 <span className="text-xs font-mono text-text-subtle">{config.inference.model}</span>
             </div>
             
             <div className="flex items-center gap-2">
                 {showClearConfirm ? (
                     <div className="flex items-center gap-2 animate-fade-in-right">
                         <span className="text-xs text-red-400 font-bold">Delete History?</span>
                         <button onClick={executeClearHistory} className="px-2 py-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30 text-xs border border-red-500/30">Yes</button>
                         <button onClick={() => setShowClearConfirm(false)} className="px-2 py-1 rounded bg-white/5 text-text-subtle hover:text-white text-xs">No</button>
                     </div>
                 ) : (
                    <button 
                        onClick={() => setShowClearConfirm(true)}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-all text-xs font-medium group"
                        title="Clear History"
                    >
                        <Trash2 className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                        <span className="hidden sm:inline">Clear History</span>
                    </button>
                 )}
             </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 z-0">
            {messages.length === 0 && !isLoadingHistory && (
                <div className="h-full flex flex-col items-center justify-center text-center opacity-50 select-none">
                    <div className="w-24 h-24 rounded-full bg-surface border border-white/10 flex items-center justify-center mb-6">
                        <Bot className="w-10 h-10 text-primary" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Ready to assist</h3>
                    <p className="text-text-subtle max-w-sm">Ask questions about your documents. I'll cite my sources for every answer.</p>
                </div>
            )}
            
            {isLoadingHistory && (
                 <div className="h-full flex items-center justify-center">
                     <Loader2 className="w-8 h-8 text-primary animate-spin" />
                 </div>
            )}

            {messages.map((msg) => {
                // Calculate retrieval count dynamically by checking citations AND raw data fallback
                // This ensures the button state matches the retrieval panel content
                const sourceCount = msg.citations?.length || (msg.rawRetrieval ? findDocsDeep(msg.rawRetrieval).length : 0);

                return (
                <div key={msg.id} className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} animate-fade-in-up`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 shadow-lg border ${msg.role === 'user' ? 'bg-[#1A1A21] border-white/10' : 'bg-surface border-primary/20 shadow-[0_0_15px_rgba(126,249,255,0.1)]'}`}>
                        {msg.role === 'user' ? <User className="w-5 h-5 text-text-subtle" /> : <Bot className="w-5 h-5 text-primary" />}
                    </div>
                    
                    <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                         <div className={`px-6 py-4 rounded-2xl shadow-sm text-sm leading-relaxed whitespace-pre-wrap ${
                             msg.role === 'user' 
                                ? 'bg-[#1A1A21] border border-white/10 text-white rounded-tr-none' 
                                : 'bg-surface/80 border border-white/5 text-gray-200 rounded-tl-none backdrop-blur-md'
                         } ${msg.isError ? 'border-red-500/30 bg-red-500/5 text-red-200' : ''}`}>
                             {msg.content}
                         </div>
                         
                         {/* Citation / Context Button for Assistant */}
                         {msg.role === 'assistant' && !msg.isError && (
                             <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => setActiveMessage(activeMessage?.id === msg.id ? null : msg)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                        activeMessage?.id === msg.id 
                                            ? 'bg-primary/10 text-primary border-primary/30 shadow-[0_0_10px_rgba(126,249,255,0.2)]' 
                                            : 'bg-white/5 text-text-subtle border-white/5 hover:border-primary/30 hover:text-primary hover:bg-primary/5'
                                    }`}
                                >
                                    {sourceCount > 0 ? (
                                        <>
                                            <Sparkles className="w-3 h-3" />
                                            <span>{sourceCount} Sources</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertOctagon className="w-3 h-3 text-amber-500" />
                                            <span>No Context</span>
                                        </>
                                    )}
                                </button>
                                {msg.strategyId && (
                                    <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded text-text-subtle border border-white/5 uppercase tracking-wider">{msg.strategyId}</span>
                                )}
                                <span className="text-[10px] text-text-subtle opacity-50">{msg.timestamp.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                             </div>
                         )}
                    </div>
                </div>
            )})}
            
            {/* Thinking Indicator */}
            {isProcessing && (
                <div className="flex gap-4 animate-fade-in-up">
                     <div className="w-10 h-10 rounded-full bg-surface border border-primary/20 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(126,249,255,0.1)]">
                        <Bot className="w-5 h-5 text-primary" />
                    </div>
                    <div className="px-6 py-4 rounded-2xl bg-surface/80 border border-white/5 rounded-tl-none flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 rounded-full bg-primary/40 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                </div>
            )}
            <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 pt-0 bg-transparent relative z-20">
            <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-secondary/10 blur-xl rounded-2xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="relative flex items-center bg-[#0E0E12] border border-white/20 rounded-2xl p-2 shadow-2xl focus-within:border-primary/50 transition-colors">
                    <div className="pl-4 text-primary">
                        <Bot className="w-5 h-5" />
                    </div>
                    <input 
                        ref={inputRef}
                        type="text" 
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask anything..." 
                        className="flex-1 bg-transparent border-none text-white px-4 py-3 focus:outline-none text-sm placeholder-text-subtle/50"
                        disabled={isProcessing}
                    />
                    <Button 
                        onClick={() => handleSendMessage()} 
                        disabled={!input.trim() || isProcessing}
                        variant="primary" 
                        className="!rounded-xl !h-10 !px-4 disabled:opacity-50"
                    >
                        {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
      </div>

      {/* RIGHT: Retrieval Inspector */}
      {activeMessage && (
          <div className="w-1/3 h-full bg-[#0A0A0F] border-l border-white/10 flex flex-col shadow-2xl animate-fade-in-right z-30 relative">
              <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 shrink-0 bg-[#050508]">
                  <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-secondary" />
                      <span className="font-bold text-white text-sm">Retrieval Context</span>
                  </div>
                  <button onClick={() => setActiveMessage(null)} className="p-2 hover:bg-white/5 rounded-lg text-text-subtle hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                  </button>
              </div>

              <RetrievalPanel 
                  strategyId={activeMessage.strategyId} 
                  citations={activeMessage.citations || []}
                  rawRetrieval={activeMessage.rawRetrieval} 
              />
          </div>
      )}
    </div>
  );
};

export default NotebookChat;
