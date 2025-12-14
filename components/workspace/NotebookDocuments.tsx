
import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import { createPortal } from 'react-dom';
import {
    FileText, CheckCircle2, Loader2, Clock, AlertCircle,
    Search, Plus, RefreshCw, File as FileIcon,
    LayoutGrid, List as ListIcon, Database, ArrowRight, Trash2, FolderOpen,
    X, Cloud, Server, Upload, CheckSquare, Square, Share2, Settings2, FileUp, ChevronRight,
    ScanText, Sparkles, Zap, Brain, Code, FileType, HardDrive, Info, Scissors, Maximize, Minimize, Layers, Link, Sliders,
    ArrowLeft, Activity, Table, Calendar, Check, Cpu, AlertTriangle, Terminal, ShieldAlert
} from 'lucide-react';
import Button from '../ui/Button';
import type { NotebookConfig } from '../../App';
import { logger } from '../../utils/logger';

// --- CONSTANTS ---
// Webhook for listing folders in SharePoint
const SHAREPOINT_DISCOVERY_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/f7753880-c229-4e49-8539-74558801ef78-share-point';
// Webhook for processing the actual ingestion
const INGESTION_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/b65632eb-86bc-4cf6-8586-5980beaa3282-share-point-files-ingestion';
// Webhook for retrieving notebook status and files
const NOTEBOOK_STATUS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/a34aa1cf-d399-4120-a2b6-4e47ca21805b-notebook-status';
// Webhook for deleting a file
const DELETE_FILE_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-delete-file-from-notebook';
// Webhook for file ingestion details
const INGESTION_SETTINGS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-file-ingestion-settings';
// Webhook for contextual retrieval state (Real-time table)
const CONTEXTUAL_RETRIEVAL_STATE_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-file-contextual-retireval-state';
// Webhook for real-time workflow stage
const WORKFLOW_STAGE_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-get-workflow-stage';
// Webhook for file error details
const ERROR_DETAILS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-files-error-and-details';

const ORCHESTRATOR_ID = '301f7482-1430-466d-9721-396564618751';

// Types
type Status = 'success' | 'processing' | 'pending' | 'error';

interface IngestionConfig {
    method?: string;
    parser?: string;
    chunking?: string;
    chunkSize?: number;
    overlap?: number;
    augmentation?: boolean;
    destination?: string;
}

interface Document {
    id: string; // job_id
    jobId?: string; // job_id (original source id)
    fileId?: string; // file_id
    name: string; // file_name
    type: string;
    status: 'completed' | 'processing' | 'pending' | 'error';
    size: string;
    added: string; // created_at
    updated?: string; // updated_at
    error?: string; // error_description
    retryCount?: number; // retry_count
    ingestionConfig?: IngestionConfig;
}

interface SharePointFile {
    id: string;
    name: string;
    webUrl?: string;
    size?: string;
    lastModified?: string;
    type?: string;
    mimeType?: string;
}

interface LocalFile extends File {
    id?: string;
}

interface ContextualChunk {
    chunk_id: string;
    job_id: string;
    file_id: string;
    file_name: string;
    original_chunk: string;
    enhanced_chunk: string;
    status: string;
    retry_count: number;
    notebook_id: string;
    created_at: string;
    updated_at: string;
}

