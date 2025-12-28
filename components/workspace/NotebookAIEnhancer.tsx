import React, { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { NotebookConfig } from '../../config';
import {
    Sparkles,
    FileText,
    RefreshCw,
    Clock,
    CheckCircle2,
    AlertCircle,
    Loader2,
    FileSpreadsheet,
    FileImage,
    File,
    Zap,
    Upload,
    XCircle,
    CheckSquare,
    Square
} from 'lucide-react';

// Webhook URLs
const NOTEBOOK_STATUS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/a34aa1cf-d399-4120-a2b6-4e47ca21805b-notebook-status';
const GET_CHUNK_COUNT_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-get-chunks-count-ai-enhance';
const ENHANCE_CHUNKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/82edb933-65fa-4fde-b3ae-38d1c452879d-enhance-the-chunks';
const CHECK_ENHANCEMENT_STATUS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/3ea2afe6-ef5d-4249-9382-fa8bce6e51db-check-if-enhancement-finished';
const REINGEST_ERROR_FILES_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/3ea2afe6-ef5d-4249-9382-fa8bce6e51db-get-error-files';
const PUBLISH_ENHANCED_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/81d74c0b-7e08-4987-a88a-dea2a89e1595-publish-enhanced-chunks';

// Enhancement progress tracking
interface EnhancementProgress {
    fileId: string;
    fileName: string;
    totalChunks: number;
    terminatedChunks: number;
    successChunks: number;
    failedChunks: number;
    pendingChunks: number;
    processingChunks: number;
    embeddedChunks: number;
    allTerminated: boolean;
    isPolling: boolean;
}

interface ContextualChunk {
    chunk_id: string;
    job_id: string;
    file_id: string;
    file_name: string;
    file_content?: string;
    original_chunk: string;
    enhanced_chunk: string;
    status: string;
    retry_count: number;
    notebook_id: string;
    created_at: string;
    updated_at: string;
    [key: string]: any;
}

interface FileInfo {
    id: string;
    jobId?: string;
    fileId?: string;
    name: string;
    type: string;
    status: 'completed' | 'processing' | 'pending' | 'error' | 'enhancing';
    size: string;
    added: string;
    updated?: string;
    chunkStatus?: string; // 'all_completed', 'processing', 'pending'
    totalChunks?: number;
    completedChunks?: number;
}

interface NotebookAIEnhancerProps {
    notebookId: string;
    notebookName: string;
    config: NotebookConfig;
}

// Get file icon based on type
const getFileIcon = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('pdf')) return FileText;
    if (lowerType.includes('excel') || lowerType.includes('xlsx') || lowerType.includes('csv')) return FileSpreadsheet;
    if (lowerType.includes('image') || lowerType.includes('png') || lowerType.includes('jpg')) return FileImage;
    return File;
};

