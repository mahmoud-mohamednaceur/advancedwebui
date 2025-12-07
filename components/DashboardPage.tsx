import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Database, 
  CheckCircle2, 
  Loader2, 
  Clock, 
  AlertCircle,
  Activity,
  ArrowUpRight,
  Zap,
  Copy,
  Check,
  Book,
  FileText,
  Layers,
  Server,
  Trash2,
  X,
  Binary,
  Plus
} from 'lucide-react';
import Button from './ui/Button';

// Constants
const PULL_NOTEBOOKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-pull-notebooks';
const NOTEBOOK_DETAILS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-get-notebook-details-information';
const DELETE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-clear-notebook';
const CREATE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-create-notebook';
const ORCHESTRATOR_ID = '301f7482-1430-466d-9721-396564618751';

type Status = 'success' | 'processing' | 'pending' | 'error';

interface NotebookData {
  id: string;
  name: string;
  status: Status;
  documents: number;
  lastSync: string;
  created: string;
  raw_updated_at?: string;
  // Detailed stats for the new UI
  stats: {
    success: number;
    processing: number;
    pending: number;
    error: number;
    total: number;
  }
}

const StatusBadge = ({ status }: { status: Status }) => {
  const styles = {
    success: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_10px_rgba(52,211,153,0.15)]',
    processing: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_10px_rgba(96,165,250,0.15)]',
    pending: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
    error: 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_10px_rgba(248,113,113,0.15)]',
  };
  
  const Icons = {
    success: CheckCircle2,
    processing: Loader2,
    pending: Clock,
    error: AlertCircle,
  };
  
  const Icon = Icons[status];
  
  return (
    <div className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${styles[status]} transition-all duration-300`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'processing' ? 'animate-spin' : ''}`} />
      <span>{status === 'processing' ? 'Syncing' : status === 'success' ? 'Active' : status}</span>
    </div>
  );
};