const StatusBadge = ({ status, error }: { status: Document['status'] | string, error?: string }) => {
    // Use the actual status text if available, fallback to Pending
    const rawStatus = status || 'Pending';
    const s = rawStatus.toLowerCase();

    // Default styling (Unknown/Pending)
    let config = {
        icon: Clock,
        color: 'text-amber-400',
        bg: 'bg-amber-400/10',
        border: 'border-amber-400/20'
    };

    // Determine style based on keywords found in the status string
    if (['completed', 'success', 'finished', 'done', 'active', 'ready'].some(k => s.includes(k))) {
        config = {
            icon: CheckCircle2,
            color: 'text-emerald-400',
            bg: 'bg-emerald-400/10',
            border: 'border-emerald-400/20'
        };
    } else if (['processing', 'running', 'ingesting', 'syncing', 'in_progress', 'generating', 'enriching', 'chunking', 'embedding'].some(k => s.includes(k))) {
        config = {
            icon: Loader2,
            color: 'text-blue-400',
            bg: 'bg-blue-400/10',
            border: 'border-blue-400/20'
        };
    } else if (['error', 'failed', 'failure'].some(k => s.includes(k))) {
        config = {
            icon: AlertCircle,
            color: 'text-red-400',
            bg: 'bg-red-400/10',
            border: 'border-red-400/20'
        };
    }

    const { icon: Icon, color, bg, border } = config;
    const isSpinning = ['processing', 'running', 'ingesting', 'syncing', 'enriching', 'generating', 'chunking', 'embedding', 'in_progress'].some(k => s.includes(k));

    return (
        <div className="group relative">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] uppercase font-bold tracking-wider ${color} ${bg} border ${border} shadow-sm transition-all duration-300`}>
                <Icon className={`w-3 h-3 ${isSpinning ? 'animate-spin' : ''}`} />
                {rawStatus}
            </span>
        </div>
    );
};

// --- HELPER COMPONENTS ---

const SelectionCard = ({
    icon: Icon,
    title,
    description,
    selected,
    onClick,
    disabled,
    badge
}: any) => (
    <div
        onClick={() => !disabled && onClick()}
        className={`relative p-5 rounded-xl border transition-all duration-200 flex flex-col gap-3 text-left h-full
            ${disabled ? 'opacity-50 cursor-not-allowed bg-surface/20 border-white/5' : 'cursor-pointer'}
            ${selected && !disabled
                ? 'bg-primary/5 border-primary shadow-[0_0_15px_rgba(126,249,255,0.1)]'
                : !disabled ? 'bg-surface border-white/10 hover:border-white/20 hover:bg-surface-highlight' : ''}
        `}
    >
        {selected && !disabled && (
            <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary text-black flex items-center justify-center shadow-lg">
                <CheckCircle2 className="w-3 h-3" />
            </div>
        )}

        <div className={`w-10 h-10 rounded-lg flex items-center justify-center border
            ${selected && !disabled ? 'bg-primary/20 border-primary/20 text-primary' : 'bg-white/5 border-white/5 text-text-subtle'}
        `}>
            <Icon className="w-5 h-5" />
        </div>

        <div>
            <h4 className={`text-sm font-bold mb-1.5 ${selected ? 'text-white' : 'text-gray-200'}`}>{title}</h4>
            <p className="text-[11px] text-text-subtle leading-relaxed">{description}</p>
        </div>

        {badge && (
            <div className="mt-auto pt-3">
                <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-white/5 border border-white/5 w-fit">
                    <AlertCircle className="w-3 h-3 text-text-subtle" />
                    <span className="text-[9px] text-text-subtle">{badge}</span>
                </div>
            </div>
        )}
    </div>
);

// --- PIPELINE PROGRESS VISUALIZER ---

const PipelineProgress = ({ stage, status }: { stage: string | null, status: string }) => {
    const displayStage = stage || (status === 'success' ? 'COMPLETED' : status.toUpperCase().replace('_', ' '));
    const isProcessing = ['processing', 'running', 'ingesting', 'syncing', 'enriching', 'generating', 'chunking', 'embedding', 'in_progress'].some(k => status.toLowerCase().includes(k));

    return (
        <div className="w-full bg-[#0A0A0F] border border-white/5 rounded-3xl p-10 relative overflow-hidden mb-8 shadow-2xl animate-fade-in-up group">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent opacity-50 pointer-events-none"></div>
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

            <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center">

                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-text-subtle uppercase tracking-[0.2em]">Pipeline Stage</span>
                </div>

                <h3 className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/50 tracking-tighter drop-shadow-2xl">
                    {displayStage}
                </h3>

                {isProcessing && (
                    <div className="mt-4 flex flex-col items-center gap-3">
                        <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-primary/50 origin-left animate-[shimmer_1.5s_infinite]"></div>
                        </div>
                        <div className="flex items-center gap-2 text-primary text-xs font-mono animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Processing...</span>
                        </div>
                    </div>
                )}

                {status === 'success' && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider animate-scale-in">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Ready for Retrieval</span>
                    </div>
                )}

                {status === 'error' && (
                    <div className="mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold uppercase tracking-wider animate-scale-in">
                        <AlertCircle className="w-4 h-4" />
                        <span>Pipeline Failed</span>
                    </div>
                )}

            </div>
        </div>
    );
};


// --- ERROR DETAILS MODAL ---

interface ErrorDetailsModalProps {
    notebookId: string;
    doc: Document | null;
    onClose: () => void;
}

const ErrorDetailsModal: React.FC<ErrorDetailsModalProps> = ({ notebookId, doc, onClose }) => {
    const { user } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [errorData, setErrorData] = useState<any>(null);

    useEffect(() => {
        if (!doc) return;
        setIsLoading(true);
        setErrorData(null);

        const fetchErrorDetails = async () => {
            try {
                const response = await fetch(ERROR_DETAILS_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook_id: notebookId,
                        file_id: doc.fileId || doc.id,
                        user_id: user?.id
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    let details = Array.isArray(data) ? data[0] : data;
                    if (details.json) details = details.json;

                    // Parse the error_description string
                    if (details.error_description && typeof details.error_description === 'string') {
                        try {
                            const parsedDesc = JSON.parse(details.error_description);
                            details.parsedError = parsedDesc;
                        } catch (e) {
                            // If parsing fails, treat it as a raw string
                            details.parsedError = { message: details.error_description };
                        }
                    } else if (doc.error) {
                        // Fallback to error in doc object if webhook returns nothing useful
                        details.parsedError = { message: doc.error };
                    }

                    setErrorData(details);
                }
            } catch (err) {
                logger.error("Failed to fetch error details", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchErrorDetails();
    }, [doc, notebookId]);

    if (!doc) return null;

    const parsedError = errorData?.parsedError || {};
    const message = parsedError.message || parsedError.errorMessage || "Unknown error occurred.";
    const stackTrace = parsedError.stack;
    const nodeInfo = parsedError.node;

    return createPortal(
        <div className="fixed inset-0 z-[130] bg-[#050508]/90 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4">
            <div className="bg-[#0A0A0F] border border-red-500/30 w-full max-w-3xl rounded-2xl shadow-[0_0_50px_rgba(239,68,68,0.1)] flex flex-col max-h-[90vh] overflow-hidden relative animate-scale-in">

                {/* Header */}
                <div className="p-6 border-b border-white/10 flex items-center justify-between bg-red-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shadow-inner">
                            <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Ingestion Error</h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs font-mono text-text-subtle bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{doc.name}</span>
                                {errorData?.file_type && (
                                    <span className="text-[10px] font-mono text-text-subtle/70">{errorData.file_type}</span>
                                )}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 text-text-subtle hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <Loader2 className="w-8 h-8 text-red-500 animate-spin" />
                            <p className="text-sm text-text-subtle">Fetching diagnostics...</p>
                        </div>
                    ) : (
                        <>
                            {/* Primary Error Message */}
                            <div className="p-5 rounded-xl bg-red-500/10 border border-red-500/20">
                                <h3 className="text-xs font-bold text-red-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    Failure Reason
                                </h3>
                                <p className="text-sm text-white font-medium leading-relaxed">
                                    {message}
                                </p>
                            </div>

                            {/* Node Context */}
                            {nodeInfo && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 rounded-xl bg-surface border border-white/10">
                                        <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1">Failed Node</span>
                                        <div className="text-sm text-white font-mono flex items-center gap-2">
                                            <Activity className="w-4 h-4 text-primary" />
                                            {nodeInfo.name}
                                        </div>
                                    </div>
                                    <div className="p-4 rounded-xl bg-surface border border-white/10">
                                        <span className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1">Node Type</span>
                                        <div className="text-sm text-white font-mono flex items-center gap-2">
                                            <Terminal className="w-4 h-4 text-secondary" />
                                            {nodeInfo.type}
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Stack Trace */}
                            {stackTrace && (
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-xs font-bold text-text-subtle uppercase tracking-wider">
                                        <Terminal className="w-4 h-4" />
                                        System Stack Trace
                                    </div>
                                    <div className="p-4 rounded-xl bg-[#050508] border border-white/10 overflow-x-auto custom-scrollbar">
                                        <pre className="text-[10px] font-mono text-red-200/70 whitespace-pre-wrap leading-relaxed">
                                            {stackTrace}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {/* Raw Dump (Debug) */}
                            {!parsedError.message && (
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">Raw Payload</span>
                                    <div className="p-4 rounded-xl bg-[#050508] border border-white/10 overflow-x-auto custom-scrollbar">
                                        <pre className="text-[10px] font-mono text-text-subtle whitespace-pre-wrap leading-relaxed">
                                            {JSON.stringify(errorData, null, 2)}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/10 bg-surface/50 flex justify-end">
                    <Button variant="outline" onClick={onClose} className="border-white/10">Close</Button>
                </div>
            </div>
        </div>,
        document.body
    );
}


// --- INGESTION DETAILS MODAL ---

interface IngestionDetailsModalProps {
    doc: Document | null;
    notebookId: string;
    onClose: () => void;
}

const IngestionDetailsModal: React.FC<IngestionDetailsModalProps> = ({ doc, notebookId, onClose }) => {
    const { user } = useUser();
    const [fetchedData, setFetchedData] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Real-time Contextual Data
    const [contextualChunks, setContextualChunks] = useState<ContextualChunk[]>([]);
    const [isLoadingChunks, setIsLoadingChunks] = useState(false);

    // Real-time Workflow Stage
    const [workflowStage, setWorkflowStage] = useState<string | null>(null);

    // Initial Fetch of Settings
    useEffect(() => {
        if (!doc) return;
        setFetchedData(null);
        setContextualChunks([]);
        setWorkflowStage(null);
        setIsLoading(true);

        const fetchDetails = async () => {
            try {
                const targetId = doc.fileId || doc.id;
                const response = await fetch(INGESTION_SETTINGS_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook_id: notebookId,
                        file_id: targetId,
                        job_id: doc.jobId || doc.id,
                        user_id: user?.id
                    })
                });

                if (response.ok) {
                    const res = await response.json();
                    let data = Array.isArray(res) ? res[0] : res;
                    if (data.json) data = data.json;

                    if (data.ingestion_settings && typeof data.ingestion_settings === 'string') {
                        try {
                            data.ingestion_settings = JSON.parse(data.ingestion_settings);
                        } catch (e) {
                            logger.warn("Failed to parse ingestion_settings JSON string", e);
                        }
                    }
                    setFetchedData(data);
                }
            } catch (err) {
                logger.error("Failed to fetch ingestion details", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchDetails();
    }, [doc, notebookId]);

    // Poll for Workflow Stage
    useEffect(() => {
        if (!doc) return;

        const fetchWorkflowStage = async () => {
            try {
                const response = await fetch(WORKFLOW_STAGE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        file_id: doc.fileId || doc.id,
                        notebook_id: notebookId,
                        job_id: doc.jobId || doc.id,
                        user_id: user?.id
                    })
                });

                if (response.ok) {
                    const res = await response.json();
                    let data = Array.isArray(res) ? res[0] : res;
                    // Handle n8n wrapping
                    if (data.json) data = data.json;

                    const stage = data.stage || data.workflow_stage || data.current_stage || data.status;
                    if (stage) setWorkflowStage(String(stage));
                }
            } catch (e) {
                logger.error("Failed to fetch workflow stage", e);
            }
        };

        fetchWorkflowStage();
        const interval = setInterval(fetchWorkflowStage, 2000); // 2s Polling
        return () => clearInterval(interval);

    }, [doc, notebookId]);

    // Derived values
    const settings = fetchedData?.ingestion_settings || {};
    const displayData = {
        name: fetchedData?.file_name || doc?.name,
        fileId: fetchedData?.file_id || doc?.fileId || 'N/A',
        jobId: fetchedData?.job_id || doc?.jobId || 'N/A',
        status: fetchedData?.status || doc?.status,
        type: fetchedData?.file_type || doc?.type,
        path: fetchedData?.file_path,
        url: fetchedData?.file_url,
        createdAt: fetchedData?.created_at ? new Date(fetchedData.created_at).toLocaleString() : doc?.added,
        method: settings.ingestion_method || doc?.ingestionConfig?.method || 'Standard',
        parser: settings.config_parse_mode || doc?.ingestionConfig?.parser || 'Standard',
        chunking: settings.config_chunk_mode || doc?.ingestionConfig?.chunking || 'Recursive',
        destination: settings.config_destination || doc?.ingestionConfig?.destination || 'Vector DB',
        chunkSize: settings.recursiv_chunk_size || doc?.ingestionConfig?.chunkSize,
        overlap: settings.recursiv_chunk_overlap || doc?.ingestionConfig?.overlap,
        augmentation: settings.contextual_retrieval ?? doc?.ingestionConfig?.augmentation,
        batchSize: settings.batch_processing_size || 'N/A',
        contextBatchSize: settings.contextual_batch_processing_size || 'N/A',
        agenticInstructions: settings.agentic_instructions
    };

    const isAugmentationEnabled = displayData.augmentation === true || displayData.augmentation === 'Enabled' || displayData.augmentation === 'true';

    // Poll for Contextual Chunks if Augmentation is Enabled
    useEffect(() => {
        if (!doc || !isAugmentationEnabled || !displayData.fileId) return;

        // Don't show global loader for polling, only initial
        if (contextualChunks.length === 0) setIsLoadingChunks(true);

        const fetchChunks = async () => {
            try {
                // Explicitly use doc properties as fallback to ensure valid IDs are sent
                // instead of relying solely on displayData which might be 'N/A' initially
                const targetFileId = displayData.fileId !== 'N/A' ? displayData.fileId : (doc.fileId || doc.id);
                const targetJobId = doc.jobId || doc.id;

                const response = await fetch(CONTEXTUAL_RETRIEVAL_STATE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        notebook_id: notebookId,
                        file_id: targetFileId,
                        job_id: targetJobId,
                        user_id: user?.id
                    })
                });

                if (response.ok) {
                    const res = await response.json();
                    let data = Array.isArray(res) ? res : (res.data || []);
                    // Handle n8n wrapping
                    data = data.map((item: any) => item.json || item);
                    setContextualChunks(data);
                }
            } catch (e) {
                logger.error("Failed to fetch contextual chunks", e);
            } finally {
                setIsLoadingChunks(false);
            }
        };

        fetchChunks();
        const interval = setInterval(fetchChunks, 3000); // 3s Polling
        return () => clearInterval(interval);

    }, [isAugmentationEnabled, notebookId, displayData.fileId, doc]);


    if (!doc) return null;

    const DetailRow = ({ label, value, icon: Icon, fullWidth = false }: any) => (
        <div className={`flex items-center justify-between p-4 rounded-xl bg-[#0A0A0F] border border-white/5 hover:border-white/10 transition-colors group ${fullWidth ? 'col-span-full' : ''}`}>
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-white/5 text-text-subtle group-hover:text-white transition-colors">
                    <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">{label}</span>
            </div>
            {isLoading && !fetchedData ? (
                <div className="h-4 w-12 bg-white/5 rounded animate-pulse"></div>
            ) : (
                <span className="text-xs font-bold text-white font-mono text-right max-w-[200px] truncate" title={String(value)}>
                    {value === true ? 'Enabled' : value === false ? 'Disabled' : (value || 'N/A')}
                </span>
            )}
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[120] bg-[#050508] animate-fade-in flex flex-col">

            {/* Top Navigation Bar */}
            <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-[#050508]/80 backdrop-blur-md shrink-0">
                <div className="flex items-center gap-4">
                    <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-text-subtle hover:text-white transition-colors">
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div className="h-8 w-px bg-white/10"></div>
                    <div>
                        <h2 className="text-lg font-bold text-white leading-none">{displayData.name}</h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] font-mono text-text-subtle">FILE ID: {displayData.fileId}</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    {displayData.url && (
                        <a href={displayData.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 hover:bg-white/5 text-xs text-text-subtle hover:text-white transition-colors">
                            <Link className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Open Source</span>
                        </a>
                    )}
                </div>
            </div>

            {/* Main Scrollable Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 md:p-10">
                <div className="max-w-7xl mx-auto space-y-8">

                    {/* Pipeline Progress */}
                    <PipelineProgress stage={workflowStage} status={displayData.status} />

                    {/* Section 1: Metadata & Configuration */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                        {/* Column 1: Config */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[#0A0A0F] border border-white/5 rounded-3xl p-8">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                        <Sliders className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">Pipeline Configuration</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    <DetailRow label="Ingestion Method" value={displayData.method} icon={Share2} />
                                    <DetailRow label="Target Destination" value={displayData.destination} icon={Database} />
                                    <DetailRow label="Parser Engine" value={displayData.parser} icon={ScanText} />
                                    <DetailRow label="Augmentation" value={displayData.augmentation} icon={Sparkles} />
                                    <DetailRow label="Batch Size" value={displayData.batchSize} icon={Sliders} />
                                    <DetailRow label="Ctx. Batch Size" value={displayData.contextBatchSize} icon={Sliders} />
                                    <DetailRow label="Chunking Strategy" value={displayData.chunking} icon={Layers} fullWidth />
                                    <DetailRow label="Recursive Chunk Size" value={displayData.chunkSize} icon={Maximize} />
                                    <DetailRow label="Recursive Overlap" value={displayData.overlap} icon={Minimize} />
                                </div>
                            </div>

                            {/* Agentic Instructions */}
                            {displayData.agenticInstructions && (
                                <div className="bg-[#0A0A0F] border border-white/5 rounded-3xl p-8">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-2 rounded-lg bg-secondary/10 text-secondary">
                                            <Brain className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wider">Agentic Instructions</h3>
                                    </div>
                                    <div className="p-5 rounded-2xl bg-black/40 border border-white/5 text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap max-h-60 overflow-y-auto custom-scrollbar shadow-inner">
                                        {displayData.agenticInstructions}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Column 2: Metadata */}
                        <div className="space-y-6">
                            <div className="bg-[#0A0A0F] border border-white/5 rounded-3xl p-8 sticky top-6">
                                <div className="flex items-center gap-3 mb-6">
                                    <div className="p-2 rounded-lg bg-tertiary/10 text-tertiary">
                                        <Info className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">System Metadata</h3>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1">Job ID</label>
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-white break-all shadow-inner">
                                            {displayData.jobId}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1">File ID</label>
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-white break-all shadow-inner">
                                            {displayData.fileId}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider block mb-1">Created At</label>
                                        <div className="p-3 rounded-xl bg-black/40 border border-white/5 text-xs font-mono text-white flex items-center gap-2 shadow-inner">
                                            <Calendar className="w-3.5 h-3.5 text-text-subtle" />
                                            {displayData.createdAt}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Real-time Augmentation Table */}
                    {isAugmentationEnabled && (
                        <div className="animate-fade-in-up">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                                        <Activity className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Contextual Retrieval State</h3>
                                        <p className="text-xs text-text-subtle">Real-time processing status of enhanced chunks.</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isLoadingChunks && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                                    <span className="text-[10px] font-mono text-text-subtle bg-white/5 px-2 py-1 rounded">
                                        {contextualChunks.length} Records
                                    </span>
                                </div>
                            </div>

                            <div className="border border-white/10 rounded-2xl overflow-hidden bg-[#0A0A0F] shadow-2xl">
                                <div className="overflow-x-auto custom-scrollbar">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-white/5 border-b border-white/5">
                                                <th className="py-3 px-4 text-[10px] font-bold text-text-subtle uppercase tracking-wider whitespace-nowrap">Status</th>
                                                <th className="py-3 px-4 text-[10px] font-bold text-text-subtle uppercase tracking-wider whitespace-nowrap">Chunk ID</th>
                                                <th className="py-3 px-4 text-[10px] font-bold text-text-subtle uppercase tracking-wider whitespace-nowrap w-1/3">Original Chunk</th>
                                                <th className="py-3 px-4 text-[10px] font-bold text-text-subtle uppercase tracking-wider whitespace-nowrap w-1/3">Enhanced Chunk</th>
                                                <th className="py-3 px-4 text-[10px] font-bold text-text-subtle uppercase tracking-wider whitespace-nowrap text-center">Retries</th>
                                                <th className="py-3 px-4 text-[10px] font-bold text-text-subtle uppercase tracking-wider whitespace-nowrap text-right">Updated</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-white/5">
                                            {contextualChunks.length === 0 ? (
                                                <tr>
                                                    <td colSpan={6} className="py-12 text-center text-text-subtle text-xs">
                                                        {isLoadingChunks ? 'Loading records...' : 'No contextual chunks found yet.'}
                                                    </td>
                                                </tr>
                                            ) : (
                                                contextualChunks.map((row, idx) => (
                                                    <tr key={idx} className="group hover:bg-white/[0.02] transition-colors">
                                                        <td className="py-3 px-4 whitespace-nowrap">
                                                            <StatusBadge status={row.status} />
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="font-mono text-[10px] text-text-subtle truncate max-w-[120px]" title={row.chunk_id}>
                                                                {row.chunk_id}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-xs text-text-subtle/80 line-clamp-2 min-w-[200px] font-mono" title={row.original_chunk}>
                                                                {row.original_chunk || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4">
                                                            <div className="text-xs text-primary/80 line-clamp-2 min-w-[200px] font-mono" title={row.enhanced_chunk}>
                                                                {row.enhanced_chunk || '-'}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-4 text-center">
                                                            <span className={`text-xs font-bold ${row.retry_count > 0 ? 'text-amber-400' : 'text-text-subtle/50'}`}>
                                                                {row.retry_count}
                                                            </span>
                                                        </td>
                                                        <td className="py-3 px-4 text-right whitespace-nowrap">
                                                            <div className="text-[10px] text-text-subtle font-mono">
                                                                {new Date(row.updated_at || row.created_at).toLocaleTimeString()}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>,
        document.body
    );
}

// --- INGESTION MODAL ---
// ... (rest of the file remains the same)

interface IngestionModalProps {
    isOpen: boolean;
    onClose: () => void;
    notebookId: string;
    notebookName: string;
    notebookDescription?: string;
    config: NotebookConfig;
    onIngestionStarted: () => void;
}

const IngestionModal: React.FC<IngestionModalProps> = ({
    isOpen,
    onClose,
    notebookId,
    notebookName,
    notebookDescription,
    config,
    onIngestionStarted
}) => {
    // Steps: source -> discovery (SharePoint) / local_select (Local) -> settings -> processing
    const [step, setStep] = useState<'source' | 'discovery' | 'local_select' | 'settings'>('source');
    const [sourceType, setSourceType] = useState<'sharepoint' | 'local' | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Data State
    const [discoveredFiles, setDiscoveredFiles] = useState<SharePointFile[]>([]);
    const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());
    const [localFiles, setLocalFiles] = useState<LocalFile[]>([]);

    // Configuration State
    const [parsingMethod, setParsingMethod] = useState('text'); // Default to Basic Extractor
    const [chunkingMethod, setChunkingMethod] = useState('recursive');
    const [chunkSize, setChunkSize] = useState(600); // Default to 600
    const [overlap, setOverlap] = useState(200); // Default to 200
    const [augmentation, setAugmentation] = useState('standard');
    const [destination, setDestination] = useState('postgres');

    // Performance State
    const [batchSize, setBatchSize] = useState(50);
    const [contextBatchSize, setContextBatchSize] = useState(10);

    // Reset state on open
    useEffect(() => {
        if (isOpen) {
            setStep('source');
            setSourceType(null);
            setIsLoading(false);
            setDiscoveredFiles([]);
            setSelectedFileIds(new Set());
            setLocalFiles([]);
            setParsingMethod('text');
            setChunkingMethod('recursive');
            setChunkSize(600); // Default to 600
            setOverlap(200); // Default to 200
            setAugmentation('standard');
            setDestination('postgres');
            setBatchSize(50);
            setContextBatchSize(10);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleDiscoverSharePoint = async () => {
        setSourceType('sharepoint');
        setStep('discovery');
        setIsLoading(true);
        try {
            const response = await fetch(SHAREPOINT_DISCOVERY_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId, orchestrator_id: ORCHESTRATOR_ID })
            });

            if (response.ok) {
                const data = await response.json();
                let files: SharePointFile[] = [];
                const raw = Array.isArray(data) ? data : (data.files || data.data || []);

                files = raw.map((item: any) => {
                    const f = item.json || item;
                    return {
                        id: f.id || f.uuid || Math.random().toString(36),
                        name: f.name || f.title || 'Untitled',
                        webUrl: f.webUrl || f.url,
                        size: f.size ? `${Math.round(f.size / 1024)} KB` : 'Unknown',
                        type: f.folder ? 'folder' : 'file'
                    };
                });

                setDiscoveredFiles(files);
            } else {
                logger.error("Discovery failed");
                alert("Failed to discover files. Please check the backend connection.");
            }
        } catch (e) {
            logger.error("Discovery error", e);
            alert("Error connecting to SharePoint service.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleLocalSelect = () => {
        setSourceType('local');
        setStep('local_select');
    };

    const handleLocalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            const newFiles = Array.from(e.target.files).map(f => {
                (f as LocalFile).id = Math.random().toString(36).substr(2, 9);
                return f;
            });
            setLocalFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeLocalFile = (index: number) => {
        setLocalFiles(prev => prev.filter((_, i) => i !== index));
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedFileIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedFileIds(newSet);
    };

    const proceedToSettings = () => {
        if (sourceType === 'sharepoint' && selectedFileIds.size === 0) return;
        if (sourceType === 'local' && localFiles.length === 0) return;
        setStep('settings');
    };

    const handleIngest = async () => {
        setIsLoading(true);

        try {
            const ingestionMethodMap: Record<string, string> = {
                'sharepoint': 'SharePoint',
                'local': 'Local Upload'
            };
            const parserModeMap: Record<string, string> = {
                'text': 'Basic Extractor',
                'layout': 'LlamaParse',
                'ocr': 'Mistral OCR',
                'gemini_ocr': 'Gemini OCR',
                'docling': 'Docling Parser'
            };
            const chunkingModeMap: Record<string, string> = {
                'recursive': 'Recursive Text Splitter',
                'agentic': 'Agentic Chunking',
                'docling': 'Docling Chunker'
            };
            const destinationMap: Record<string, string> = {
                'postgres': 'PostgreSQL (pgvector)',
                'qdrant': 'Qdrant Vector DB',
                'pinecone': 'Pinecone'
            };

            const agenticInstructions = `<role>You are a document segmentation expert. Your task is to identify the optimal transition point where one topic ends and another begins.</role>

<objective>Find a natural breakpoint that keeps semantically related content together. Split only where topics genuinely transition—not arbitrarily.</objective>

<constraint>The split MUST occur BEFORE character position \${maxChunkSize}.</constraint>

<indicators>Evaluate these signals (from strongest to weakest):
1. Section headings or explicit topic markers
2. Paragraph boundaries with clear shifts in subject
3. Completed arguments before new ideas begin
4. Thematic transitions between distinct concepts
</indicators>

<rules>
- Preserve semantic coherence—never split mid-thought
- Choose the LAST strong transition point within the limit
- Prioritize meaning over proximity to the character limit
</rules>

<output_format>
Return ONLY the final word appearing immediately before your chosen split.
No explanations, no punctuation—just the single word.

Example:
If the text ends with: "The company was founded in 2022."
Output: 2022
</output_format>`;

            // Flat Payload Structure as requested
            let payload: any = {
                notebook_id: notebookId,
                notebook_name: notebookName,
                notebook_description: notebookDescription || '',
                embedding_model: config.embeddingModel || 'text-embedding-3-small',
                inference_provider: config.inference.provider,
                inference_model: config.inference.model,
                inference_temperature: config.inference.temperature,

                ingestion_method: ingestionMethodMap[sourceType || 'local'] || sourceType,

                config_parser_mode: parserModeMap[parsingMethod] || parsingMethod,
                config_chunking_mode: chunkingModeMap[chunkingMethod] || chunkingMethod,
                config_destination: destinationMap[destination] || destination,
                config_enable_context_augmentation: augmentation === 'enrichment',

                recursive_chunk_size: chunkSize,
                recursive_chunk_overlap: overlap,
                recursive_separators: ["\n\n", "\n", ". ", " ", ""],

                agentic_model: config.inference.model,
                agentic_instructions: agenticInstructions,
                agentic_min_size: 300,
                agentic_max_size: 800,

                batch_processing_size: batchSize,
                contextual_batch_processing_size: contextBatchSize,

                timestamp: new Date().toISOString(),
                action: sourceType === 'sharepoint' ? "process_sharepoint_folder" : "ingest",
                orchestrator_id: ORCHESTRATOR_ID,
                files: [] as any[]
            };

            if (sourceType === 'sharepoint') {
                const selectedFiles = discoveredFiles.filter(f => selectedFileIds.has(f.id));
                payload.files = selectedFiles;

                // Add first selected item as root params to match specific user request pattern
                if (selectedFiles.length > 0) {
                    payload.sharepoint_folder_id = selectedFiles[0].id;
                    payload.sharepoint_folder_name = selectedFiles[0].name;
                }
            } else {
                const filePromises = localFiles.map(file => {
                    return new Promise<any>((resolve, reject) => {
                        const reader = new FileReader();
                        reader.readAsDataURL(file);
                        reader.onload = () => resolve({
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            content: reader.result // Base64
                        });
                        reader.onerror = error => reject(error);
                    });
                });

                const filesWithContent = await Promise.all(filePromises);
                payload.files = filesWithContent;
            }

            const response = await fetch(INGESTION_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Immediately return to docs page and refresh
                onClose();
                onIngestionStarted();
            } else {
                alert("Ingestion trigger failed.");
            }
        } catch (e) {
            logger.error("Ingestion error", e);
            alert("Error starting ingestion.");
        } finally {
            setIsLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[100] bg-[#050508] animate-fade-in flex flex-col">

            {/* Header */}
            <div className="h-20 border-b border-white/5 flex justify-between items-center px-8 bg-surface/50 backdrop-blur-xl shrink-0">
                <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        {step === 'settings' ? 'Configure Ingestion' : 'Add New File'}
                        {step === 'settings' && (
                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded border border-primary/20 uppercase tracking-wider font-bold">Step 3/3</span>
                        )}
                        {(step === 'discovery' || step === 'local_select') && (
                            <span className="text-xs bg-white/10 text-text-subtle px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider font-bold">Step 2/3</span>
                        )}
                        {step === 'source' && (
                            <span className="text-xs bg-white/10 text-text-subtle px-2 py-0.5 rounded border border-white/10 uppercase tracking-wider font-bold">Step 1/3</span>
                        )}
                    </h2>
                    <p className="text-sm text-text-subtle">
                        {step === 'settings' ? 'Tune parsing and chunking parameters.' : 'Import documents into your notebook context.'}
                    </p>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-white/5 text-text-subtle hover:text-white transition-colors border border-transparent hover:border-white/10">
                    <X className="w-5 h-5" />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                {/* Background decoration */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full mix-blend-screen"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] bg-secondary/5 blur-[100px] rounded-full mix-blend-screen"></div>
                </div>

                <div className={`max-w-7xl mx-auto p-8 md:p-12 min-h-full flex flex-col relative z-10 ${step === 'settings' ? '' : 'justify-center'}`}>

                    {/* STEP 1: SOURCE SELECTION */}
                    {step === 'source' && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-4xl mx-auto w-full">
                            <button
                                onClick={handleDiscoverSharePoint}
                                className="group p-10 rounded-3xl border border-white/10 bg-surface/50 backdrop-blur-sm hover:bg-surface-highlight hover:border-primary/50 transition-all flex flex-col items-center text-center gap-6 relative overflow-hidden shadow-2xl hover:shadow-[0_0_40px_-10px_rgba(126,249,255,0.2)]"
                            >
                                <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-20 h-20 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform relative z-10 border border-blue-500/20">
                                    <Share2 className="w-10 h-10" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">SharePoint</h3>
                                    <p className="text-sm text-text-subtle max-w-xs mx-auto">Connect to your organization's document libraries and sync folders directly.</p>
                                </div>
                            </button>

                            <button
                                onClick={handleLocalSelect}
                                className="group p-10 rounded-3xl border border-white/10 bg-surface/50 backdrop-blur-sm hover:bg-surface-highlight hover:border-secondary/50 transition-all flex flex-col items-center text-center gap-6 relative overflow-hidden shadow-2xl hover:shadow-[0_0_40px_-10px_rgba(224,59,138,0.2)]"
                            >
                                <div className="absolute inset-0 bg-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                <div className="w-20 h-20 rounded-full bg-secondary/10 flex items-center justify-center text-secondary group-hover:scale-110 transition-transform relative z-10 border border-secondary/20">
                                    <Upload className="w-10 h-10" />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="text-2xl font-bold text-white mb-2">Local Upload</h3>
                                    <p className="text-sm text-text-subtle max-w-xs mx-auto">Upload PDF, DOCX, TXT files securely from your computer.</p>
                                </div>
                            </button>
                        </div>
                    )}

                    {/* STEP 2A: SHAREPOINT DISCOVERY */}
                    {step === 'discovery' && (
                        <div className="space-y-6 max-w-4xl mx-auto w-full">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-96 gap-6">
                                    <div className="relative">
                                        <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse"></div>
                                        <Loader2 className="w-16 h-16 text-primary animate-spin relative z-10" />
                                    </div>
                                    <p className="text-lg font-medium text-white animate-pulse">Scanning SharePoint Library...</p>
                                </div>
                            ) : discoveredFiles.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-96 gap-6 text-center border border-dashed border-white/10 rounded-3xl bg-surface/20">
                                    <FolderOpen className="w-16 h-16 text-text-subtle opacity-50" />
                                    <div>
                                        <p className="text-lg font-bold text-white mb-2">No compatible files found</p>
                                        <p className="text-sm text-text-subtle">Please check your connection or permissions.</p>
                                    </div>
                                    <Button variant="outline" onClick={() => setStep('source')} className="border-white/10">Back to Sources</Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-surface/50 p-4 rounded-xl border border-white/5 backdrop-blur-sm">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                                                <Cloud className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <span className="block text-sm font-bold text-white">SharePoint Library</span>
                                                <span className="text-xs text-text-subtle">Select files to ingest</span>
                                            </div>
                                        </div>
                                        <div className="px-3 py-1 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-mono font-bold">
                                            {selectedFileIds.size} Selected
                                        </div>
                                    </div>
                                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-surface/30 max-h-[500px] overflow-y-auto custom-scrollbar">
                                        {discoveredFiles.map(file => {
                                            const isSelected = selectedFileIds.has(file.id);
                                            return (
                                                <div
                                                    key={file.id}
                                                    onClick={() => toggleSelection(file.id)}
                                                    className={`flex items-center gap-4 p-4 border-b border-white/5 last:border-0 cursor-pointer transition-colors ${isSelected ? 'bg-primary/5 hover:bg-primary/10' : 'hover:bg-white/5'}`}
                                                >
                                                    <div className={`shrink-0 transition-colors ${isSelected ? 'text-primary' : 'text-text-subtle'}`}>
                                                        {isSelected ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                                                    </div>
                                                    <div className="w-10 h-10 rounded-lg bg-surface border border-white/5 flex items-center justify-center text-text-subtle shrink-0">
                                                        {file.type === 'folder' ? <FolderOpen className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <div className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-text-subtle'}`}>{file.name}</div>
                                                        <div className="text-xs text-text-subtle/50">{file.size}</div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 2B: LOCAL SELECTION */}
                    {step === 'local_select' && (
                        <div className="space-y-8 max-w-4xl mx-auto w-full">
                            <div className="border-2 border-dashed border-white/10 rounded-3xl bg-surface/20 p-12 flex flex-col items-center justify-center text-center hover:border-primary/30 hover:bg-surface/30 transition-all group cursor-pointer relative h-64">
                                <input
                                    type="file"
                                    multiple
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleLocalFileChange}
                                />
                                <div className="w-20 h-20 rounded-full bg-surface border border-white/10 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-xl">
                                    <FileUp className="w-8 h-8 text-secondary" />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Drag & Drop or Click to Upload</h3>
                                <p className="text-sm text-text-subtle max-w-sm">Support for PDF, DOCX, TXT, MD, CSV. Max 50MB per file.</p>
                            </div>

                            {localFiles.length > 0 && (
                                <div className="space-y-4 animate-fade-in-up">
                                    <div className="flex justify-between items-center px-2">
                                        <span className="text-sm font-bold text-text-subtle uppercase tracking-wider">Ready to Upload</span>
                                        <span className="text-xs font-bold bg-secondary/10 text-secondary px-2 py-1 rounded border border-secondary/20">{localFiles.length} Files</span>
                                    </div>
                                    <div className="border border-white/10 rounded-2xl overflow-hidden bg-surface/30">
                                        {localFiles.map((file, idx) => (
                                            <div key={idx} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-lg bg-surface border border-white/5 flex items-center justify-center text-text-subtle">
                                                        <FileText className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <div className="text-sm font-medium text-white">{file.name}</div>
                                                        <div className="text-xs text-text-subtle/50">{(file.size / 1024).toFixed(1)} KB</div>
                                                    </div>
                                                </div>
                                                <button onClick={() => removeLocalFile(idx)} className="p-2 rounded-lg hover:bg-white/10 text-text-subtle hover:text-red-400 transition-colors">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* STEP 3: SETTINGS CONFIGURATION */}
                    {step === 'settings' && (
                        <div className="space-y-12 animate-fade-in-up w-full">

                            {/* Source Summary Card */}
                            <div className="bg-surface/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex items-center justify-between shadow-lg">
                                <div className="flex items-center gap-6">
                                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-surface to-black border border-white/10 flex items-center justify-center shadow-inner">
                                        {sourceType === 'sharepoint' ? <Share2 className="w-7 h-7 text-blue-400" /> : <Upload className="w-7 h-7 text-secondary" />}
                                    </div>
                                    <div>
                                        <h4 className="text-lg font-bold text-white">
                                            {sourceType === 'sharepoint' ? 'SharePoint Ingestion' : 'Local File Upload'}
                                        </h4>
                                        <p className="text-sm text-text-subtle mt-1">
                                            {sourceType === 'sharepoint'
                                                ? `${selectedFileIds.size} files ready for processing`
                                                : `${localFiles.length} files ready for upload`
                                            }
                                        </p>
                                    </div>
                                </div>
                                <Button
                                    variant="outline"
                                    onClick={() => setStep(sourceType === 'sharepoint' ? 'discovery' : 'local_select')}
                                    className="!h-10 !px-5 text-xs border-white/10 hover:bg-white/5 backdrop-blur-md"
                                >
                                    Change Files
                                </Button>
                            </div>

                            {/* Parsing Strategy */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-surface border border-white/10 shadow-sm">
                                        <ScanText className="w-5 h-5 text-primary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Parsing Strategy</h3>
                                        <p className="text-xs text-text-subtle">Choose how to extract text from your documents.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SelectionCard
                                        icon={FileText}
                                        title="Basic Extractor"
                                        description="Simple text/HTML extraction using standard n8n nodes. Best for simple files."
                                        selected={parsingMethod === 'text'}
                                        onClick={() => setParsingMethod('text')}
                                    />
                                    <SelectionCard
                                        icon={Settings2}
                                        title="LlamaParse"
                                        description="Advanced parsing for complex PDFs with tables and figures."
                                        selected={parsingMethod === 'layout'}
                                        onClick={() => setParsingMethod('layout')}
                                    />
                                    <SelectionCard
                                        icon={ScanText}
                                        title="Mistral OCR"
                                        description="High-fidelity optical character recognition for scanned documents."
                                        selected={parsingMethod === 'ocr'}
                                        onClick={() => setParsingMethod('ocr')}
                                    />
                                    <SelectionCard
                                        icon={Sparkles}
                                        title="Gemini OCR"
                                        description="Multimodal parsing using Google Gemini Vision capabilities."
                                        selected={parsingMethod === 'gemini_ocr'}
                                        onClick={() => setParsingMethod('gemini_ocr')}
                                        disabled={true}
                                        badge="No longer available."
                                    />
                                    <SelectionCard
                                        icon={FileType}
                                        title="Docling Parser"
                                        description="Specialized layout analysis and structure extraction."
                                        selected={parsingMethod === 'docling'}
                                        onClick={() => setParsingMethod('docling')}
                                    />
                                </div>
                            </section>

                            {/* Chunking Strategy */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-surface border border-white/10 shadow-sm">
                                        <Code className="w-5 h-5 text-secondary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Chunking Strategy</h3>
                                        <p className="text-xs text-text-subtle">Define how documents are split into vectors.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SelectionCard
                                        icon={Code}
                                        title="Recursive Text Splitter"
                                        description="Standard splitting using separators and overlap."
                                        selected={chunkingMethod === 'recursive'}
                                        onClick={() => setChunkingMethod('recursive')}
                                    />
                                    <SelectionCard
                                        icon={Brain}
                                        title="Agentic Chunking"
                                        description="Semantic splitting based on content meaning and context boundaries."
                                        selected={chunkingMethod === 'agentic'}
                                        onClick={() => setChunkingMethod('agentic')}
                                    />
                                    <SelectionCard
                                        icon={FileType}
                                        title="Docling Chunker"
                                        description="Hierarchical chunking preserving document structure."
                                        selected={chunkingMethod === 'docling'}
                                        onClick={() => setChunkingMethod('docling')}
                                        disabled={true}
                                        badge="Resource heavy. Requires GPU upgrade. Coming soon."
                                    />
                                </div>

                                {/* Parameters */}
                                {chunkingMethod === 'recursive' && (
                                    <div className="mt-6 p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl animate-fade-in-up">
                                        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-white/5">
                                            <ChevronRight className="w-4 h-4 text-text-subtle" />
                                            <span className="text-xs font-bold text-text-subtle uppercase tracking-wider">Recursive Splitter Parameters</span>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-white">Chunk Size</label>
                                                    <span className="text-xs font-mono text-primary bg-primary/10 px-3 py-1 rounded border border-primary/20">{chunkSize}</span>
                                                </div>
                                                <input
                                                    type="range" min="100" max="4000" step="100"
                                                    value={chunkSize} onChange={(e) => setChunkSize(Number(e.target.value))}
                                                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                                />
                                                <p className="text-xs text-text-subtle leading-relaxed">Target characters per chunk. Smaller chunks improve retrieval precision but may lose context.</p>
                                            </div>
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-center">
                                                    <label className="text-sm font-bold text-white">Chunk Overlap</label>
                                                    <span className="text-xs font-mono text-secondary bg-secondary/10 px-3 py-1 rounded border border-secondary/20">{overlap}</span>
                                                </div>
                                                <input
                                                    type="range" min="0" max="1000" step="50"
                                                    value={overlap} onChange={(e) => setOverlap(Number(e.target.value))}
                                                    className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                                />
                                                <p className="text-xs text-text-subtle leading-relaxed">Characters overlapping between adjacent chunks (rec. 10-20%) to maintain continuity.</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* Context Augmentation */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-surface border border-white/10 shadow-sm">
                                        <Sparkles className="w-5 h-5 text-tertiary" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Context Augmentation</h3>
                                        <p className="text-xs text-text-subtle">Enhance vectors with generated metadata.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SelectionCard
                                        icon={Zap}
                                        title="Standard Indexing"
                                        description="Fast, direct indexing of chunks. Ideal for well-structured documents."
                                        selected={augmentation === 'standard'}
                                        onClick={() => setAugmentation('standard')}
                                    />
                                    <SelectionCard
                                        icon={Brain}
                                        title="AI Context Enrichment"
                                        description="Uses LLMs to generate hypothetical questions and summaries for every chunk, fixing 'lost context' in split documents."
                                        selected={augmentation === 'enrichment'}
                                        onClick={() => setAugmentation('enrichment')}
                                    />
                                </div>
                            </section>

                            {/* Performance Settings */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-surface border border-white/10 shadow-sm">
                                        <Sliders className="w-5 h-5 text-purple-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Performance Settings</h3>
                                        <p className="text-xs text-text-subtle">Control ingestion speed and concurrency.</p>
                                    </div>
                                </div>
                                <div className="p-8 bg-surface/30 backdrop-blur-md border border-white/5 rounded-2xl grid grid-cols-1 md:grid-cols-2 gap-10">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-white">Ingestion Batch Size</label>
                                            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded border border-purple-500/20">{batchSize}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="100" step="1"
                                            value={batchSize} onChange={(e) => setBatchSize(Number(e.target.value))}
                                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                        />
                                        <p className="text-xs text-text-subtle">Concurrent files processed during ingestion.</p>
                                    </div>
                                    <div className={`space-y-4 transition-opacity ${augmentation !== 'enrichment' ? 'opacity-50' : 'opacity-100'}`}>
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-white">Context Batch Size</label>
                                            <span className="text-xs font-mono text-purple-400 bg-purple-500/10 px-3 py-1 rounded border border-purple-500/20">{contextBatchSize}</span>
                                        </div>
                                        <input
                                            type="range" min="1" max="50" step="1"
                                            value={contextBatchSize} onChange={(e) => setContextBatchSize(Number(e.target.value))}
                                            disabled={augmentation !== 'enrichment'}
                                            className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-purple-400 disabled:cursor-not-allowed [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 transition-all"
                                        />
                                        <p className="text-xs text-text-subtle">Batch size for AI context enrichment generation.</p>
                                    </div>
                                </div>
                            </section>

                            {/* Destination & Indexing */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-xl bg-surface border border-white/10 shadow-sm">
                                        <Database className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-white">Destination & Indexing</h3>
                                        <p className="text-xs text-text-subtle">Where your vectors will be stored.</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <SelectionCard
                                        icon={Database}
                                        title="PostgreSQL (pgvector)"
                                        description="Relational database with vector extension. Best for hybrid search."
                                        selected={destination === 'postgres'}
                                        onClick={() => setDestination('postgres')}
                                    />
                                    <SelectionCard
                                        icon={HardDrive}
                                        title="Qdrant Vector DB"
                                        description="High-performance vector similarity search engine."
                                        selected={destination === 'qdrant'}
                                        onClick={() => setDestination('qdrant')}
                                        disabled={true}
                                        badge="Temporarily unavailable."
                                    />
                                    <SelectionCard
                                        icon={Cloud}
                                        title="Pinecone"
                                        description="Managed vector database service."
                                        selected={destination === 'pinecone'}
                                        onClick={() => setDestination('pinecone')}
                                        disabled={true}
                                        badge="Temporarily unavailable."
                                    />
                                </div>
                            </section>

                        </div>
                    )}

                </div>
            </div>

            {/* Footer */}
            <div className="h-24 border-t border-white/5 bg-[#0A0A0F]/80 backdrop-blur-xl flex justify-between items-center px-8 shrink-0 z-20">
                <div className="flex items-center gap-2">
                    {step === 'settings' && (
                        <div className="hidden md:flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded border border-emerald-500/20">
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Configuration Validated</span>
                        </div>
                    )}
                </div>

                <div className="flex gap-4">
                    <Button
                        variant="outline"
                        onClick={() => {
                            if (step === 'settings') setStep(sourceType === 'sharepoint' ? 'discovery' : 'local_select');
                            else if (step === 'discovery' || step === 'local_select') setStep('source');
                            else onClose();
                        }}
                        disabled={isLoading}
                        className="!h-12 !px-6 border-white/10 hover:bg-white/5 text-text-subtle hover:text-white"
                    >
                        {step === 'source' ? 'Cancel' : 'Back'}
                    </Button>

                    {step === 'settings' ? (
                        <Button
                            variant="primary"
                            onClick={handleIngest}
                            disabled={isLoading}
                            className="!h-12 !px-8 shadow-neon-primary disabled:opacity-50 text-sm"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <RefreshCw className="w-5 h-5 mr-2" />}
                            {isLoading ? 'Processing...' : 'Start Ingestion Process'}
                        </Button>
                    ) : (
                        (step === 'discovery' && discoveredFiles.length > 0) || (step === 'local_select' && localFiles.length > 0) ? (
                            <Button
                                variant="primary"
                                onClick={proceedToSettings}
                                className="!h-12 !px-8 shadow-neon-primary text-sm"
                            >
                                Continue <ChevronRight className="w-5 h-5 ml-2" />
                            </Button>
                        ) : null
                    )}
                </div>
            </div>

        </div>,
        document.body
    );
}

// --- MAIN COMPONENT ---
// ... (rest of the file remains the same)

interface NotebookDocumentsProps {
    notebookId: string;
    notebookName: string;
    notebookDescription?: string;
    config: NotebookConfig;
}

const NotebookDocuments: React.FC<NotebookDocumentsProps> = ({ notebookId, notebookName, notebookDescription, config }) => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [isIngestModalOpen, setIsIngestModalOpen] = useState(false);
    const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
    const [selectedDetailDoc, setSelectedDetailDoc] = useState<Document | null>(null);
    const [selectedErrorDoc, setSelectedErrorDoc] = useState<Document | null>(null);

    const fetchDocuments = async (isBackground = false) => {
        if (!isBackground) setIsLoading(true);
        try {
            // Strict payload for user request
            const response = await fetch(NOTEBOOK_STATUS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId })
            });

            if (response.ok) {
                const data = await response.json();

                // Handle different response structures (direct array, or n8n wrapped)
                let rawData = [];
                if (Array.isArray(data)) {
                    rawData = data;
                } else if (data.documents && Array.isArray(data.documents)) {
                    rawData = data.documents;
                } else if (data.data && Array.isArray(data.data)) {
                    rawData = data.data;
                } else {
                    // Fallback for n8n wrapping if root is object but not array
                    rawData = [data];
                }

                // Unwrap n8n json if present
                rawData = rawData.map((item: any) => item.json ? item.json : item);

                const mappedDocs: Document[] = rawData
                    // Filter for items with a valid ID
                    .filter((doc: any) => doc && (doc.job_id || doc.file_id || doc.notebook_id || doc.id))
                    .map((doc: any) => {
                        // Map status to frontend types
                        let status: Document['status'] = 'completed';
                        const s = (doc.status || '').toLowerCase();

                        if (s === 'pending' || s === 'queued' || s === 'new') status = 'pending';
                        else if (s === 'processing' || s === 'running' || s === 'ingesting') status = 'processing';
                        else if (s === 'failed' || s === 'error') status = 'error';
                        else if (s === 'finished' || s === 'completed' || s === 'success') status = 'completed';

                        return {
                            id: doc.job_id || doc.file_id || doc.id || Math.random().toString(36),
                            jobId: doc.job_id || doc.jobId,
                            fileId: doc.file_id || doc.fileId,
                            name: doc.file_name || doc.name || doc.notebook_title || 'Untitled Document',
                            type: 'text',
                            status: status,
                            size: 'Unknown',
                            added: doc.created_at || new Date().toISOString(),
                            updated: doc.updated_at,
                            error: doc.error_description,
                            retryCount: doc.retry_count,
                            ingestionConfig: {
                                method: doc.ingestion_method || 'Unknown',
                                parser: doc.config_parser_mode || 'Standard',
                                chunking: doc.config_chunking_mode || 'Recursive',
                                chunkSize: doc.recursive_chunk_size,
                                overlap: doc.recursive_chunk_overlap,
                                augmentation: doc.config_enable_context_augmentation,
                                destination: doc.config_destination || 'PostgreSQL'
                            }
                        };
                    });

                // Sort by updated time or creation time desc
                mappedDocs.sort((a, b) => {
                    const timeA = new Date(a.updated || a.added).getTime();
                    const timeB = new Date(b.updated || b.added).getTime();
                    return timeB - timeA;
                });

                setDocuments(mappedDocs);
            } else {
                if (!isBackground) setDocuments([]);
            }
        } catch (error) {
            logger.error("Failed to fetch documents", error);
        } finally {
            if (!isBackground) setIsLoading(false);
        }
    };

    useEffect(() => {
        if (notebookId) {
            fetchDocuments();
        }
    }, [notebookId]);

    // Poll for updates if there are active jobs (pending/processing)
    useEffect(() => {
        const hasActiveJobs = documents.some(d => d.status === 'pending' || d.status === 'processing');
        if (!hasActiveJobs) return;

        const interval = setInterval(() => {
            fetchDocuments(true);
        }, 3000);

        return () => clearInterval(interval);
    }, [documents]);

    const handleIngestionStarted = () => {
        setIsLoading(true);
        // Refresh immediately to show pending job, then continue polling via useEffect
        setTimeout(() => fetchDocuments(), 1000);
    };

    const handleDeleteFile = async (doc: Document, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        logger.debug('Delete Requested', { fileName: doc.name, id: doc.id });

        setDeletingFileId(doc.id);

        try {
            const payload = {
                notebook_id: notebookId,
                file_id: doc.fileId || doc.id,
                job_id: doc.jobId || doc.id,
                orchestrator_id: ORCHESTRATOR_ID
            };

            logger.debug('Sending delete payload', { payload });

            const response = await fetch(DELETE_FILE_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                // Remove from local state immediately
                setDocuments(prev => prev.filter(d => d.id !== doc.id));
                logger.debug('File deleted successfully', { fileName: doc.name });
            } else {
                const text = await response.text();
                logger.error("Delete failed", { status: response.status, text });
                alert("Failed to delete file. Server returned an error.");
            }
        } catch (error) {
            logger.error("Delete network error", error);
            alert("An error occurred while deleting the file.");
        } finally {
            setDeletingFileId(null);
        }
    };

    const filteredDocs = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full bg-[#050508] relative overflow-hidden animate-fade-in">
            <IngestionModal
                isOpen={isIngestModalOpen}
                onClose={() => setIsIngestModalOpen(false)}
                notebookId={notebookId}
                notebookName={notebookName}
                notebookDescription={notebookDescription}
                config={config}
                onIngestionStarted={handleIngestionStarted}
            />

            <IngestionDetailsModal
                doc={selectedDetailDoc}
                notebookId={notebookId}
                onClose={() => setSelectedDetailDoc(null)}
            />

            <ErrorDetailsModal
                doc={selectedErrorDoc}
                notebookId={notebookId}
                onClose={() => setSelectedErrorDoc(null)}
            />

            {/* Header */}
            <div className="p-8 pb-4 pr-32 border-b border-white/5 bg-surface/50 backdrop-blur-md flex flex-col md:flex-row justify-between items-start md:items-center gap-4 z-50 relative">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <div className="p-2 rounded-lg bg-secondary/10 text-secondary border border-secondary/20">
                            <Database className="w-5 h-5" />
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Documents</h1>
                    </div>
                    <p className="text-text-subtle text-sm max-w-2xl">{notebookDescription || 'Manage the knowledge source for this notebook.'}</p>
                </div>

                <div className="flex gap-3">
                    <Button variant="outline" onClick={() => fetchDocuments(false)} className="!h-10 border-white/10 hover:bg-white/5 text-text-subtle">
                        <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => setIsIngestModalOpen(true)}
                        className="!h-10 !px-4 shadow-neon-primary text-xs flex items-center gap-2"
                    >
                        <Plus className="w-4 h-4" /> Add New File
                    </Button>
                </div>
            </div>

            {/* Toolbar */}
            <div className="px-8 py-4 border-b border-white/5 bg-surface/30 flex justify-between items-center z-10">
                <div className="relative group w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle group-focus-within:text-white transition-colors" />
                    <input
                        type="text"
                        placeholder="Search files..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#0A0A0F] border border-white/10 rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-primary/50 transition-colors"
                    />
                </div>

                <div className="flex bg-[#0A0A0F] rounded-lg p-1 border border-white/10">
                    <button
                        onClick={() => setViewMode('list')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white/10 text-white shadow-sm' : 'text-text-subtle hover:text-white'}`}
                    >
                        <ListIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white shadow-sm' : 'text-text-subtle hover:text-white'}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-8">
                {isLoading && documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-text-subtle">
                        <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                        <p>Loading documents...</p>
                    </div>
                ) : filteredDocs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 text-text-subtle border border-dashed border-white/10 rounded-2xl bg-surface/20">
                        <FolderOpen className="w-12 h-12 mb-4 opacity-50" />
                        <p>No documents found.</p>
                        {searchQuery && <p className="text-xs mt-2">Try adjusting your search query.</p>}
                    </div>
                ) : viewMode === 'list' ? (
                    <div className="space-y-3">
                        {filteredDocs.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => doc.status === 'error' ? setSelectedErrorDoc(doc) : setSelectedDetailDoc(doc)}
                                className="group relative flex items-center justify-between p-4 rounded-xl bg-[#0E0E12] border border-white/5 hover:border-white/10 hover:bg-[#121216] transition-all duration-300 shadow-sm hover:shadow-md cursor-pointer"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-text-subtle group-hover:text-primary transition-colors border border-white/5 group-hover:border-primary/20">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors">{doc.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-text-subtle mt-1">
                                            <span className="font-mono opacity-50 bg-black/30 px-1.5 rounded text-[10px]">{doc.jobId ? `Job: ${doc.jobId.slice(0, 8)}` : 'ID: N/A'}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/20"></span>
                                            <span>{new Date(doc.updated || doc.added).toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <StatusBadge status={doc.status} error={doc.error} />
                                    <div className="h-6 w-px bg-white/5"></div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            type="button"
                                            onClick={(e) => handleDeleteFile(doc, e)}
                                            disabled={deletingFileId === doc.id}
                                            className="p-2 rounded-lg text-text-subtle hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 disabled:opacity-50 cursor-pointer relative z-50"
                                            title="Delete File"
                                        >
                                            {deletingFileId === doc.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </button>
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                doc.status === 'error' ? setSelectedErrorDoc(doc) : setSelectedDetailDoc(doc);
                                            }}
                                            className={`p-2 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${doc.status === 'error' ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' : 'text-text-subtle hover:text-white hover:bg-white/10'}`}
                                            title={doc.status === 'error' ? undefined : "View Ingestion Details"}
                                        >
                                            {doc.status === 'error' ? <AlertTriangle className="w-4 h-4" /> : <Info className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {filteredDocs.map((doc) => (
                            <div
                                key={doc.id}
                                onClick={() => doc.status === 'error' ? setSelectedErrorDoc(doc) : setSelectedDetailDoc(doc)}
                                className="group p-5 rounded-xl bg-[#0E0E12] border border-white/5 hover:border-white/10 hover:bg-[#121216] transition-all flex flex-col justify-between aspect-square relative shadow-sm hover:shadow-md cursor-pointer"
                            >
                                <div className="flex justify-between items-start">
                                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-text-subtle group-hover:text-primary transition-colors border border-white/5 group-hover:border-primary/20">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <StatusBadge status={doc.status} error={doc.error} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-white group-hover:text-primary transition-colors line-clamp-2 mb-1">{doc.name}</h3>
                                    <p className="text-xs text-text-subtle font-mono opacity-60">{new Date(doc.added).toLocaleDateString()}</p>
                                </div>

                                {/* Hover Actions */}
                                <div className="absolute top-4 right-14 opacity-0 group-hover:opacity-100 transition-opacity z-50 flex gap-1">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            doc.status === 'error' ? setSelectedErrorDoc(doc) : setSelectedDetailDoc(doc);
                                        }}
                                        className={`p-1.5 rounded bg-surface border border-white/10 transition-colors cursor-pointer ${doc.status === 'error' ? 'text-red-400 hover:bg-red-500/10' : 'text-text-subtle hover:bg-white/10 hover:text-white'}`}
                                        title={doc.status === 'error' ? undefined : "View Details"}
                                    >
                                        {doc.status === 'error' ? <AlertTriangle className="w-3.5 h-3.5" /> : <Info className="w-3.5 h-3.5" />}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={(e) => handleDeleteFile(doc, e)}
                                        disabled={deletingFileId === doc.id}
                                        className="p-1.5 rounded bg-surface border border-white/10 hover:bg-red-500/10 hover:text-red-400 text-text-subtle transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                        {deletingFileId === doc.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotebookDocuments;