// Status badge component
const StatusBadge = ({ status, label }: { status: string; label?: string }) => {
    const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
        completed: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', icon: CheckCircle2, label: 'Ready' },
        processing: { bg: 'bg-amber-500/10', text: 'text-amber-400', icon: Loader2, label: 'Processing' },
        pending: { bg: 'bg-blue-500/10', text: 'text-blue-400', icon: Clock, label: 'Pending' },
        error: { bg: 'bg-red-500/10', text: 'text-red-400', icon: AlertCircle, label: 'Error' },
        enhancing: { bg: 'bg-purple-500/10', text: 'text-purple-400', icon: Loader2, label: 'Enhancing...' }
    };

    const statusConfig = config[status] || { bg: 'bg-gray-500/10', text: 'text-gray-400', icon: File, label: status };
    const Icon = statusConfig.icon;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.text}`}>
            <Icon className={`w-3 h-3 ${status === 'processing' || status === 'enhancing' ? 'animate-spin' : ''}`} />
            {label || statusConfig.label}
        </span>
    );
};

const NotebookAIEnhancer: React.FC<NotebookAIEnhancerProps> = ({ notebookId, notebookName, config }) => {
    const { user } = useUser();
    const [files, setFiles] = useState<FileInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingStats, setLoadingStats] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [enhancingFiles, setEnhancingFiles] = useState<Set<string>>(new Set());
    const [publishingFiles, setPublishingFiles] = useState<Set<string>>(new Set());
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [enhancementProgress, setEnhancementProgress] = useState<Map<string, EnhancementProgress>>(new Map());
    const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
    const [selectedForPublish, setSelectedForPublish] = useState<Set<string>>(new Set());
    const [isBatchPublishing, setIsBatchPublishing] = useState(false);

    // Track active polling intervals for cancellation
    const pollingIntervalsRef = React.useRef<Map<string, { interval: NodeJS.Timeout; timeout: NodeJS.Timeout }>>(new Map());

    // Cancel enhancement polling for a file
    const handleCancelEnhancement = (fileId: string, fileName: string) => {
        const polling = pollingIntervalsRef.current.get(fileId);
        if (polling) {
            clearInterval(polling.interval);
            clearTimeout(polling.timeout);
            pollingIntervalsRef.current.delete(fileId);
        }

        setEnhancementProgress(prev => {
            const newMap = new Map<string, EnhancementProgress>(prev);
            const current = newMap.get(fileId);
            if (current && typeof current === 'object') {
                newMap.set(fileId, { ...current, isPolling: false, allTerminated: true });
            }
            return newMap;
        });

        setSuccessMessage(`Enhancement cancelled for "${fileName}"`);
        setTimeout(() => setSuccessMessage(null), 5000);
    };

    // Fetch files with their status
    const fetchFiles = async (isManualRefresh = false) => {
        // Only show full loading on initial load, not refreshes
        if (files.length === 0) {
            setLoading(true);
        } else {
            setIsRefreshing(true);
        }
        setError(null);

        try {
            const response = await fetch(NOTEBOOK_STATUS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId })
            });

            if (!response.ok) throw new Error('Failed to fetch files');

            const data = await response.json();

            // Handle different response structures
            let rawData = [];
            if (Array.isArray(data)) {
                rawData = data;
            } else if (data.documents && Array.isArray(data.documents)) {
                rawData = data.documents;
            } else if (data.data && Array.isArray(data.data)) {
                rawData = data.data;
            } else if (data.files && Array.isArray(data.files)) {
                rawData = data.files;
            } else {
                rawData = [data];
            }

            // Unwrap n8n json if present
            rawData = rawData.map((item: any) => item.json ? item.json : item);

            // Map files with status info
            const mappedFiles = rawData
                .filter((doc: any) => doc && (doc.job_id || doc.file_id || doc.notebook_id || doc.id))
                .map((doc: any) => {
                    const rawStatus = (doc.status || '').toLowerCase();
                    let status: FileInfo['status'] = 'pending';

                    if (['completed', 'success', 'finished', 'done', 'active', 'ready'].some(k => rawStatus.includes(k))) {
                        status = 'completed';
                    } else if (rawStatus.includes('processing') || rawStatus.includes('running')) {
                        status = 'processing';
                    } else if (rawStatus.includes('error') || rawStatus.includes('failed')) {
                        status = 'error';
                    }

                    return {
                        id: doc.job_id || doc.file_id || doc.id || Math.random().toString(36),
                        jobId: doc.job_id || doc.jobId,
                        fileId: doc.file_id || doc.fileId,
                        name: doc.file_name || doc.name || doc.notebook_title || 'Untitled Document',
                        type: doc.file_type || doc.type || 'document',
                        status,
                        size: doc.size || 'Unknown',
                        added: doc.created_at || new Date().toISOString(),
                        updated: doc.updated_at,
                        chunkStatus: doc.chunk_status || doc.chunkStatus,
                        totalChunks: doc.total_chunks || doc.totalChunks,
                        completedChunks: doc.completed_chunks || doc.completedChunks
                    };
                });

            // Sort by updated time desc
            mappedFiles.sort((a: FileInfo, b: FileInfo) => {
                const timeA = new Date(a.updated || a.added).getTime();
                const timeB = new Date(b.updated || b.added).getTime();
                return timeB - timeA;
            });

            setFiles(mappedFiles);
            setLoading(false);
            setIsRefreshing(false);

            // Fetch enhancement statistics for completed files
            // Use Promise.all for faster parallel loading
            setLoadingStats(true);
            const completedFilesForStats = mappedFiles.filter((f: FileInfo) => f.status === 'completed');

            const statsPromises = completedFilesForStats.map(async (file: FileInfo) => {
                try {
                    const fileId = file.fileId || file.id;

                    // 1. First, fetch chunk count from the dedicated chunk count webhook
                    let totalChunks = 0;
                    try {
                        const crResponse = await fetch(GET_CHUNK_COUNT_WEBHOOK_URL, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                body: {
                                    file_id: fileId,
                                    notebook_id: notebookId
                                }
                            })
                        });

                        if (crResponse.ok) {
                            const crData = await crResponse.json();
                            console.log('Chunk count response for', fileId, ':', crData);

                            // Response format: [{ "total_count": 123 }] from n8n
                            if (Array.isArray(crData) && crData.length > 0) {
                                const firstItem = crData[0]?.json || crData[0];
                                totalChunks = parseInt(firstItem?.total_count) || 0;
                            } else if (crData?.json) {
                                totalChunks = parseInt(crData.json?.total_count) || 0;
                            } else if (crData?.total_count !== undefined) {
                                totalChunks = parseInt(crData.total_count) || 0;
                            }
                            console.log('Parsed chunk count for', fileId, ':', totalChunks);
                        }
                    } catch (crErr) {
                        console.warn('Failed to fetch chunk count for', fileId, crErr);
                    }

                    // 2. Then, fetch enhancement status (for enhanced/published files)
                    const response = await fetch(CHECK_ENHANCEMENT_STATUS_WEBHOOK_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_id: fileId,
                            notebook_id: notebookId
                        })
                    });

                    let terminatedChunks = 0;
                    let successChunks = 0;
                    let failedChunks = 0;
                    let pendingChunks = 0;
                    let processingChunks = 0;
                    let embeddedChunks = 0;
                    let allTerminated = false;

                    if (response.ok) {
                        const data = await response.json();
                        let result = data;
                        if (Array.isArray(data) && data.length > 0) {
                            result = data[0];
                        }
                        if (result?.json) {
                            result = result.json;
                        }

                        // Use enhancement status total_chunks if available (may be more accurate for enhanced files)
                        const enhancementTotalChunks = parseInt(result?.total_chunks) || 0;
                        if (enhancementTotalChunks > 0 && enhancementTotalChunks > totalChunks) {
                            totalChunks = enhancementTotalChunks;
                        }

                        terminatedChunks = parseInt(result?.terminated_chunks) || 0;
                        successChunks = parseInt(result?.success_chunks) || 0;
                        failedChunks = parseInt(result?.failed_chunks) || 0;
                        pendingChunks = parseInt(result?.pending_chunks) || 0;
                        processingChunks = parseInt(result?.processing_chunks) || 0;
                        embeddedChunks = parseInt(result?.embedded_chunks) || 0;
                        allTerminated = result?.all_terminated === true ||
                            result?.all_terminated === 'true' ||
                            result?.all_terminated === 't' ||
                            (totalChunks > 0 && terminatedChunks >= totalChunks);
                    }

                    // Return stats for ALL files, even if totalChunks is 0
                    // This ensures the UI shows the loading state and actual counts
                    return {
                        fileId,
                        fileName: file.name,
                        totalChunks,
                        terminatedChunks,
                        successChunks,
                        failedChunks,
                        pendingChunks,
                        processingChunks,
                        embeddedChunks,
                        allTerminated,
                        isPolling: false
                    };
                } catch (err) {
                    return null;
                }
            });

            const statsResults = await Promise.all(statsPromises);

            // Update all stats at once for smooth transition
            setEnhancementProgress(prev => {
                const newMap = new Map(prev);
                statsResults.forEach(stat => {
                    if (stat) {
                        newMap.set(stat.fileId, stat);
                    }
                });
                return newMap;
            });
            setLoadingStats(false);

        } catch (err) {
            setError('Failed to load files. Please try again.');
            setLoading(false);
            setIsRefreshing(false);
            setLoadingStats(false);
        }
    };

    // Check enhancement status for a file
    const checkEnhancementStatus = async (file: FileInfo): Promise<EnhancementProgress | null> => {
        try {
            const response = await fetch(CHECK_ENHANCEMENT_STATUS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    file_id: file.fileId || file.id,
                    notebook_id: notebookId
                })
            });

            if (!response.ok) return null;

            const data = await response.json();

            // Handle n8n response format - could be array, object with json wrapper, etc.
            let result = data;
            if (Array.isArray(data) && data.length > 0) {
                result = data[0];
            }
            if (result?.json) {
                result = result.json;
            }


            const totalChunks = parseInt(result?.total_chunks) || 0;
            const terminatedChunks = parseInt(result?.terminated_chunks) || 0;
            const successChunks = parseInt(result?.success_chunks) || 0;
            const failedChunks = parseInt(result?.failed_chunks) || 0;
            const pendingChunks = parseInt(result?.pending_chunks) || 0;
            const processingChunks = parseInt(result?.processing_chunks) || 0;
            const embeddedChunks = parseInt(result?.embedded_chunks) || 0;
            const allTerminated = result?.all_terminated === true ||
                result?.all_terminated === 'true' ||
                result?.all_terminated === 't' ||
                (totalChunks > 0 && terminatedChunks >= totalChunks);


            return {
                fileId: file.fileId || file.id,
                fileName: file.name,
                totalChunks,
                terminatedChunks,
                successChunks,
                failedChunks,
                pendingChunks,
                processingChunks,
                embeddedChunks,
                allTerminated,
                isPolling: true
            };
        } catch (err) {
            return null;
        }
    };

    // Start polling for enhancement status
    const startPollingStatus = (file: FileInfo) => {
        const fileId = file.fileId || file.id;

        // Initialize progress
        setEnhancementProgress(prev => {
            const newMap = new Map(prev);
            newMap.set(fileId, {
                fileId,
                fileName: file.name,
                totalChunks: 0,
                terminatedChunks: 0,
                successChunks: 0,
                failedChunks: 0,
                pendingChunks: 0,
                processingChunks: 0,
                embeddedChunks: 0,
                allTerminated: false,
                isPolling: true
            });
            return newMap;
        });

        // Track last progress to detect stale/stuck enhancement
        let lastTerminatedCount = 0;
        let staleCheckCount = 0;
        const POLL_INTERVAL_MS = 4000; // Poll every 4 seconds for better UX
        const MAX_STALE_CHECKS = 8; // 8 * 4 seconds = 32 seconds of no progress = stuck

        // Function to check status and update
        const checkAndUpdate = async () => {
            const status = await checkEnhancementStatus(file);

            if (status) {
                setEnhancementProgress(prev => {
                    const newMap = new Map(prev);
                    newMap.set(fileId, status);
                    return newMap;
                });

                // Check if progress is stale (not changing)
                if (status.terminatedChunks === lastTerminatedCount) {
                    staleCheckCount++;
                } else {
                    staleCheckCount = 0;
                    lastTerminatedCount = status.terminatedChunks;
                }

                // Stop polling when all chunks are terminated OR progress is stuck
                const isStuck = staleCheckCount >= MAX_STALE_CHECKS && status.terminatedChunks > 0;
                if (status.allTerminated || isStuck) {
                    clearInterval(pollInterval);
                    setEnhancementProgress(prev => {
                        const newMap = new Map<string, EnhancementProgress>(prev);
                        const current = newMap.get(fileId);
                        if (current) {
                            newMap.set(fileId, { ...current, isPolling: false, allTerminated: true });
                        }
                        return newMap;
                    });

                    if (isStuck) {
                        setSuccessMessage(`Enhancement finished for "${file.name}" (${status.terminatedChunks}/${status.totalChunks} chunks processed)`);
                    } else {
                        setSuccessMessage(`Enhancement completed for "${file.name}"!`);
                    }
                    fetchFiles();

                    // Clear success message after 8 seconds
                    setTimeout(() => setSuccessMessage(null), 8000);
                }
            }
        };

        // Immediate first check
        checkAndUpdate();

        // Then poll every 4 seconds
        const pollInterval = setInterval(checkAndUpdate, POLL_INTERVAL_MS);

        // Stop polling after 5 minutes max (300000ms)
        const timeoutId = setTimeout(() => {
            pollingIntervalsRef.current.delete(fileId);
            clearInterval(pollInterval);
            setEnhancementProgress(prev => {
                const newMap = new Map<string, EnhancementProgress>(prev);
                const current = newMap.get(fileId);
                if (current && current.isPolling) {
                    newMap.set(fileId, { ...current, isPolling: false, allTerminated: true });
                }
                return newMap;
            });
            setSuccessMessage(`Enhancement timeout for "${file.name}" (5 min limit) - check n8n workflow`);
            setTimeout(() => setSuccessMessage(null), 8000);
        }, 300000);

        // Store interval and timeout for cancellation
        pollingIntervalsRef.current.set(fileId, { interval: pollInterval, timeout: timeoutId });
    };

    // Trigger AI enhancement for a file - sends file ID to backend webhook which fetches chunks directly
    const handleEnhanceFile = async (file: FileInfo) => {
        setEnhancingFiles(prev => new Set(prev).add(file.id));
        setSuccessMessage(null);
        setError(null);

        try {
            // Send file identifiers to enhance webhook - backend will fetch chunks directly (faster)
            const enhancePayload = {
                file_id: file.fileId || file.id,
                job_id: file.jobId,
                file_name: file.name,
                notebook_id: notebookId,
                user_id: user?.id,
                embedding_model: config.embeddingModel
            };

            const response = await fetch(ENHANCE_CHUNKS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(enhancePayload)
            });

            if (!response.ok) throw new Error('Failed to trigger enhancement');

            setSuccessMessage(`Enhancement started for "${file.name}"! Checking progress...`);

            // Start polling for status
            startPollingStatus(file);

        } catch (err) {
            console.error('Error enhancing file:', err);
            setError(`Failed to enhance "${file.name}". Please try again.`);
        } finally {
            setEnhancingFiles(prev => {
                const next = new Set(prev);
                next.delete(file.id);
                return next;
            });
        }
    };

    // Reingest only errored chunks for a file
    const handleReingestErrors = async (file: FileInfo) => {
        setEnhancingFiles(prev => new Set(prev).add(file.id));
        setSuccessMessage(null);
        setError(null);

        try {
            const reingestPayload = {
                file_id: file.fileId || file.id,
                job_id: file.jobId,
                notebook_id: notebookId,
                user_id: user?.id
            };
            console.log('Sending to reingest webhook:', reingestPayload);

            const response = await fetch(REINGEST_ERROR_FILES_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(reingestPayload)
            });

            if (!response.ok) throw new Error('Failed to trigger reingest');

            setSuccessMessage(`Reingest started for failed chunks in "${file.name}"!`);

            // Start polling for status
            startPollingStatus(file);

        } catch (err) {
            console.error('Error reingesting file:', err);
            setError(`Failed to reingest "${file.name}". Please try again.`);
        } finally {
            setEnhancingFiles(prev => {
                const next = new Set(prev);
                next.delete(file.id);
                return next;
            });
        }
    };

    // Publish enhanced chunks - deletes old documents and re-ingests with enhanced content
    const handlePublishEnhanced = async (file: FileInfo) => {
        setPublishingFiles(prev => new Set(prev).add(file.id));
        setSuccessMessage(null);
        setError(null);

        try {
            const publishPayload = {
                file_id: file.fileId || file.id,
                job_id: file.jobId,
                file_name: file.name,
                notebook_id: notebookId,
                notebook_title: notebookName,
                user_id: user?.id,
                embedding_model: 'text-embedding-3-small', // Default to OpenAI embedding
                body_recursiv_chunk_size: 50000, // High value to avoid re-chunking enhanced content
                body_recursiv_chunk_overlap: 0
            };

            const response = await fetch(PUBLISH_ENHANCED_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(publishPayload)
            });

            if (!response.ok) throw new Error('Failed to publish enhanced chunks');

            setSuccessMessage(`Publishing enhanced chunks for "${file.name}"! This may take a moment...`);

            // Refresh files after a delay to show updated status
            setTimeout(() => {
                fetchFiles();
                setSuccessMessage(`Enhanced chunks for "${file.name}" published successfully!`);
                setTimeout(() => setSuccessMessage(null), 8000);
            }, 3000);

        } catch (err) {
            setError(`Failed to publish enhanced chunks for "${file.name}". Please try again.`);
        } finally {
            setPublishingFiles(prev => {
                const next = new Set(prev);
                next.delete(file.id);
                return next;
            });
            // Also remove from selected for publish
            setSelectedForPublish(prev => {
                const next = new Set(prev);
                next.delete(file.id);
                return next;
            });
        }
    };

    // Handle batch enhancement of selected files
    const handleBatchEnhance = async () => {
        if (selectedFiles.size === 0) return;

        // Find file objects for selected IDs
        const filesToEnhance = notEnhancedFiles.filter(f => selectedFiles.has(f.id));

        // Enhance each file
        for (const file of filesToEnhance) {
            await handleEnhanceFile(file);
        }

        // Clear selection
        setSelectedFiles(new Set());
    };

    // Toggle selection of a file
    const toggleFileSelection = (fileId: string) => {
        setSelectedFiles(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    // Toggle select all
    const toggleSelectAll = () => {
        if (selectedFiles.size === notEnhancedFiles.length) {
            setSelectedFiles(new Set());
        } else {
            setSelectedFiles(new Set(notEnhancedFiles.map(f => f.id)));
        }
    };

    // Toggle selection for publishing
    const togglePublishSelection = (fileId: string) => {
        setSelectedForPublish(prev => {
            const next = new Set(prev);
            if (next.has(fileId)) {
                next.delete(fileId);
            } else {
                next.add(fileId);
            }
            return next;
        });
    };

    // Toggle select all for publishing
    const toggleSelectAllForPublish = () => {
        if (selectedForPublish.size === enhancedFiles.length) {
            setSelectedForPublish(new Set());
        } else {
            setSelectedForPublish(new Set(enhancedFiles.map(f => f.id)));
        }
    };

    // Batch publish all selected files
    const handleBatchPublish = async () => {
        if (selectedForPublish.size === 0) return;

        setIsBatchPublishing(true);
        setSuccessMessage(null);
        setError(null);

        const filesToPublish = enhancedFiles.filter(f => selectedForPublish.has(f.id));
        let successCount = 0;
        let errorCount = 0;

        for (const file of filesToPublish) {
            try {
                setPublishingFiles(prev => new Set(prev).add(file.id));

                const publishPayload = {
                    file_id: file.fileId || file.id,
                    job_id: file.jobId,
                    file_name: file.name,
                    notebook_id: notebookId,
                    notebook_title: notebookName,
                    user_id: user?.id,
                    embedding_model: 'text-embedding-3-small',
                    body_recursiv_chunk_size: 50000,
                    body_recursiv_chunk_overlap: 0
                };

                const response = await fetch(PUBLISH_ENHANCED_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(publishPayload)
                });

                if (response.ok) {
                    successCount++;
                } else {
                    errorCount++;
                }
            } catch (err) {
                errorCount++;
            } finally {
                setPublishingFiles(prev => {
                    const next = new Set(prev);
                    next.delete(file.id);
                    return next;
                });
            }
        }

        setSelectedForPublish(new Set());
        setIsBatchPublishing(false);

        if (successCount > 0) {
            setSuccessMessage(`Publishing ${successCount} file${successCount > 1 ? 's' : ''}! This may take a moment...`);
            setTimeout(() => {
                fetchFiles();
                setSuccessMessage(`${successCount} file${successCount > 1 ? 's' : ''} published successfully!${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
                setTimeout(() => setSuccessMessage(null), 8000);
            }, 3000);
        } else if (errorCount > 0) {
            setError(`Failed to publish ${errorCount} file${errorCount > 1 ? 's' : ''}.`);
        }
    };

    useEffect(() => {
        fetchFiles();
    }, [notebookId]);

    // Auto-refresh every 30 seconds if any file is processing
    useEffect(() => {
        const hasProcessingFiles = files.some(f => f.status === 'processing');
        if (hasProcessingFiles) {
            const interval = setInterval(fetchFiles, 30000);
            return () => clearInterval(interval);
        }
    }, [files]);

    // Helper to check if file is tabular/structured data
    const isTabularFile = (file: FileInfo): boolean => {
        const type = file.type.toLowerCase();
        const name = file.name.toLowerCase();
        const tabularExtensions = ['.csv', '.xlsx', '.xls', '.tsv', '.ods', '.numbers'];
        const tabularTypes = ['csv', 'excel', 'spreadsheet', 'tabular', 'xlsx', 'xls', 'tsv', 'ods'];

        return tabularExtensions.some(ext => name.endsWith(ext)) ||
            tabularTypes.some(t => type.includes(t));
    };

    // Helper to determine file enhancement state
    type EnhancementState = 'not-enhanced' | 'enhancing' | 'enhanced' | 'published';

    const getFileEnhancementState = (file: FileInfo): EnhancementState => {
        const fileId = file.fileId || file.id;
        const progress = enhancementProgress.get(fileId);

        // No enhancement data = not enhanced
        if (!progress || progress.totalChunks === 0) {
            return 'not-enhanced';
        }

        // Currently being enhanced (polling active)
        if (progress.isPolling) {
            return 'enhancing';
        }

        // All chunks embedded = published
        if (progress.embeddedChunks >= progress.totalChunks && progress.totalChunks > 0) {
            return 'published';
        }

        // Enhanced but not yet published (has success chunks, all terminated)
        if (progress.allTerminated && progress.successChunks > 0) {
            return 'enhanced';
        }

        return 'not-enhanced';
    };

    // Filter completed files by type
    const allCompletedFiles = files.filter(f => f.status === 'completed');
    const tabularFiles = allCompletedFiles.filter(f => isTabularFile(f));
    const allCompletedNonTabular = allCompletedFiles.filter(f => !isTabularFile(f));

    // Filter by enhancement state
    const publishedFiles = allCompletedNonTabular.filter(f => getFileEnhancementState(f) === 'published');
    const enhancedFiles = allCompletedNonTabular.filter(f => getFileEnhancementState(f) === 'enhanced');
    const currentlyEnhancingFiles = allCompletedNonTabular.filter(f => getFileEnhancementState(f) === 'enhancing');
    const notEnhancedFiles = allCompletedNonTabular.filter(f => getFileEnhancementState(f) === 'not-enhanced');

    // Files that are still being processed or pending
    const processingFiles = files.filter(f => f.status === 'processing' || f.status === 'pending');
    // Files that failed ingestion
    const errorFiles = files.filter(f => f.status === 'error');

    // Count files by status (for summary)
    const statusCounts = files.reduce((acc, file) => {
        acc[file.status] = (acc[file.status] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return (
        <div className="p-8 w-full mx-auto animate-fade-in-up">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20">
                                <Sparkles className="w-5 h-5 text-purple-400" />
                            </div>
                            AI Enhancer
                        </h1>
                        <p className="text-text-subtle mt-1">Enhance your document chunks with AI-powered contextual retrieval</p>
                    </div>
                    <button
                        onClick={() => fetchFiles(true)}
                        disabled={loading || isRefreshing}
                        className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-sm text-white transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading || isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                </div>

                {/* Status summary */}
                {!loading && files.length > 0 && (
                    <div className="flex flex-wrap gap-3">
                        {loadingStats && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                                <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                                <span className="text-sm text-purple-400">Loading stats...</span>
                            </div>
                        )}
                        {statusCounts.completed && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                <span className="text-sm text-emerald-400">{statusCounts.completed} Ready</span>
                            </div>
                        )}
                        {statusCounts.processing && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                                <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
                                <span className="text-sm text-amber-400">{statusCounts.processing} Processing</span>
                            </div>
                        )}
                        {statusCounts.pending && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <span className="text-sm text-blue-400">{statusCounts.pending} Pending</span>
                            </div>
                        )}
                        {statusCounts.error && (
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                                <span className="text-sm text-red-400">{statusCounts.error} Error</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Success message */}
                {successMessage && (
                    <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 animate-fade-in-up">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <p className="text-sm text-emerald-400">{successMessage}</p>
                    </div>
                )}

                {/* Error message */}
                {error && (
                    <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <AlertCircle className="w-5 h-5 text-red-400" />
                        <p className="text-sm text-red-400">{error}</p>
                    </div>
                )}

                {/* Loading state */}
                {loading && (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-10 h-10 text-purple-400 animate-spin mb-4" />
                        <p className="text-text-subtle">Loading files...</p>
                    </div>
                )}

                {/* Empty state - only show when no files at all */}
                {!loading && !error && files.length === 0 && (
                    <div className="bg-surface-highlight/30 border border-white/5 rounded-2xl p-12 text-center animate-fade-in-up">
                        <div className="w-16 h-16 rounded-2xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4 animate-float">
                            <FileText className="w-8 h-8 text-purple-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-white mb-2">No Documents Found</h3>
                        <p className="text-text-subtle max-w-md mx-auto">
                            Upload and process documents in the Documents section first. Once files are ingested, they'll appear here for AI enhancement.
                        </p>
                    </div>
                )}

                {/* === SECTION 1: PUBLISHED (Done) === */}
                {!loading && publishedFiles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Published</h2>
                                <p className="text-xs text-text-subtle">{publishedFiles.length} file{publishedFiles.length !== 1 ? 's' : ''} enhanced and published to vector database</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-slide-up">
                            {publishedFiles.map((file) => {
                                const FileIcon = getFileIcon(file.type);
                                const fileId = file.fileId || file.id;
                                const progress = enhancementProgress.get(fileId);

                                return (
                                    <div
                                        key={file.id}
                                        className="relative bg-surface-highlight/30 backdrop-blur-xl border border-emerald-500/30 rounded-2xl p-5 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-emerald-500/10"
                                    >
                                        <div className="absolute top-3 right-3">
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                <CheckCircle2 className="w-3 h-3" />
                                                Published
                                            </span>
                                        </div>

                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-600/20 flex items-center justify-center border border-emerald-500/20 shrink-0">
                                                <FileIcon className="w-6 h-6 text-emerald-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white truncate" title={file.name}>
                                                    {file.name}
                                                </h3>
                                                <p className="text-xs text-text-subtle mt-0.5">{file.type}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 text-xs text-text-subtle mb-4">
                                            <span>{file.size}</span>
                                            <span>•</span>
                                            <span>{new Date(file.updated || file.added).toLocaleDateString()}</span>
                                        </div>

                                        {progress && (
                                            <div className="flex items-center gap-2 text-xs text-emerald-400">
                                                <CheckCircle2 className="w-3.5 h-3.5" />
                                                <span>{progress.embeddedChunks} chunks embedded</span>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* === SECTION 2: READY TO PUBLISH (Enhanced, awaiting publish) === */}
                {!loading && enhancedFiles.length > 0 && (
                    <div className="space-y-6">
                        {/* Header with Publish All button */}
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10">
                                    <Zap className="w-5 h-5 text-purple-400" />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white">Ready to Publish</h2>
                                    <p className="text-sm text-text-subtle">{enhancedFiles.length} file{enhancedFiles.length !== 1 ? 's' : ''} enhanced — select and publish to vector database</p>
                                </div>
                            </div>
                            {/* Publish All Selected button */}
                            {selectedForPublish.size > 0 && (
                                <button
                                    onClick={handleBatchPublish}
                                    disabled={isBatchPublishing}
                                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isBatchPublishing ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Publishing...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Upload className="w-4 h-4" />
                                            <span>Publish {selectedForPublish.size} Selected</span>
                                        </>
                                    )}
                                </button>
                            )}
                        </div>

                        {/* Full-width modern table layout */}
                        <div className="w-full bg-surface-highlight/20 backdrop-blur-xl border border-purple-500/20 rounded-2xl overflow-hidden shadow-lg shadow-purple-500/5">
                            {/* Table Header with Select All */}
                            <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-purple-500/[0.03] border-b border-purple-500/10 text-xs font-semibold text-text-subtle uppercase tracking-wider">
                                <div className="col-span-1 flex items-center justify-center">
                                    <button
                                        onClick={toggleSelectAllForPublish}
                                        className="p-1 hover:bg-white/10 rounded transition-colors"
                                        title={selectedForPublish.size === enhancedFiles.length ? 'Deselect all' : 'Select all'}
                                    >
                                        {selectedForPublish.size === enhancedFiles.length ? (
                                            <CheckSquare className="w-4 h-4 text-purple-400" />
                                        ) : (
                                            <Square className="w-4 h-4 text-text-subtle hover:text-purple-400" />
                                        )}
                                    </button>
                                </div>
                                <div className="col-span-4">Document</div>
                                <div className="col-span-2 text-center">Enhanced Chunks</div>
                                <div className="col-span-2 text-center">Size</div>
                                <div className="col-span-3 text-right">Action</div>
                            </div>

                            {/* Table Body */}
                            <div className="divide-y divide-purple-500/10">
                                {enhancedFiles.map((file) => {
                                    const FileIcon = getFileIcon(file.type);
                                    const fileId = file.fileId || file.id;
                                    const progress = enhancementProgress.get(fileId);
                                    const isPublishing = publishingFiles.has(file.id);
                                    const isSelected = selectedForPublish.has(file.id);

                                    return (
                                        <div
                                            key={file.id}
                                            className={`grid grid-cols-12 gap-4 px-6 py-5 items-center group hover:bg-purple-500/[0.02] transition-all duration-300 ${isSelected ? 'bg-purple-500/[0.05]' : ''}`}
                                        >
                                            {/* Checkbox */}
                                            <div className="col-span-1 flex items-center justify-center">
                                                <button
                                                    onClick={() => togglePublishSelection(file.id)}
                                                    disabled={isPublishing}
                                                    className="p-1 hover:bg-white/10 rounded transition-colors disabled:opacity-50"
                                                >
                                                    {isSelected ? (
                                                        <CheckSquare className="w-5 h-5 text-purple-400" />
                                                    ) : (
                                                        <Square className="w-5 h-5 text-text-subtle hover:text-purple-400" />
                                                    )}
                                                </button>
                                            </div>
                                            {/* Document Info */}
                                            <div className="col-span-4 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/20 shrink-0 group-hover:border-purple-500/40 group-hover:shadow-lg group-hover:shadow-purple-500/10 transition-all duration-300">
                                                    <FileIcon className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-white truncate group-hover:text-purple-200 transition-colors" title={file.name}>
                                                        {file.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-text-subtle">{file.type}</span>
                                                        <span className="text-text-subtle/50">•</span>
                                                        <span className="text-xs text-text-subtle">{new Date(file.updated || file.added).toLocaleDateString()}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Enhanced Chunks */}
                                            <div className="col-span-2 text-center">
                                                <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-xl">
                                                    <Sparkles className="w-4 h-4 text-purple-400" />
                                                    <span className="text-lg font-bold text-purple-400">
                                                        {progress ? progress.successChunks : '—'}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Size */}
                                            <div className="col-span-2 text-center">
                                                <span className="text-sm text-text-subtle">{file.size}</span>
                                            </div>

                                            {/* Action */}
                                            <div className="col-span-3 flex items-center justify-end">
                                                <button
                                                    onClick={() => handlePublishEnhanced(file)}
                                                    disabled={isPublishing}
                                                    className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white shadow-lg shadow-purple-500/20 hover:shadow-purple-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                                                >
                                                    {isPublishing ? (
                                                        <>
                                                            <Loader2 className="w-4 h-4 animate-spin" />
                                                            <span>Publishing...</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Upload className="w-4 h-4" />
                                                            <span>Publish</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* === SECTION 3: CURRENTLY ENHANCING (In Progress) === */}
                {!loading && currentlyEnhancingFiles.length > 0 && (
                    <div className="space-y-6">
                        {/* Header */}
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 shadow-lg shadow-purple-500/10 animate-pulse">
                                <Loader2 className="w-5 h-5 text-purple-400 animate-spin" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Enhancing</h2>
                                <p className="text-sm text-text-subtle">{currentlyEnhancingFiles.length} file{currentlyEnhancingFiles.length !== 1 ? 's' : ''} being enhanced with AI</p>
                            </div>
                        </div>

                        {/* Full-width modern table layout with animated border */}
                        <div className="w-full bg-surface-highlight/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl overflow-hidden shadow-lg shadow-purple-500/10 relative">
                            {/* Animated gradient border effect */}
                            <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 opacity-50 animate-pulse pointer-events-none" />

                            {/* Table Header */}
                            <div className="relative grid grid-cols-12 gap-4 px-6 py-4 bg-purple-500/[0.05] border-b border-purple-500/20 text-xs font-semibold text-text-subtle uppercase tracking-wider">
                                <div className="col-span-4">Document</div>
                                <div className="col-span-5 text-center">Progress</div>
                                <div className="col-span-3 text-right">Action</div>
                            </div>

                            {/* Table Body */}
                            <div className="relative divide-y divide-purple-500/10">
                                {currentlyEnhancingFiles.map((file) => {
                                    const FileIcon = getFileIcon(file.type);
                                    const fileId = file.fileId || file.id;
                                    const progress = enhancementProgress.get(fileId);
                                    const progressPercent = progress && progress.totalChunks > 0
                                        ? Math.round((progress.terminatedChunks / progress.totalChunks) * 100)
                                        : 0;

                                    return (
                                        <div
                                            key={file.id}
                                            className="grid grid-cols-12 gap-4 px-6 py-5 items-center group hover:bg-purple-500/[0.03] transition-all duration-300"
                                        >
                                            {/* Document Info */}
                                            <div className="col-span-4 flex items-center gap-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center border border-purple-500/30 shrink-0 animate-pulse shadow-lg shadow-purple-500/10">
                                                    <FileIcon className="w-6 h-6 text-purple-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-semibold text-white truncate" title={file.name}>
                                                        {file.name}
                                                    </h3>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className="text-xs text-text-subtle">{file.type}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress */}
                                            <div className="col-span-5">
                                                {progress && progress.totalChunks > 0 ? (
                                                    <div className="space-y-2">
                                                        {/* Progress stats */}
                                                        <div className="flex items-center justify-between text-xs">
                                                            <span className="text-purple-400 font-medium flex items-center gap-1.5">
                                                                <Loader2 className="w-3 h-3 animate-spin" />
                                                                Enhancing...
                                                            </span>
                                                            <span className="text-text-subtle font-medium">
                                                                {progress.terminatedChunks}/{progress.totalChunks} ({progressPercent}%)
                                                            </span>
                                                        </div>

                                                        {/* Progress bar */}
                                                        <div className="h-3 bg-white/5 rounded-full overflow-hidden relative">
                                                            <div
                                                                className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500 relative overflow-hidden"
                                                                style={{ width: `${progressPercent}%` }}
                                                            >
                                                                <div className="absolute inset-0 bg-white/20 animate-[shimmer_2s_infinite]" style={{ transform: 'skewX(-20deg)' }}></div>
                                                            </div>
                                                        </div>

                                                        {/* Status badges */}
                                                        <div className="flex gap-3 text-xs">
                                                            {(progress.successChunks > 0 || progress.failedChunks > 0) ? (
                                                                <>
                                                                    {progress.successChunks > 0 && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 font-medium">
                                                                            <CheckCircle2 className="w-3 h-3" />
                                                                            {progress.successChunks}
                                                                        </span>
                                                                    )}
                                                                    {progress.failedChunks > 0 && (
                                                                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 font-medium">
                                                                            <AlertCircle className="w-3 h-3" />
                                                                            {progress.failedChunks}
                                                                        </span>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <span className="text-purple-400/60">Preparing chunks...</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-purple-400">
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                        <span className="text-sm">Initializing...</span>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Action */}
                                            <div className="col-span-3 flex items-center justify-end">
                                                <button
                                                    onClick={() => handleCancelEnhancement(fileId, file.name)}
                                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-white/5 hover:bg-red-500/20 border border-white/10 hover:border-red-500/30 text-text-subtle hover:text-red-400 transition-all duration-300"
                                                    title="Cancel enhancement"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    <span>Cancel</span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {/* === SECTION 4: READY TO ENHANCE (Not yet enhanced) === */}
                {!loading && notEnhancedFiles.length > 0 && (() => {
                    // Calculate total chunks for header
                    const totalChunksToEnhance = notEnhancedFiles.reduce((sum, file) => {
                        const fileId = file.fileId || file.id;
                        const progress = enhancementProgress.get(fileId);
                        return sum + (file.totalChunks || progress?.totalChunks || 0);
                    }, 0);

                    return (
                        <div className="space-y-6">
                            {/* Header */}
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/30 shadow-lg shadow-blue-500/10">
                                        <Sparkles className="w-5 h-5 text-blue-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-white">Ready to Enhance</h2>
                                        <p className="text-sm text-text-subtle">{notEnhancedFiles.length} file{notEnhancedFiles.length !== 1 ? 's' : ''} ready for AI enhancement</p>
                                    </div>
                                </div>
                                {totalChunksToEnhance > 0 && (
                                    <div className="flex items-center gap-4">
                                        {selectedFiles.size > 0 && (
                                            <button
                                                onClick={handleBatchEnhance}
                                                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white font-semibold text-sm shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
                                            >
                                                <Sparkles className="w-4 h-4" />
                                                Enhance Selected ({selectedFiles.size})
                                            </button>
                                        )}
                                        <div className="px-5 py-3 bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-2xl">
                                            <div className="text-xs text-text-subtle uppercase tracking-wider">Total Chunks</div>
                                            <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">{totalChunksToEnhance}</div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Full-width modern table layout */}
                            <div className="w-full bg-surface-highlight/20 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                                {/* Table Header */}
                                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-white/[0.02] border-b border-white/5 text-xs font-semibold text-text-subtle uppercase tracking-wider items-center">
                                    <div className="col-span-5 flex items-center gap-4">
                                        <div className="flex items-center justify-center">
                                            <input
                                                type="checkbox"
                                                checked={notEnhancedFiles.length > 0 && selectedFiles.size === notEnhancedFiles.length}
                                                onChange={toggleSelectAll}
                                                className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50 cursor-pointer"
                                            />
                                        </div>
                                        <span>Document</span>
                                    </div>
                                    <div className="col-span-2 text-center">Chunks</div>
                                    <div className="col-span-2 text-center">Size</div>
                                    <div className="col-span-3 text-right">Action</div>
                                </div>

                                {/* Table Body */}
                                <div className="divide-y divide-white/5">
                                    {notEnhancedFiles.map((file) => {
                                        const FileIcon = getFileIcon(file.type);
                                        const isEnhancing = enhancingFiles.has(file.id);
                                        const fileId = file.fileId || file.id;
                                        const progress = enhancementProgress.get(fileId);
                                        const chunkCount = file.totalChunks || progress?.totalChunks || 0;
                                        const isSelected = selectedFiles.has(file.id);

                                        return (
                                            <div
                                                key={file.id}
                                                className={`grid grid-cols-12 gap-4 px-6 py-5 items-center group hover:bg-white/[0.02] transition-all duration-300 ${isSelected ? 'bg-blue-500/[0.05]' : ''}`}
                                            >
                                                {/* Document Info */}
                                                <div className="col-span-5 flex items-center gap-4">
                                                    <div className="flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
                                                        <input
                                                            type="checkbox"
                                                            checked={isSelected}
                                                            onChange={() => toggleFileSelection(file.id)}
                                                            className="w-4 h-4 rounded border-white/20 bg-white/5 text-blue-500 focus:ring-blue-500/50 cursor-pointer hover:border-blue-500/50 transition-colors"
                                                            disabled={isEnhancing}
                                                        />
                                                    </div>
                                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-blue-500/20 shrink-0 group-hover:border-blue-500/40 group-hover:shadow-lg group-hover:shadow-blue-500/10 transition-all duration-300">
                                                        <FileIcon className="w-6 h-6 text-blue-400" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <h3 className="font-semibold text-white truncate group-hover:text-blue-200 transition-colors" title={file.name}>
                                                            {file.name}
                                                        </h3>
                                                        <div className="flex items-center gap-2 mt-1">

                                                            <span className="text-xs text-text-subtle">{file.type}</span>
                                                            <span className="text-text-subtle/50">•</span>
                                                            <span className="text-xs text-text-subtle">{new Date(file.updated || file.added).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Chunk Count */}
                                                <div className="col-span-2 text-center">
                                                    <div className="inline-flex items-center justify-center px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                                                        {loadingStats ? (
                                                            <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                                                        ) : (
                                                            <span className="text-lg font-bold text-blue-400">
                                                                {chunkCount > 0 ? chunkCount : '—'}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Size */}
                                                <div className="col-span-2 text-center">
                                                    <span className="text-sm text-text-subtle">{file.size}</span>
                                                </div>

                                                {/* Action */}
                                                <div className="col-span-3 flex items-center justify-end">
                                                    <button
                                                        onClick={() => handleEnhanceFile(file)}
                                                        disabled={isEnhancing || loadingStats || chunkCount === 0}
                                                        className="flex items-center gap-2.5 px-5 py-2.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-400 hover:to-purple-400 text-white shadow-lg shadow-blue-500/20 hover:shadow-blue-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                                                    >
                                                        {isEnhancing ? (
                                                            <>
                                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                                <span>Processing...</span>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Zap className="w-4 h-4" />
                                                                <span>{chunkCount > 0 ? 'Enhance' : 'No chunks'}</span>
                                                            </>
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    );
                })()}

                {/* === SECTION 2: COMING SOON (Processing/Pending) === */}
                {!loading && processingFiles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                                <Clock className="w-4 h-4 text-amber-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Coming Soon</h2>
                                <p className="text-xs text-text-subtle">{processingFiles.length} file{processingFiles.length !== 1 ? 's' : ''} being processed — will be available for enhancement shortly</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {processingFiles.map((file) => {
                                const FileIcon = getFileIcon(file.type);
                                const isPending = file.status === 'pending';

                                return (
                                    <div
                                        key={file.id}
                                        className="relative bg-surface-highlight/20 backdrop-blur-sm border border-amber-500/10 rounded-2xl p-5 opacity-80"
                                    >
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center border border-amber-500/20 shrink-0">
                                                <FileIcon className="w-6 h-6 text-amber-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white/80 truncate" title={file.name}>
                                                    {file.name}
                                                </h3>
                                                <p className="text-xs text-text-subtle mt-0.5">{file.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-text-subtle mb-4">
                                            <span>{file.size}</span>
                                            <span>•</span>
                                            <span>{new Date(file.updated || file.added).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium ${isPending ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                                {isPending ? (
                                                    <>
                                                        <Clock className="w-3 h-3" />
                                                        Pending
                                                    </>
                                                ) : (
                                                    <>
                                                        <Loader2 className="w-3 h-3 animate-spin" />
                                                        Processing
                                                    </>
                                                )}
                                            </span>
                                            <span className="text-xs text-text-subtle/60">Enhancement unavailable</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* === SECTION 3: STRUCTURED DATA (Cannot be enhanced) === */}
                {!loading && tabularFiles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Structured Data</h2>
                                <p className="text-xs text-text-subtle">{tabularFiles.length} tabular file{tabularFiles.length !== 1 ? 's' : ''} — AI enhancement is not available for structured data</p>
                            </div>
                        </div>

                        {/* Info banner */}
                        <div className="relative overflow-hidden bg-gradient-to-r from-cyan-500/5 via-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 rounded-2xl p-5">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            <div className="relative flex items-start gap-4">
                                <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center border border-cyan-500/30 shrink-0">
                                    <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
                                </div>
                                <div>
                                    <h3 className="text-sm font-semibold text-white mb-1">Why can't structured data be enhanced?</h3>
                                    <p className="text-xs text-text-subtle leading-relaxed">
                                        CSV, Excel, and other tabular files contain structured data that is already optimized for retrieval.
                                        AI contextual enhancement is designed for unstructured text documents like PDFs, Word files, and text files
                                        where adding context improves search accuracy.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {tabularFiles.map((file) => {
                                const FileIcon = getFileIcon(file.type);

                                return (
                                    <div
                                        key={file.id}
                                        className="relative bg-surface-highlight/20 backdrop-blur-sm border border-cyan-500/20 rounded-2xl p-5"
                                    >
                                        {/* Subtle pattern overlay */}
                                        <div className="absolute inset-0 rounded-2xl opacity-[0.03] bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,currentColor_10px,currentColor_11px)]" />

                                        <div className="relative">
                                            <div className="flex items-start gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-teal-500/20 flex items-center justify-center border border-cyan-500/20 shrink-0">
                                                    <FileIcon className="w-6 h-6 text-cyan-400" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h3 className="font-semibold text-white/90 truncate" title={file.name}>
                                                        {file.name}
                                                    </h3>
                                                    <p className="text-xs text-text-subtle mt-0.5">{file.type}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4 text-xs text-text-subtle mb-4">
                                                <span>{file.size}</span>
                                                <span>•</span>
                                                <span>{new Date(file.updated || file.added).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                                                    <CheckCircle2 className="w-3 h-3" />
                                                    Indexed
                                                </span>
                                                <span className="text-xs text-cyan-400/60">Enhancement not needed</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* === SECTION 4: FAILED INGESTION === */}
                {!loading && errorFiles.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                                <AlertCircle className="w-4 h-4 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Failed Ingestion</h2>
                                <p className="text-xs text-text-subtle">{errorFiles.length} file{errorFiles.length !== 1 ? 's' : ''} could not be ingested — use Documents page to re-ingest</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {errorFiles.map((file) => {
                                const FileIcon = getFileIcon(file.type);

                                return (
                                    <div
                                        key={file.id}
                                        className="relative bg-surface-highlight/20 backdrop-blur-sm border border-red-500/20 rounded-2xl p-5 opacity-70"
                                    >
                                        <div className="flex items-start gap-3 mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-red-500/20 to-red-600/20 flex items-center justify-center border border-red-500/20 shrink-0">
                                                <FileIcon className="w-6 h-6 text-red-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-semibold text-white/70 truncate" title={file.name}>
                                                    {file.name}
                                                </h3>
                                                <p className="text-xs text-text-subtle mt-0.5">{file.type}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-text-subtle mb-4">
                                            <span>{file.size}</span>
                                            <span>•</span>
                                            <span>{new Date(file.updated || file.added).toLocaleDateString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                                                <AlertCircle className="w-3 h-3" />
                                                Error
                                            </span>
                                            <span className="text-xs text-red-400/60">Cannot enhance</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotebookAIEnhancer;
