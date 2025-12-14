
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import {
    Plus, Trash2, FolderOpen, Book, ArrowRight, Loader2, CheckCircle2,
    AlertCircle, Clock, Image as ImageIcon, X, Binary, AlertTriangle,
    MoreVertical, Calendar, FileText, Sparkles, Search, Command
} from 'lucide-react';
import Button from './ui/Button';
import { isAdmin, hasNotebookPermission, isCreatedByAdmin } from '../utils/admin';
import { logger } from '../utils/logger';

// Constants
const CREATE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-create-notebook';
const PULL_NOTEBOOKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-pull-notebooks';
const DELETE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-clear-notebook';
const DELETE_ALL_NOTEBOOKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-delete-all-notebooks';

// Simulating a consistent user/orchestrator ID for this session
const ORCHESTRATOR_ID = '301f7482-1430-466d-9721-396564618751';

// Types
type Status = 'success' | 'processing' | 'pending' | 'error';

interface Notebook {
    id: string;
    title: string;
    description?: string;
    docCount: number;
    status: Status;
    lastUpdated: string;
    image?: string;
}

// Helper to generate consistent gradients from ID
const getGradientFromId = (id: string) => {
    let hash = 0;
    for (let i = 0; i < id.length; i++) {
        hash = id.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue1 = Math.abs(hash % 360);
    const hue2 = (hue1 + 40) % 360;
    return `linear-gradient(135deg, hsl(${hue1}, 70%, 15%) 0%, hsl(${hue2}, 60%, 10%) 100%)`;
};

const StatusBadge = ({ status }: { status: Status }) => {
    const styles = {
        success: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.2)]',
        processing: 'bg-blue-500/10 text-blue-400 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.2)]',
        pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        error: 'bg-red-500/10 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.2)]',
    };

    const labels = {
        success: 'Active Context',
        processing: 'Syncing',
        pending: 'Queued',
        error: 'System Error',
    };

    const Icons = {
        success: CheckCircle2,
        processing: Loader2,
        pending: Clock,
        error: AlertCircle,
    };

    const Icon = Icons[status];

    return (
        <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase font-bold tracking-wider border backdrop-blur-md ${styles[status]}`}>
            <Icon className={`w-3 h-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
            {labels[status]}
        </div>
    );
};

// --- Modals ---

interface DeleteConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    notebookTitle: string;
    isDeleting: boolean;
}