// Component: Pipeline Progress Bar (Enhanced)
const PipelineProgress = ({ stats }: { stats: NotebookData['stats'] }) => {
    const total = stats.total || 0;
    
    // Empty State
    if (total === 0) {
        return (
            <div className="w-full max-w-[240px] opacity-40">
                <div className="flex justify-between text-[10px] font-mono text-text-subtle mb-1.5">
                    <span>EMPTY CONTEXT</span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-white/5 border border-white/5"></div>
            </div>
        );
    }

    const successPct = (stats.success / total) * 100;
    const processingPct = ((stats.processing + stats.pending) / total) * 100;
    const errorPct = (stats.error / total) * 100;

    return (
        <div className="w-full max-w-[240px] flex flex-col gap-1.5">
            {/* Stats Breakdown Row */}
            <div className="flex justify-between items-end">
                <div className="flex items-center gap-2">
                    <span className="text-white font-bold text-xs">{total} Files</span>
                </div>
                
                <div className="flex gap-3 text-[9px] font-bold uppercase tracking-wider">
                     {stats.processing + stats.pending > 0 && (
                         <span className="text-blue-400 flex items-center gap-1 animate-pulse">
                            <div className="w-1 h-1 rounded-full bg-blue-400"></div>
                            {stats.processing + stats.pending} Syncing
                         </span>
                     )}
                     {stats.error > 0 && (
                         <span className="text-red-400 flex items-center gap-1">
                            <div className="w-1 h-1 rounded-full bg-red-400"></div>
                            {stats.error} Failed
                         </span>
                     )}
                     <span className="text-emerald-400/80">{Math.round(successPct)}% Ready</span>
                </div>
            </div>

            {/* Segmented Bar */}
            <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-white/5">
                {successPct > 0 && <div style={{ width: `${successPct}%` }} className="h-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />}
                {processingPct > 0 && <div style={{ width: `${processingPct}%` }} className="h-full bg-blue-500 animate-pulse" />}
                {errorPct > 0 && <div style={{ width: `${errorPct}%` }} className="h-full bg-red-500" />}
            </div>
        </div>
    );
};

// Component: Stat Card
const MetricCard = ({ label, value, subtext, icon: Icon, colorClass, delay, borderClass }: any) => (
    <div className={`bg-surface/60 backdrop-blur-xl border ${borderClass || 'border-white/5'} rounded-2xl p-6 flex items-start gap-5 hover:border-white/10 hover:translate-y-[-2px] transition-all duration-300 group animate-fade-in-up relative overflow-hidden shadow-lg`} style={{ animationDelay: delay }}>
        
        {/* Icon Box */}
        <div className={`p-3.5 rounded-xl bg-[#0A0A0F] border border-white/5 group-hover:scale-110 transition-transform duration-300 z-10 ${colorClass}`}>
            <Icon className="w-6 h-6" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col">
            <p className="text-text-subtle text-[10px] font-bold uppercase tracking-widest mb-1.5 opacity-80">{label}</p>
            <div className="flex items-baseline gap-2">
                <h3 className="text-3xl font-black text-white font-display tracking-tight leading-none">{value}</h3>
            </div>
            {subtext && <p className="text-xs text-text-subtle/60 font-medium mt-1.5">{subtext}</p>}
        </div>

        {/* Dynamic Background Glow */}
        <div className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700 blur-[50px] pointer-events-none ${colorClass.replace('text-', 'bg-').replace('bg-', 'bg-opacity-20 ')}`}></div>
    </div>
);

// Component: Delete Confirmation Modal
const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, isDeleting }: any) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up" onClick={onClose}>
            <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-white/5 flex items-center gap-3 bg-red-500/5">
                     <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
                        <Trash2 className="w-5 h-5" />
                     </div>
                     <h2 className="text-lg font-bold text-white">Delete Notebook?</h2>
                </div>
                <div className="p-6">
                    <p className="text-text-subtle text-sm leading-relaxed">
                        This action will permanently remove this notebook and all associated documents. This cannot be undone.
                    </p>
                </div>
                <div className="p-6 border-t border-white/5 bg-surface/50 flex justify-end gap-3">
                    <button onClick={onClose} disabled={isDeleting} className="px-4 py-2 rounded-lg border border-white/10 hover:bg-white/5 text-text-subtle hover:text-white text-xs font-bold transition-all">Cancel</button>
                    <button 
                        onClick={onConfirm} 
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg bg-red-500 border border-red-500 hover:bg-red-600 text-white text-xs font-bold shadow-lg flex items-center gap-2"
                    >
                        {isDeleting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                        <span>Delete Permanently</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// Component: Create Modal
interface CreateModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreate: (data: { title: string; description: string; embeddingModel: string }) => Promise<void>;
    isLoading: boolean;
}

const OpenAILogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.0462 6.0462 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 3.5366-2.1956a1.0276 1.0276 0 0 0 .512-.9408v-4.47l4.198 2.3766v2.8026a4.4966 4.4966 0 0 1-5.512 3.5484zm-5.916-5.061a4.4918 4.4918 0 0 1 0-5.4707v4.2154l3.638 2.0935v.0152l-2.5046 1.5227a1.0381 1.0381 0 0 0-.5235.8975v.0123a4.4842 4.4842 0 0 1-.6099-3.286zM4.567 6.7019a4.4966 4.4966 0 0 1 5.426-3.6582v2.8035L5.8012 8.22a1.0352 1.0352 0 0 0-.533.8984v4.186l-2.5532-1.5484a4.4966 4.4966 0 0 1 1.852-5.0541zm12.9367-1.5385v-2.8035a4.4966 4.4966 0 0 1 2.165 7.7821l-2.577 1.4816v-4.2068l3.7238-2.2451zM13.32 5.0804a4.4966 4.4966 0 0 1 2.787 1.105l-3.586 2.1936a1.0362 1.0362 0 0 0-.5044.9504v4.4423l-4.2503-2.3671V8.5702a4.5252 4.5252 0 0 1 5.5537-3.4898z" />
    </svg>
);

const OllamaLogo = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} xmlns="http://www.w3.org/2000/svg">
       <path d="M21.56,11.6C21.34,7.82,17.83,5.71,14.78,5.32V4.07C14.78,2.5,13.61,1.21,12.12,1.21S9.46,2.5,9.46,4.07v1.25C6.4,5.71,2.9,7.82,2.68,11.6c-0.12,2.04,0.64,4.31,2.2,5.82C4.25,18.12,4,19,4,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-0.32-0.06-0.63-0.15-0.92c0.71,0.12,1.44,0.17,2.15,0.17s1.44-0.05,2.15-0.17C14.06,19.37,14,19.68,14,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-1-0.25-1.88-0.88-2.58C20.92,15.91,21.68,13.64,21.56,11.6z M16,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S16.83,12.5,16,12.5z M8.24,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S9.07,12.5,8.24,12.5z M12.12,16c-0.63,0-1.21-0.19-1.68-0.52c0.47-0.26,0.96-0.41,1.68-0.41s1.21,0.16,1.68,0.41C13.33,15.81,12.75,16,12.12,16z"/>
    </svg>
);

const CreateModal: React.FC<CreateModalProps> = ({ isOpen, onClose, onCreate, isLoading }) => {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [embeddingModel, setEmbeddingModel] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTitle('');
            setDescription('');
            setEmbeddingModel('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (title && embeddingModel) {
            await onCreate({ title, description, embeddingModel });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-[#0A0A0F] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative" onClick={e => e.stopPropagation()}>
                
                <div className="p-6 border-b border-white/5 flex justify-between items-center bg-surface/50">
                    <div>
                        <h2 className="text-xl font-bold text-white">Create New Notebook</h2>
                        <p className="text-sm text-text-subtle">Configure your knowledge context.</p>
                    </div>
                    <button 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="p-2 rounded-lg hover:bg-white/5 text-text-subtle hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-8">
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-subtle uppercase tracking-wider">Notebook Name <span className="text-primary">*</span></label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="e.g., Q4 Product Strategy"
                                    disabled={isLoading}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-colors text-sm font-medium placeholder-text-subtle/30 disabled:opacity-50"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-subtle uppercase tracking-wider">Description</label>
                                <textarea 
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe the documents and purpose of this notebook..."
                                    disabled={isLoading}
                                    className="w-full bg-surface border border-white/10 rounded-xl px-4 py-3 text-white focus:border-primary/50 focus:outline-none transition-colors h-24 resize-none text-sm leading-relaxed placeholder-text-subtle/30 disabled:opacity-50"
                                />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2">
                                <Binary className="w-4 h-4 text-indigo-400" />
                                <label className="text-xs font-bold text-white uppercase tracking-wider">Embedding Model <span className="text-primary">*</span></label>
                            </div>
                            
                            <p className="text-xs text-text-subtle bg-indigo-500/10 border border-indigo-500/20 p-3 rounded-lg">
                                <span className="font-bold text-indigo-300">Important:</span> This selection is permanent. It determines how your documents are vectorized.
                            </p>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div 
                                    onClick={() => !isLoading && setEmbeddingModel('nomic-embed-text:latest')}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 
                                        ${embeddingModel === 'nomic-embed-text:latest' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-surface border-white/5 hover:border-white/20'}
                                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
                                        <OllamaLogo className="w-6 h-6 text-orange-500" />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold mb-1 ${embeddingModel === 'nomic-embed-text:latest' ? 'text-white' : 'text-text-subtle'}`}>Nomic Embed</div>
                                        <div className="text-[10px] text-text-subtle opacity-70 font-mono">nomic-embed-text:latest</div>
                                    </div>
                                </div>

                                <div 
                                    onClick={() => !isLoading && setEmbeddingModel('text-embedding-3-small')}
                                    className={`cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex items-start gap-3 
                                        ${embeddingModel === 'text-embedding-3-small' ? 'bg-indigo-500/10 border-indigo-500' : 'bg-surface border-white/5 hover:border-white/20'}
                                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className="w-10 h-10 rounded-lg bg-green-500/10 flex items-center justify-center shrink-0">
                                        <OpenAILogo className="w-6 h-6 text-green-500" />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold mb-1 ${embeddingModel === 'text-embedding-3-small' ? 'text-white' : 'text-text-subtle'}`}>OpenAI Small</div>
                                        <div className="text-[10px] text-text-subtle opacity-70 font-mono">text-embedding-3-small</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </form>
                </div>

                <div className="p-6 border-t border-white/5 bg-surface/50 flex justify-end gap-3">
                    <Button 
                        variant="outline" 
                        onClick={onClose} 
                        disabled={isLoading}
                        className="!h-10 border-white/10 hover:bg-white/5 text-text-subtle hover:text-white"
                    >
                        Cancel
                    </Button>
                    <Button 
                        variant="primary" 
                        onClick={handleSubmit}
                        disabled={!title || !embeddingModel || isLoading}
                        className={`!h-10 shadow-none transition-opacity ${(!title || !embeddingModel) ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-neon-primary'}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Creating...
                            </>
                        ) : (
                            "Create Notebook"
                        )}
                    </Button>
                </div>

            </div>
        </div>
    );
};

interface DashboardPageProps {
  onOpenNotebook?: (id: string, name: string) => void;
  onRegisterEmbedding?: (id: string, modelId: string) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = ({ onOpenNotebook, onRegisterEmbedding }) => {
  const [notebooks, setNotebooks] = useState<NotebookData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [metrics, setMetrics] = useState({ totalDocs: 0, activeJobs: 0, totalContexts: 0 });
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Delete States
  const [notebookToDelete, setNotebookToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Create States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const handleCopy = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      navigator.clipboard.writeText(id);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExecuteDelete = async () => {
    if (!notebookToDelete) return;
    setIsDeleting(true);
    try {
        const response = await fetch(DELETE_NOTEBOOK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ notebook_id: notebookToDelete, orchestrator_id: ORCHESTRATOR_ID })
        });
        
        if (response.ok) {
             setNotebooks(prev => prev.filter(n => n.id !== notebookToDelete));
             // Recalculate metrics locally for immediate feedback
             setMetrics(prev => ({
                 ...prev,
                 totalContexts: Math.max(0, prev.totalContexts - 1)
             }));
             setNotebookToDelete(null);
        }
    } catch (e) {
        console.error("Delete failed", e);
    } finally {
        setIsDeleting(false);
    }
  };

  const handleCreate = async (data: { title: string; description: string; embeddingModel: string }) => {
    setIsCreating(true);
    // Generate IDs
    const newId = crypto.randomUUID();
    const now = new Date().toISOString();
    
    try {
        const payload = {
            notebook_id: newId,
            orchestrator_id: ORCHESTRATOR_ID,
            notebook_title: data.title,
            notebook_description: data.description || '',
            number_of_documents: 0,
            created_at: now,
            updated_at: now
        };

        const response = await fetch(CREATE_NOTEBOOK_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Server status: ${response.status}`);
        }
        
        // Success: Update UI
        const newNotebook: NotebookData = {
          id: newId,
          name: data.title,
          status: 'success',
          documents: 0,
          lastSync: 'Just now',
          created: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
          raw_updated_at: now,
          stats: { success: 0, processing: 0, pending: 0, error: 0, total: 0 }
        };
        
        setNotebooks(prev => [newNotebook, ...prev]);
        setMetrics(prev => ({ ...prev, totalContexts: prev.totalContexts + 1 }));
        
        // Register Embedding globally
        if (onRegisterEmbedding) {
            onRegisterEmbedding(newId, data.embeddingModel);
        }

        setIsCreateModalOpen(false);

    } catch (error) {
        console.error("Failed to create notebook:", error);
        alert("Failed to create notebook. Please ensure the backend is online.");
    } finally {
        setIsCreating(false);
    }
  };

  const fetchNotebooks = async () => {
    setIsLoading(true);
    try {
        // 1. Fetch List
        const listResponse = await fetch(PULL_NOTEBOOKS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orchestrator_id: ORCHESTRATOR_ID })
        });

        if (!listResponse.ok) return;

        const listRaw = await listResponse.json();
        let listData = [];
        if (Array.isArray(listRaw)) listData = listRaw;
        else if (listRaw.data && Array.isArray(listRaw.data)) listData = listRaw.data;
        else if (listRaw.json) listData = [listRaw.json];
        else listData = [listRaw];
        
        listData = listData.map((item: any) => item.json ? item.json : item).filter((d: any) => d && (d.notebook_id || d.id));

        // 2. Fetch Details
        const detailedNotebooks = await Promise.all(listData.map(async (basicItem: any) => {
             const nId = basicItem.notebook_id || basicItem.id;
             let mergedData = { ...basicItem };
             try {
                 const detailRes = await fetch(NOTEBOOK_DETAILS_WEBHOOK_URL, {
                     method: 'POST',
                     headers: { 'Content-Type': 'application/json' },
                     body: JSON.stringify({ notebook_id: nId })
                 });
                 if (detailRes.ok) {
                     const detailRaw = await detailRes.json();
                     let d = Array.isArray(detailRaw) ? detailRaw[0] : detailRaw;
                     if (d.json) d = d.json;
                     mergedData = { ...mergedData, ...d };
                 }
             } catch (err) { console.warn(err); }
             return mergedData;
        }));

        // 3. Map & Aggregate
        let aggTotalDocs = 0;
        let aggActiveJobs = 0;
        let aggSuccess = 0;
        let aggTotalFiles = 0;

        const mappedData: NotebookData[] = detailedNotebooks.map((item: any) => {
             const pending = item.pending_count || 0;
             const processing = item.processing_count || 0;
             const errors = item.error_count || 0;
             const success = item.success_count || 0;
             const total = item.total_files || (pending + processing + errors + success) || 0;
             const isFinished = item.is_finished;

             // Aggregates
             aggTotalDocs += total;
             aggActiveJobs += (pending + processing);
             aggSuccess += success;
             aggTotalFiles += total;

             // Status Logic
             let status: Status = 'success';
             if (processing > 0 || pending > 0 || isFinished === false) status = 'processing';
             else if (errors > 0 && success === 0) status = 'error';
             else if (errors > 0) status = 'success'; // Partial success is still active

             // Date Formatting
             const updatedDate = item.updated_at ? new Date(item.updated_at) : new Date();
             const createdDate = item.created_at ? new Date(item.created_at) : new Date();
             
             const timeAgo = (date: Date) => {
                const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
                let interval = seconds / 86400;
                if (interval > 1) return Math.floor(interval) + "d ago";
                interval = seconds / 3600;
                if (interval > 1) return Math.floor(interval) + "h ago";
                interval = seconds / 60;
                if (interval > 1) return Math.floor(interval) + "m ago";
                return "Just now";
             };

             return {
                 id: item.notebook_id || item.id,
                 name: item.notebook_title || item.title || 'Untitled Notebook',
                 status: status,
                 documents: total,
                 lastSync: item.updated_at ? timeAgo(updatedDate) : 'Unknown',
                 created: createdDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
                 raw_updated_at: item.updated_at,
                 stats: {
                     success, processing, pending, error: errors, total
                 }
             };
        });

        mappedData.sort((a, b) => {
            const dateA = a.raw_updated_at ? new Date(a.raw_updated_at).getTime() : 0;
            const dateB = b.raw_updated_at ? new Date(b.raw_updated_at).getTime() : 0;
            return dateB - dateA;
        });

        setNotebooks(mappedData);
        
        // Update Metrics - ONLY REAL DATA
        setMetrics({
            totalDocs: aggTotalDocs,
            activeJobs: aggActiveJobs,
            totalContexts: mappedData.length
        });

    } catch (e) {
        console.error("Failed to fetch dashboard data", e);
    } finally {
        setIsLoading(false);
    }
  };

  useEffect(() => {
      fetchNotebooks();
      const interval = setInterval(fetchNotebooks, 10000); 
      return () => clearInterval(interval);
  }, []);

  const filteredNotebooks = notebooks.filter(n => 
      n.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      n.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 md:p-10 max-w-[1600px] mx-auto h-full flex flex-col relative z-10 overflow-hidden">
      
      <DeleteConfirmModal 
        isOpen={!!notebookToDelete}
        onClose={() => !isDeleting && setNotebookToDelete(null)}
        onConfirm={handleExecuteDelete}
        isDeleting={isDeleting}
      />

      <CreateModal 
        isOpen={isCreateModalOpen} 
        onClose={() => !isCreating && setIsCreateModalOpen(false)} 
        onCreate={handleCreate}
        isLoading={isCreating}
      />

      {/* Ambient Glow */}
      <div className="absolute top-0 left-0 w-full h-[600px] bg-gradient-to-b from-primary/5 via-transparent to-transparent pointer-events-none -z-10" />
      <div className="absolute top-[-200px] right-[-200px] w-[600px] h-[600px] bg-secondary/5 blur-[120px] rounded-full pointer-events-none -z-10" />

      {/* Header */}
      <div className="flex items-end justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter mb-2 flex items-center gap-3">
            Dashboard
          </h1>
          <div className="flex items-center gap-3 text-text-subtle text-sm">
             <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                <span className="font-bold text-[10px] uppercase tracking-wider">System Operational</span>
             </div>
             <span className="text-white/10">|</span>
             <span className="text-text-subtle/70">Real-time Orchestrator Stream</span>
          </div>
        </div>
        
        <div className="hidden md:flex gap-3">
             <button 
                onClick={fetchNotebooks} 
                className="p-3 rounded-xl bg-surface/50 border border-white/10 text-text-subtle hover:text-white hover:bg-white/5 transition-all shadow-sm" 
                title="Refresh Data"
             >
                 <Zap className={`w-5 h-5 ${isLoading ? 'text-primary animate-pulse' : ''}`} />
             </button>
             <button 
                onClick={() => setIsCreateModalOpen(true)}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-primary text-black font-bold text-sm shadow-[0_0_20px_rgba(126,249,255,0.3)] hover:shadow-[0_0_30px_rgba(126,249,255,0.5)] transition-all hover:-translate-y-0.5 active:translate-y-0"
             >
                 <ArrowUpRight className="w-4 h-4 stroke-[3px]" />
                 <span>Create New Notebook</span>
             </button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <MetricCard 
            label="Total Number of Notebooks" 
            value={metrics.totalContexts} 
            subtext="Notebooks initialized"
            icon={Server} 
            colorClass="text-primary bg-primary/10"
            borderClass="border-primary/20 bg-primary/5"
            delay="0s"
          />
          <MetricCard 
            label="Total Knowledge Base" 
            value={metrics.totalDocs.toLocaleString()} 
            subtext="Indexed documents"
            icon={FileText} 
            colorClass="text-secondary bg-secondary/10"
            borderClass="border-secondary/20 bg-secondary/5"
            delay="0.1s"
          />
      </div>

      {/* Main Table Container */}
      <div className="flex-1 bg-[#0A0A0F]/60 backdrop-blur-2xl border border-white/5 rounded-3xl flex flex-col overflow-hidden shadow-2xl relative animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
        
        {/* Toolbar */}
        <div className="p-5 border-b border-white/5 flex flex-col sm:flex-row gap-4 justify-between items-center bg-white/[0.02]">
           {/* Search */}
           <div className="relative w-full sm:w-96 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-subtle group-focus-within:text-white transition-colors" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search active contexts..." 
                className="block w-full pl-10 pr-4 py-2.5 border border-white/10 rounded-xl bg-[#0F0F13] text-white placeholder-text-subtle/40 focus:outline-none focus:border-white/20 focus:bg-white/5 text-sm transition-all duration-200"
              />
           </div>

           <div className="flex gap-3">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/5">
                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                   <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider">Live Sync</span>
              </div>
           </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-auto custom-scrollbar relative">
          <table className="w-full text-left border-collapse relative z-10">
            <thead className="sticky top-0 z-20 bg-[#0A0A0F] border-b border-white/5 shadow-sm">
              <tr>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle uppercase tracking-widest w-[35%]">Context Name</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle uppercase tracking-widest w-[15%]">Status</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle uppercase tracking-widest w-[30%]">Knowledge Pipeline</th>
                <th className="py-4 px-6 text-[10px] font-bold text-text-subtle uppercase tracking-widest text-right w-[20%]">Last Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.02]">
              {isLoading && notebooks.length === 0 ? (
                 <tr>
                     <td colSpan={4} className="py-32 text-center">
                         <div className="flex flex-col items-center gap-4">
                             <Loader2 className="w-8 h-8 text-primary animate-spin" />
                             <p className="text-text-subtle text-sm animate-pulse">Synchronizing with Orchestrator...</p>
                         </div>
                     </td>
                 </tr>
              ) : filteredNotebooks.length === 0 ? (
                 <tr>
                     <td colSpan={4} className="py-32 text-center text-text-subtle">
                         <div className="flex flex-col items-center gap-3 opacity-50">
                             <Database className="w-10 h-10" />
                             <p>No active contexts found.</p>
                         </div>
                     </td>
                 </tr>
              ) : (
                filteredNotebooks.map((row) => (
                    <tr 
                    key={row.id} 
                    className="group hover:bg-white/[0.02] transition-colors duration-200 relative cursor-pointer"
                    onClick={() => onOpenNotebook && onOpenNotebook(row.id, row.name)}
                    >
                    <td className="py-5 px-6">
                        <div className="flex items-center gap-4">
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 shadow-lg ${
                                row.status === 'processing' 
                                    ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' 
                                    : row.status === 'error'
                                        ? 'bg-red-500/10 border-red-500/20 text-red-400'
                                        : 'bg-[#1A1A21] border-white/5 text-text-subtle group-hover:text-primary group-hover:border-primary/30 group-hover:bg-primary/5'
                            }`}>
                                <Book className="w-5 h-5" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <div className="font-bold text-white text-sm group-hover:text-primary transition-colors truncate mb-1">{row.name}</div>
                                <div className="flex items-center gap-2 group/id">
                                     <span className="font-mono text-[10px] text-text-subtle/50 tracking-wide truncate max-w-[150px]">{row.id}</span>
                                     <button 
                                        onClick={(e) => handleCopy(e, row.id)}
                                        className="opacity-0 group-hover/id:opacity-100 transition-opacity p-1 hover:bg-white/10 rounded"
                                        title="Copy ID"
                                     >
                                        {copiedId === row.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-text-subtle" />}
                                     </button>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td className="py-5 px-6">
                        <StatusBadge status={row.status} />
                    </td>
                    <td className="py-5 px-6">
                        <PipelineProgress stats={row.stats} />
                    </td>
                    <td className="py-5 px-6 text-right">
                        <div className="flex items-center justify-end gap-4">
                            <div className="flex flex-col items-end gap-1">
                                 <div className="text-xs font-bold text-white">{row.lastSync}</div>
                                 <div className="text-[10px] text-text-subtle/50 font-mono">Created {row.created}</div>
                            </div>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setNotebookToDelete(row.id); }}
                                className="p-2 rounded-lg hover:bg-red-500/10 text-text-subtle hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                title="Delete Notebook"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Footer */}
        <div className="p-4 border-t border-white/5 bg-[#0A0A0F] flex justify-between items-center">
           <div className="text-[10px] text-text-subtle uppercase tracking-wider">
                Displaying <span className="font-bold text-white">{filteredNotebooks.length}</span> contexts
           </div>
           <div className="flex gap-2">
             <button disabled className="h-8 px-3 flex items-center justify-center rounded-lg border border-white/10 hover:bg-white/5 text-text-subtle hover:text-white text-xs font-medium transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                Previous
             </button>
             <button disabled className="h-8 px-3 flex items-center justify-center rounded-lg bg-white/5 border border-white/10 text-white text-xs font-medium hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed">
                Next
             </button>
           </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;