const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({ isOpen, onClose, onConfirm, notebookTitle, isDeleting }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-[#0A0A0F] border border-red-500/20 rounded-2xl w-full max-w-md shadow-[0_0_50px_rgba(239,68,68,0.1)] flex flex-col relative overflow-hidden animate-scale-in" onClick={e => e.stopPropagation()}>
                {/* Background Accent */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-red-700"></div>

                <div className="p-6 pb-0 flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                        <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Delete Notebook</h2>
                        <p className="text-sm text-red-400">Destructive Action</p>
                    </div>
                </div>

                <div className="p-6">
                    <p className="text-text-subtle text-sm leading-relaxed">
                        Are you sure you want to permanently delete <span className="text-white font-bold">"{notebookTitle}"</span>?
                        <br /><br />
                        This will remove all vectorized documents, chat history, and context associated with this notebook. This action cannot be undone.
                    </p>
                </div>

                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                    <Button variant="outline" onClick={onClose} disabled={isDeleting} className="!h-10 text-xs border-white/10 hover:bg-white/5 text-text-subtle hover:text-white">Cancel</Button>
                    <Button
                        variant="primary"
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="!h-10 text-xs bg-red-600 border-red-500 hover:bg-red-500 hover:border-red-400 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]"
                    >
                        {isDeleting ? (
                            <>
                                <Loader2 className="w-3 h-3 mr-2 animate-spin" /> Deleting...
                            </>
                        ) : (
                            "Confirm Deletion"
                        )}
                    </Button>
                </div>
            </div>
        </div>
    );
}

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
        <path d="M21.56,11.6C21.34,7.82,17.83,5.71,14.78,5.32V4.07C14.78,2.5,13.61,1.21,12.12,1.21S9.46,2.5,9.46,4.07v1.25C6.4,5.71,2.9,7.82,2.68,11.6c-0.12,2.04,0.64,4.31,2.2,5.82C4.25,18.12,4,19,4,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-0.32-0.06-0.63-0.15-0.92c0.71,0.12,1.44,0.17,2.15,0.17s1.44-0.05,2.15-0.17C14.06,19.37,14,19.68,14,20c0,1.66,1.34,3,3,3s3-1.34,3-3c0-1-0.25-1.88-0.88-2.58C20.92,15.91,21.68,13.64,21.56,11.6z M16,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S16.83,12.5,16,12.5z M8.24,12.5c-0.83,0-1.5-0.67-1.5-1.5s0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5S9.07,12.5,8.24,12.5z M12.12,16c-0.63,0-1.21-0.19-1.68-0.52c0.47-0.26,0.96-0.41,1.68-0.41s1.21,0.16,1.68,0.41C13.33,15.81,12.75,16,12.12,16z" />
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
            <div className="bg-[#0A0A0F] border border-white/10 rounded-3xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden relative animate-scale-in">

                {/* Header */}
                <div className="p-8 border-b border-white/5 flex justify-between items-start bg-white/[0.02]">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">New Context</span>
                        </div>
                        <h2 className="text-2xl font-bold text-white tracking-tight">Create Notebook</h2>
                        <p className="text-sm text-text-subtle mt-1">Initialize a new knowledge base for your RAG pipeline.</p>
                    </div>
                    <button
                        onClick={onClose}
                        disabled={isLoading}
                        className="p-2 rounded-full hover:bg-white/10 text-text-subtle hover:text-white transition-colors disabled:opacity-50"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-8 overflow-y-auto custom-scrollbar">
                    <form onSubmit={handleSubmit} className="space-y-8">

                        {/* General Info */}
                        <div className="space-y-5">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-subtle uppercase tracking-wider flex items-center gap-1">
                                    Notebook Name <span className="text-primary">*</span>
                                </label>
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-primary/20 rounded-xl blur-lg opacity-0 group-focus-within:opacity-100 transition-opacity pointer-events-none"></div>
                                    <input
                                        autoFocus
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="e.g., Q4 Product Strategy"
                                        disabled={isLoading}
                                        className="relative w-full bg-[#121216] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary/50 focus:outline-none transition-all text-sm font-medium placeholder-text-subtle/30 shadow-inner"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-text-subtle uppercase tracking-wider">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Briefly describe the documents and purpose of this notebook..."
                                    disabled={isLoading}
                                    className="w-full bg-[#121216] border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-primary/50 focus:outline-none transition-all h-28 resize-none text-sm leading-relaxed placeholder-text-subtle/30 shadow-inner"
                                />
                            </div>
                        </div>

                        {/* Embedding Model Selection */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 pb-2 border-b border-white/5">
                                <Binary className="w-4 h-4 text-indigo-400" />
                                <label className="text-xs font-bold text-white uppercase tracking-wider">Embedding Model <span className="text-primary">*</span></label>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div
                                    onClick={() => !isLoading && setEmbeddingModel('nomic-embed-text:latest')}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden group
                                        ${embeddingModel === 'nomic-embed-text:latest' ? 'bg-[#0E0E12] border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.15)]' : 'bg-surface border-white/5 hover:border-white/20 hover:bg-surface-highlight'}
                                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${embeddingModel === 'nomic-embed-text:latest' ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400' : 'bg-white/5 border-white/5 text-text-subtle'}`}>
                                        <OllamaLogo className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold mb-1 ${embeddingModel === 'nomic-embed-text:latest' ? 'text-white' : 'text-text-subtle'}`}>Nomic Embed</div>
                                        <div className="text-[10px] text-text-subtle opacity-70 font-mono mb-2">nomic-embed-text:latest</div>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-text-subtle">768 dim</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-text-subtle">Local</span>
                                        </div>
                                    </div>
                                    {embeddingModel === 'nomic-embed-text:latest' && (
                                        <div className="absolute top-3 right-3 text-indigo-500">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>

                                <div
                                    onClick={() => !isLoading && setEmbeddingModel('text-embedding-3-small')}
                                    className={`cursor-pointer p-4 rounded-2xl border-2 transition-all duration-200 flex items-start gap-4 relative overflow-hidden group
                                        ${embeddingModel === 'text-embedding-3-small' ? 'bg-[#0E0E12] border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.15)]' : 'bg-surface border-white/5 hover:border-white/20 hover:bg-surface-highlight'}
                                        ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}
                                    `}
                                >
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 border ${embeddingModel === 'text-embedding-3-small' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-white/5 border-white/5 text-text-subtle'}`}>
                                        <OpenAILogo className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <div className={`text-sm font-bold mb-1 ${embeddingModel === 'text-embedding-3-small' ? 'text-white' : 'text-text-subtle'}`}>OpenAI Small</div>
                                        <div className="text-[10px] text-text-subtle opacity-70 font-mono mb-2">text-embedding-3-small</div>
                                        <div className="flex gap-2">
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-text-subtle">1536 dim</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/5 text-text-subtle">Cloud</span>
                                        </div>
                                    </div>
                                    {embeddingModel === 'text-embedding-3-small' && (
                                        <div className="absolute top-3 right-3 text-emerald-500">
                                            <CheckCircle2 className="w-4 h-4" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10">
                                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-amber-200/70 leading-relaxed">
                                    <strong className="text-amber-200">Important:</strong> The embedding model cannot be changed after creation. It determines how your documents are indexed and retrieved.
                                </p>
                            </div>
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-white/5 bg-white/[0.02] flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={isLoading}
                        className="!h-11 border-white/10 hover:bg-white/5 text-text-subtle hover:text-white rounded-xl"
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="primary"
                        onClick={handleSubmit}
                        disabled={!title || !embeddingModel || isLoading}
                        className={`!h-11 !px-6 rounded-xl shadow-none transition-all ${(!title || !embeddingModel) ? 'opacity-50 cursor-not-allowed' : 'shadow-neon-primary hover:-translate-y-0.5'}`}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Initializing...
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

// --- Main Page Component ---

interface DocumentsPageProps {
    onOpenNotebook?: (id: string, name: string, description: string) => void;
    onRegisterEmbedding?: (id: string, modelId: string) => void;
}

const DocumentsPage: React.FC<DocumentsPageProps> = ({ onOpenNotebook, onRegisterEmbedding }) => {
    const { user } = useUser();

    // Debug user information on mount
    useEffect(() => {
        logger.debug('DocumentsPage user information', {
            userId: user?.id,
            email: user?.primaryEmailAddress?.emailAddress,
            firstName: user?.firstName,
            lastName: user?.lastName,
            role: user?.publicMetadata?.role
        });
    }, [user?.id]);

    const [notebooks, setNotebooks] = useState<Notebook[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Action States
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);

    // Clear All States
    const [isClearing, setIsClearing] = useState(false);
    const [confirmClear, setConfirmClear] = useState(false);

    // Single Delete States
    const [notebookToDelete, setNotebookToDelete] = useState<Notebook | null>(null);
    const [isDeletingSingle, setIsDeletingSingle] = useState(false);

    // Fetch Notebooks on Mount
    useEffect(() => {
        let isMounted = true;

        const fetchNotebooks = async () => {
            setIsLoading(true);
            try {
                const response = await fetch(PULL_NOTEBOOKS_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ orchestrator_id: ORCHESTRATOR_ID, user_id: user?.id })
                });

                if (response.ok) {
                    const text = await response.text();
                    let data = [];
                    try {
                        const parsed = JSON.parse(text);
                        data = Array.isArray(parsed) ? parsed : (parsed.data || [parsed]);
                        if (data.length > 0 && data[0].json) {
                            data = data.map((item: any) => item.json);
                        }
                    } catch (e) {
                        logger.warn("Invalid JSON response from notebook fetch");
                    }

                    if (!isMounted) return;

                    const mappedNotebooks: Notebook[] = data.map((item: any) => {
                        const nId = item.notebook_id ? String(item.notebook_id) : `unknown-${Math.random().toString(36).substr(2, 9)}`;
                        const nTitle = item.notebook_title || 'Untitled Notebook';

                        return {
                            id: nId,
                            title: nTitle,
                            description: item.notebook_description,
                            docCount: item.number_of_documents || 0,
                            status: 'success' as Status,
                            lastUpdated: item.updated_at ? new Date(item.updated_at).toLocaleString(undefined, {
                                month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                            }) : 'Unknown',
                            image: getGradientFromId(nId)
                        };
                    }).filter((n: Notebook) => n.id && !n.id.startsWith('unknown-'));

                    mappedNotebooks.sort((a, b) => {
                        const dateA = new Date(a.lastUpdated).getTime();
                        const dateB = new Date(b.lastUpdated).getTime();
                        if (isNaN(dateA) || isNaN(dateB)) return 0;
                        return dateB - dateA;
                    });

                    setNotebooks(mappedNotebooks);
                } else {
                    logger.error("Failed to fetch notebooks", { status: response.status });
                }
            } catch (error) {
                logger.error("Error fetching notebooks", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        };

        fetchNotebooks();

        return () => { isMounted = false; };
    }, []);

    const handleRequestDelete = (notebook: Notebook, e: React.MouseEvent) => {
        e.stopPropagation();

        // Check if user was created by admin
        if (isCreatedByAdmin(user)) {
            alert("Users created by admins cannot delete notebooks.");
            return;
        }

        // Check if user has permission to delete this notebook
        if (!isAdmin(user) && !hasNotebookPermission(user, notebook.id)) {
            alert("You don't have permission to delete this notebook.");
            return;
        }

        setNotebookToDelete(notebook);
    };

    const handleExecuteDelete = async () => {
        if (!notebookToDelete) return;

        setIsDeletingSingle(true);
        const id = notebookToDelete.id;

        try {
            const payload = {
                notebook_id: id,
                orchestrator_id: ORCHESTRATOR_ID,
                user_id: user?.id
            };

            const response = await fetch(DELETE_NOTEBOOK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error("Failed to delete");
            }

            setNotebooks(prev => prev.filter(n => n.id !== id));
            setNotebookToDelete(null);

        } catch (error) {
            logger.error("Error deleting notebook", error);
            alert("Failed to delete notebook. Please check your connection.");
        } finally {
            setIsDeletingSingle(false);
        }
    };

    const handleClearClick = () => {
        // Check if user was created by admin
        if (isCreatedByAdmin(user)) {
            alert("Users created by admins cannot clear notebooks.");
            return;
        }

        // Only admins or users with at least one notebook permission can clear
        if (!isAdmin(user)) {
            const metadata = user?.publicMetadata || (user as any)?.public_metadata;
            const hasAnyNotebook = metadata?.notebook_permissions &&
                Object.keys(metadata.notebook_permissions).length > 0;

            if (!hasAnyNotebook) {
                alert("You don't have permission to clear notebooks.");
                return;
            }
        }

        if (confirmClear) {
            handleExecuteClear();
        } else {
            setConfirmClear(true);
            setTimeout(() => setConfirmClear(false), 3000);
        }
    };

    const handleExecuteClear = async () => {
        setIsClearing(true);
        setConfirmClear(false);

        try {
            const payload = { orchestrator_id: ORCHESTRATOR_ID, user_id: user?.id };

            const response = await fetch(DELETE_ALL_NOTEBOOKS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server responded with ${response.status}: ${errorText}`);
            }

            setNotebooks([]);
        } catch (error: any) {
            logger.error("Failed to delete all notebooks", error);
            alert(`Failed to delete notebooks: ${error.message}`);
        } finally {
            setIsClearing(false);
        }
    };

    const handleCreate = async (data: { title: string; description: string; embeddingModel: string }) => {
        // Check if user was created by admin
        if (isCreatedByAdmin(user)) {
            alert("Users created by admins cannot create notebooks.");
            setIsCreateModalOpen(false);
            return;
        }

        setIsCreating(true);
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
                updated_at: now,
                user_id: user?.id
            };

            const response = await fetch(CREATE_NOTEBOOK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Server status: ${response.status}`);
            }

            const newNotebook: Notebook = {
                id: newId,
                title: data.title,
                description: data.description,
                docCount: 0,
                status: 'success',
                lastUpdated: 'Just now',
                image: getGradientFromId(newId)
            };

            setNotebooks([newNotebook, ...notebooks]);

            if (onRegisterEmbedding) {
                onRegisterEmbedding(newId, data.embeddingModel);
            }

            setIsCreateModalOpen(false);

        } catch (error) {
            logger.error("Failed to create notebook", error);
            alert("Failed to create notebook. Please ensure the backend is online.");
        } finally {
            setIsCreating(false);
        }
    };

    const filteredNotebooks = notebooks.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.id.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[500px] w-full bg-[#050508]">
                <div className="flex flex-col items-center gap-6 relative">
                    <div className="absolute inset-0 bg-primary/20 blur-3xl rounded-full animate-pulse"></div>
                    <div className="relative z-10 p-4 rounded-2xl bg-surface border border-white/5 shadow-2xl">
                        <Loader2 className="w-10 h-10 text-primary animate-spin" />
                    </div>
                    <p className="text-text-subtle text-sm font-medium tracking-wide animate-pulse">Loading Contexts...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full relative overflow-hidden animate-fade-in">

            {/* WebM Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.15) blur(3px)' }}
            >
                <source src="/Whisk_eznyugozewolrjmj1sm1ctytimzzqtlyutny0sm.webm" type="video/webm" />
            </video>

            {/* Dark Overlay with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/75 to-black/85"></div>

            <CreateModal
                isOpen={isCreateModalOpen}
                onClose={() => !isCreating && setIsCreateModalOpen(false)}
                onCreate={handleCreate}
                isLoading={isCreating}
            />

            <DeleteConfirmModal
                isOpen={!!notebookToDelete}
                onClose={() => !isDeletingSingle && setNotebookToDelete(null)}
                onConfirm={handleExecuteDelete}
                notebookTitle={notebookToDelete?.title || 'Unknown Notebook'}
                isDeleting={isDeletingSingle}
            />

            {/* Header Section */}
            <div className="p-8 md:p-12 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 relative z-10">
                <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-wider text-text-subtle">
                            Orchestrator v2.0
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight font-display">
                        Notebooks
                    </h1>
                    <p className="text-text-subtle text-lg font-light max-w-xl">
                        Isolated RAG contexts for your documents, vector indices, and chat history.
                    </p>
                </div>

                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={handleClearClick}
                        disabled={isClearing || notebooks.length === 0 ||
                            isCreatedByAdmin(user) ||
                            (!isAdmin(user) && !Object.keys((user?.publicMetadata || (user as any)?.public_metadata)?.notebook_permissions || {}).length)}
                        className={`!h-11 !px-5 !text-xs border-white/10 uppercase tracking-wider transition-all duration-300 backdrop-blur-md rounded-xl
                    ${confirmClear
                                ? 'bg-red-500/10 text-red-400 border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]'
                                : 'hover:border-red-500/30 hover:text-red-400 hover:bg-red-500/5 text-text-subtle'
                            }`}
                    >
                        {isClearing ? (
                            <>
                                <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Clearing...
                            </>
                        ) : confirmClear ? (
                            <>
                                <AlertTriangle className="w-3.5 h-3.5 mr-2" /> Confirm?
                            </>
                        ) : (
                            <>
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Clear All
                            </>
                        )}
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => {
                            if (isCreatedByAdmin(user)) {
                                alert("Users created by admins cannot create notebooks.");
                                return;
                            }
                            setIsCreateModalOpen(true);
                        }}
                        className="!h-11 !px-6 shadow-neon-primary uppercase tracking-wider !text-xs cursor-pointer rounded-xl flex items-center gap-2 hover:translate-y-[-2px] transition-transform"
                    >
                        <Plus className="w-4 h-4" /> New Notebook
                    </Button>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-8 md:px-12 pb-8 relative z-10">
                <div className="relative max-w-md group">
                    <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-focus-within:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                    <div className="relative flex items-center bg-[#0E0E12] border border-white/10 rounded-xl px-4 py-3 shadow-lg focus-within:border-primary/50 transition-colors">
                        <Search className="w-4 h-4 text-text-subtle mr-3" />
                        <input
                            type="text"
                            placeholder="Filter notebooks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="flex-1 bg-transparent border-none text-white text-sm focus:outline-none placeholder-text-subtle/50"
                        />
                        {searchQuery && (
                            <button onClick={() => setSearchQuery('')} className="p-1 hover:bg-white/10 rounded-full text-text-subtle hover:text-white">
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-8 md:px-12 pb-12 relative z-10">
                {notebooks.length === 0 ? (
                    <div className="h-96 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-3xl bg-surface/20 text-center animate-fade-in-up">
                        <div className="w-24 h-24 rounded-full bg-surface border border-white/5 flex items-center justify-center mb-6 shadow-2xl relative">
                            <div className="absolute inset-0 bg-primary/10 blur-xl rounded-full animate-pulse-slow"></div>
                            <FolderOpen className="w-10 h-10 text-text-subtle opacity-50 relative z-10" />
                        </div>
                        <h3 className="text-2xl font-bold text-white mb-2">No notebooks found</h3>
                        <p className="text-text-subtle mb-8 max-w-md">Initialize a new context to start ingesting documents and building your knowledge base.</p>
                        <Button variant="primary" onClick={() => setIsCreateModalOpen(true)} className="shadow-neon-primary rounded-xl">Create Notebook</Button>
                    </div>
                ) : filteredNotebooks.length === 0 ? (
                    <div className="h-64 flex flex-col items-center justify-center text-text-subtle border border-dashed border-white/10 rounded-3xl bg-surface/10">
                        <Search className="w-10 h-10 mb-4 opacity-30" />
                        <p>No notebooks match "{searchQuery}"</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filteredNotebooks.map((notebook, idx) => (
                            <div
                                key={notebook.id}
                                onClick={() => onOpenNotebook && onOpenNotebook(notebook.id, notebook.title, notebook.description || '')}
                                className="group relative bg-[#0E0E12] border border-white/5 rounded-2xl overflow-hidden cursor-pointer flex flex-col h-[320px] transition-all duration-300 hover:border-white/10 hover:translate-y-[-4px] hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] animate-fade-in-up"
                                style={{ animationDelay: `${idx * 0.05}s` }}
                            >
                                {/* Gradient Cover */}
                                <div
                                    className="h-32 w-full relative overflow-hidden"
                                    style={{ background: notebook.image }}
                                >
                                    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0E0E12] via-[#0E0E12]/40 to-transparent"></div>

                                    {/* Status Badge */}
                                    <div className="absolute top-4 right-4 z-10">
                                        <StatusBadge status={notebook.status} />
                                    </div>

                                    {/* Floating Icon */}
                                    <div className="absolute -bottom-6 left-6 z-10">
                                        <div className="w-12 h-12 rounded-xl bg-[#0E0E12] border border-white/10 flex items-center justify-center text-white shadow-xl group-hover:scale-110 group-hover:border-primary/40 group-hover:shadow-[0_0_20px_rgba(126,249,255,0.2)] transition-all duration-300">
                                            <Book className="w-6 h-6 group-hover:text-primary transition-colors" />
                                        </div>
                                    </div>
                                </div>

                                {/* Content */}
                                <div className="p-6 pt-8 flex-1 flex flex-col">
                                    <div className="mb-4">
                                        <h3 className="text-lg font-bold text-white mb-1 truncate group-hover:text-primary transition-colors">{notebook.title}</h3>
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-[10px] text-text-subtle font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/5 truncate max-w-[120px]" title={notebook.id}>
                                                {notebook.id}
                                            </span>
                                        </div>
                                        <p className="text-xs text-text-subtle line-clamp-2 leading-relaxed h-8">
                                            {notebook.description || <span className="italic opacity-50">No description provided.</span>}
                                        </p>
                                    </div>

                                    {/* Footer */}
                                    <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between group-hover:border-white/10 transition-colors">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] text-text-subtle uppercase tracking-wider font-bold mb-0.5">Documents</span>
                                            <div className="flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-text-subtle" />
                                                <span className="text-sm font-bold text-white font-mono">{notebook.docCount}</span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {(isAdmin(user) || hasNotebookPermission(user, notebook.id)) && (
                                                <button
                                                    onClick={(e) => handleRequestDelete(notebook, e)}
                                                    title="Delete Notebook"
                                                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-subtle hover:text-white hover:bg-red-500/10 hover:border hover:border-red-500/20 transition-all opacity-0 group-hover:opacity-100"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            )}
                                            <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center text-text-subtle group-hover:text-white group-hover:bg-primary/10 group-hover:border-primary/20 group-hover:text-primary transition-all">
                                                <ArrowRight className="w-4 h-4" />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DocumentsPage;
