import React, { useState, useEffect, useRef } from 'react';
import { Zap, Activity, Database, Cpu, Clock, AlertTriangle, CheckCircle, RefreshCw, MessageSquare, FileText, Search, Settings, Edit2, Save, X, Camera, ImageIcon, ExternalLink, Sparkles, Loader2, Server, HardDrive } from 'lucide-react';
import { WorkspacePage } from '../../config';
import Button from '../ui/Button';
import { useUser } from '@clerk/clerk-react';
import { hasPagePermission } from '../../utils/admin';
import { logger } from '../../utils/logger';

// Constants
const UPDATE_NOTEBOOK_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-update-notebook-information';
const NOTEBOOK_DETAILS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-get-notebook-details-information';
const ORCHESTRATOR_ID = '301f7482-1430-466d-9721-396564618751';
const WS_URL = 'ws://localhost:3001/ws/logs';

interface NotebookDashboardProps {
    notebookId: string;
    notebookName: string;
    notebookDescription: string;
    onNavigate: (page: WorkspacePage) => void;
}

const ActionCard = ({
    icon: Icon,
    title,
    description,
    colorClass,
    bgGradient,
    onClick,
    delay
}: {
    icon: any,
    title: string,
    description: string,
    colorClass: string,
    bgGradient: string,
    onClick: () => void,
    delay: string
}) => (
    <div
        onClick={onClick}
        className="group relative h-[240px] bg-surface/40 backdrop-blur-md border border-white/5 rounded-[2rem] p-8 flex flex-col justify-between cursor-pointer transition-all duration-500 hover:-translate-y-2 hover:border-white/10 overflow-hidden animate-fade-in-up shadow-lg hover:shadow-2xl"
        style={{ animationDelay: delay }}
    >
        {/* Background Gradient Orb - Spotlight Effect */}
        <div className={`absolute -top-20 -right-20 w-[300px] h-[300px] opacity-0 group-hover:opacity-20 blur-[80px] transition-opacity duration-700 rounded-full pointer-events-none ${bgGradient}`}></div>

        {/* Content Z-Index Wrapper */}
        <div className="relative z-10 flex flex-col h-full">
            <div className="flex justify-between items-start mb-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center bg-white/5 border border-white/5 group-hover:scale-110 transition-transform duration-500 shadow-lg`}>
                    <Icon className={`w-6 h-6 ${colorClass} drop-shadow-md`} />
                </div>
                <div className={`w-8 h-8 rounded-full bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 -translate-x-2 group-hover:translate-x-0`}>
                    <ExternalLink className="w-4 h-4 text-white" />
                </div>
            </div>

            <div className="mt-auto">
                <h3 className="text-2xl font-display font-bold text-white mb-2 tracking-tight group-hover:translate-x-1 transition-transform duration-300">{title}</h3>
                <p className="text-text-subtle text-sm leading-relaxed font-medium max-w-[90%] opacity-70 group-hover:opacity-100 transition-opacity">{description}</p>
            </div>
        </div>
    </div>
);

const MonitoringCard = ({ title, icon: Icon, children, className = "" }: { title: string, icon: any, children: React.ReactNode, className?: string }) => (
    <div className={`bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-6 ${className}`}>
        <div className="flex items-center gap-2 mb-4">
            <Icon className="w-5 h-5 text-primary" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">{title}</h3>
        </div>
        {children}
    </div>
);

const StatRow = ({ label, value, subtext }: { label: string, value: string | number, subtext?: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-white/5 last:border-0">
        <span className="text-text-subtle text-sm">{label}</span>
        <div className="text-right">
            <div className="text-white font-mono font-medium">{value}</div>
            {subtext && <div className="text-[10px] text-text-subtle/70">{subtext}</div>}
        </div>
    </div>
);

const NotebookDashboard: React.FC<NotebookDashboardProps> = ({ notebookId, notebookName, notebookDescription, onNavigate }) => {
    const { user } = useUser();
    // Local state for the "General Configuration" features directly on dashboard
    const [isEditing, setIsEditing] = useState(false);
    const [name, setName] = useState(notebookName);
    const [description, setDescription] = useState(notebookDescription || "Manage documents, interact with the RAG agent, and tune retrieval parameters.");
    const [coverImage, setCoverImage] = useState<string | null>(null);
    const [coverImageBase64, setCoverImageBase64] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Monitoring State
    const [monitoringData, setMonitoringData] = useState<any>(null);
    const [isMonitoring, setIsMonitoring] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    // Real data state (Webhooks)
    const [status, setStatus] = useState<'checking' | 'online' | 'syncing' | 'error'>('checking');
    const [lastActivity, setLastActivity] = useState<string>('Checking...');
    const [docCount, setDocCount] = useState<number | null>(null);

    // WebSocket Effect
    useEffect(() => {
        let reconnectTimer: any;

        const connect = () => {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                logger.debug('Connected to monitoring WS');
                setIsMonitoring(true);
                ws.send(JSON.stringify({ action: 'start_monitoring' }));
            };

            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'metrics') {
                        setMonitoringData(data.data);
                    }
                } catch (e) {
                    logger.error('Failed to parse WS message', e);
                }
            };

            ws.onclose = () => {
                logger.debug('Monitoring WS disconnected');
                setIsMonitoring(false);
                reconnectTimer = setTimeout(connect, 3000);
            };

            ws.onerror = (e) => {
                logger.error('WS Error', e);
                ws.close();
            };
        };

        connect();

        return () => {
            if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
                wsRef.current.send(JSON.stringify({ action: 'stop_monitoring' }));
                wsRef.current.close();
            }
            clearTimeout(reconnectTimer);
        };
    }, []);

    // Poll for status (Webhook)
    useEffect(() => {
        let isMounted = true;
        const fetchStatus = async () => {
            try {
                const response = await fetch(NOTEBOOK_DETAILS_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ notebook_id: notebookId, orchestrator_id: ORCHESTRATOR_ID })
                });

                if (response.ok && isMounted) {
                    const raw = await response.json();
                    let data = Array.isArray(raw) ? raw[0] : raw;
                    if (data.json) data = data.json;

                    setDocCount(data.total_files || 0);

                    // Determine Status
                    const pending = data.pending_count || 0;
                    const processing = data.processing_count || 0;
                    const errors = data.error_count || 0;
                    const isFinished = data.is_finished;

                    if (processing > 0 || pending > 0 || isFinished === false) {
                        setStatus('syncing');
                    } else if (errors > 0 && (data.success_count || 0) === 0) {
                        setStatus('error');
                    } else {
                        setStatus('online');
                    }

                    // Determine Last Activity
                    if (data.updated_at) {
                        const lastUpdate = new Date(data.updated_at);
                        if (!isNaN(lastUpdate.getTime())) {
                            const now = new Date();
                            const diffMs = now.getTime() - lastUpdate.getTime();
                            const diffMins = Math.floor(diffMs / 60000);
                            const diffHours = Math.floor(diffMins / 60);
                            const diffDays = Math.floor(diffHours / 24);

                            if (diffMins < 1) setLastActivity('Just now');
                            else if (diffMins < 60) setLastActivity(`${diffMins} mins ago`);
                            else if (diffHours < 24) setLastActivity(`${diffHours} hours ago`);
                            else setLastActivity(`${diffDays} days ago`);
                        }
                    }
                }
            } catch (e) {
                logger.error("Failed to fetch dashboard stats", e);
                if (isMounted) setStatus('error');
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [notebookId]);


    const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const url = URL.createObjectURL(file);
            setCoverImage(url);
            const reader = new FileReader();
            reader.onloadend = () => setCoverImageBase64(reader.result as string);
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const payload = {
                notebook_id: notebookId,
                orchestrator_id: ORCHESTRATOR_ID,
                notebook_title: name,
                notebook_description: description,
                ...(coverImageBase64 ? { image: coverImageBase64 } : {})
            };
            const response = await fetch(UPDATE_NOTEBOOK_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!response.ok) throw new Error(`Server error`);
            setIsEditing(false);
        } catch (error) {
            logger.error("Failed to update notebook", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-transparent relative">

            {/* Hero Header */}
            <div className="relative w-full min-h-[320px] md:min-h-[380px] flex flex-col justify-end p-8 md:p-12 group">
                <div className="absolute inset-0 z-0 overflow-hidden">
                    {coverImage ? (
                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    ) : (
                        <div className="w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#1e1b4b] via-[#0f172a] to-[#020617]">
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#050508] via-[#050508]/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-gradient-to-r from-[#050508]/80 via-transparent to-transparent"></div>
                </div>

                <div className={`absolute top-6 right-6 z-20 transition-opacity duration-300 ${isEditing || !coverImage ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
                    <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-xl bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 hover:border-white/30 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-lg">
                        <Camera className="w-4 h-4" />
                        <span>{coverImage ? 'Change Cover' : 'Add Cover'}</span>
                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                    </label>
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col md:flex-row items-end justify-between gap-6 animate-fade-in-up">
                    <div className="flex-1 w-full">
                        <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-text-subtle font-mono mb-4 uppercase tracking-wider shadow-sm backdrop-blur-md">
                            <Database className="w-3 h-3" />
                            <span>ID: {notebookId}</span>
                            <span className="w-px h-3 bg-white/10"></span>
                            {status === 'checking' && <span className="flex items-center gap-1.5 text-text-subtle"><Loader2 className="w-3 h-3 animate-spin" />Checking...</span>}
                            {status === 'online' && <div className="flex items-center gap-1.5"><span className="relative flex h-2 w-2"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span></span><span className="text-emerald-400 font-bold">Online</span></div>}
                            {status === 'syncing' && <div className="flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin text-blue-400" /><span className="text-blue-400 font-bold">Syncing</span></div>}
                            {status === 'error' && <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500"></span><span className="text-red-400 font-bold">Error</span></div>}
                        </div>

                        {isEditing ? (
                            <div className="space-y-4 w-full max-w-2xl bg-black/40 backdrop-blur-xl p-6 rounded-2xl border border-white/10 shadow-2xl">
                                <div>
                                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider mb-1 block">Notebook Name</label>
                                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-2xl md:text-3xl font-bold text-white focus:border-primary/50 focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-text-subtle uppercase tracking-wider mb-1 block">Description</label>
                                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:border-primary/50 focus:outline-none resize-none h-20" />
                                </div>
                                <div className="flex gap-3 pt-2">
                                    <Button variant="primary" onClick={handleSave} disabled={isSaving} className="!h-9 !px-4 !text-xs">{isSaving ? <Loader2 className="w-3 h-3 mr-2 animate-spin" /> : <Save className="w-3 h-3 mr-2" />}{isSaving ? 'Saving...' : 'Save'}</Button>
                                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={isSaving} className="!h-9 !px-4 !text-xs border-white/10 hover:bg-white/5 text-white"><X className="w-3 h-3 mr-2" /> Cancel</Button>
                                </div>
                            </div>
                        ) : (
                            <div className="group/text">
                                <h1 className="text-5xl md:text-6xl font-display font-bold text-white tracking-tight leading-tight mb-4 drop-shadow-xl flex items-center gap-4">{name}<button onClick={() => setIsEditing(true)} className="opacity-0 group-hover/text:opacity-100 p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all"><Edit2 className="w-5 h-5" /></button></h1>
                                <p className="text-lg md:text-xl text-text-subtle max-w-2xl font-light leading-relaxed drop-shadow-md">{description}</p>
                            </div>
                        )}
                    </div>

                    {!isEditing && (
                        <div className="hidden md:block bg-surface/30 backdrop-blur-md border border-white/10 rounded-2xl p-5 shadow-xl min-w-[200px]">
                            <div className="text-[10px] text-text-subtle font-bold uppercase tracking-widest mb-2 flex items-center gap-2"><Activity className="w-3 h-3 text-primary" />Last Activity</div>
                            <div className="text-2xl font-bold text-white font-mono">{lastActivity}</div>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-8 md:p-12 pt-4 relative">
                <div className="absolute top-0 left-8 w-px h-12 bg-gradient-to-b from-white/20 to-transparent"></div>
                <div className="max-w-7xl mx-auto w-full space-y-12">

                    {/* Action Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
                        {hasPagePermission(user, 'chat', notebookId) && <ActionCard icon={MessageSquare} title="Chat Interface" description="Interactive RAG agent with citation tracking." colorClass="text-primary" bgGradient="bg-primary" onClick={() => onNavigate('chat')} delay="0.1s" />}
                        {hasPagePermission(user, 'documents', notebookId) && <ActionCard icon={FileText} title="Document Manager" description="Sync sources from SharePoint or local files." colorClass="text-secondary" bgGradient="bg-secondary" onClick={() => onNavigate('documents')} delay="0.2s" />}
                        {hasPagePermission(user, 'search', notebookId) && <ActionCard icon={Search} title="Search Playground" description="Debug vector similarity and keyword ranking." colorClass="text-tertiary" bgGradient="bg-tertiary" onClick={() => onNavigate('search')} delay="0.3s" />}
                        {hasPagePermission(user, 'settings', notebookId) && <ActionCard icon={Settings} title="Configuration" description="System prompts, retrieval weights, and model parameters." colorClass="text-purple-400" bgGradient="bg-purple-500" onClick={() => onNavigate('settings')} delay="0.4s" />}
                    </div>

                    {/* Infrastructure Monitoring Section */}
                    {hasPagePermission(user, 'settings', notebookId) && (
                        <div className="animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-px bg-white/10 flex-1"></div>
                                <h2 className="text-xs font-bold text-text-subtle uppercase tracking-widest flex items-center gap-2">
                                    <Server className="w-3 h-3" /> System Infrastructure
                                </h2>
                                <div className="h-px bg-white/10 flex-1"></div>
                            </div>

                            {monitoringData ? (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Queue Details */}
                                    <MonitoringCard title="Redis Queue" icon={Database}>
                                        {monitoringData.n8n ? (
                                            <div className="space-y-4">
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-white/5 rounded-lg p-3 text-center">
                                                        <div className="text-xs text-text-subtle mb-1">Queue Length</div>
                                                        <div className="text-2xl font-bold text-blue-400">{monitoringData.n8n.queueLength}</div>
                                                    </div>
                                                    <div className="bg-white/5 rounded-lg p-3 text-center">
                                                        <div className="text-xs text-text-subtle mb-1">Throughput</div>
                                                        <div className="text-xl font-bold text-emerald-400">{monitoringData.n8n.metrics?.throughput} <span className="text-[10px]">/min</span></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs mb-1"><span>Waiting</span> <span>{monitoringData.n8n.waiting}</span></div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-yellow-500/50" style={{ width: `${Math.min(100, (monitoringData.n8n.waiting / (monitoringData.n8n.queueLength || 1)) * 100)}%` }}></div></div>

                                                    <div className="flex justify-between text-xs mb-1 pt-2"><span>Active</span> <span>{monitoringData.n8n.active}</span></div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-emerald-500/50" style={{ width: `${Math.min(100, (monitoringData.n8n.active / (monitoringData.n8n.queueLength || 1)) * 100)}%` }}></div></div>

                                                    <div className="flex justify-between text-xs mb-1 pt-2"><span>Failed (1h)</span> <span className="text-red-400">{monitoringData.n8n.failed}</span></div>
                                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden"><div className="h-full bg-red-500/50" style={{ width: `${Math.min(100, (monitoringData.n8n.failed / 50) * 100)}%` }}></div></div>
                                                </div>
                                            </div>
                                        ) : <div className="text-xs text-text-subtle">No Queue Data</div>}
                                    </MonitoringCard>

                                    {/* Redis Stats */}
                                    <MonitoringCard title="Redis Performance" icon={Zap}>
                                        {monitoringData.redis ? (
                                            <div className="space-y-0 text-sm">
                                                <StatRow label="Memory Used" value={monitoringData.redis.memory?.used || 'N/A'} subtext={`Peak: ${monitoringData.redis.memory?.peak || 'N/A'}`} />
                                                <StatRow label="Ops / Sec" value={monitoringData.redis.performance?.opsPerSec || 0} />
                                                <StatRow label="Hit Rate" value={`${monitoringData.redis.performance?.hitRate || 0}%`} />
                                                <StatRow label="Clients" value={monitoringData.redis.performance?.connectedClients || 0} />
                                                <StatRow label="Frag Ratio" value={monitoringData.redis.memory?.fragmentation || 0} />
                                            </div>
                                        ) : <div className="text-xs text-text-subtle">Redis Unreachable</div>}
                                    </MonitoringCard>

                                    {/* Worker Pool */}
                                    <MonitoringCard title={`Worker Pool (${monitoringData.workers?.count || 0})`} icon={Cpu} className="md:col-span-1">
                                        {monitoringData.workers?.workers ? (
                                            <div className="space-y-3 max-h-[220px] overflow-y-auto custom-scrollbar pr-2">
                                                {monitoringData.workers.workers.map((worker: any, i: number) => (
                                                    <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5">
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className="text-xs font-bold text-white truncate max-w-[100px]">{worker.name.replace('advanced-local-rag-app-', '').replace('n8n-', '')}</span>
                                                            <span className="text-[10px] text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-500/20">{worker.status}</span>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-2 text-xs text-text-subtle">
                                                            <div>CPU: <span className="text-white">{worker.cpu}%</span></div>
                                                            <div>Mem: <span className="text-white">{worker.memoryPercent}%</span></div>
                                                            <div className="col-span-2 text-[10px] opacity-70">Uptime: {worker.uptime}</div>
                                                        </div>
                                                    </div>
                                                ))}
                                                {monitoringData.workers.workers.length === 0 && (
                                                    <div className="text-center text-text-subtle text-xs py-4">No active workers found</div>
                                                )}
                                            </div>
                                        ) : <div className="text-xs text-text-subtle">No Worker Data</div>}
                                    </MonitoringCard>

                                    {/* Current Jobs (Wide) */}
                                    <div className="md:col-span-3 bg-black/20 backdrop-blur-md border border-white/5 rounded-2xl p-6">
                                        <div className="flex items-center gap-2 mb-4">
                                            <Clock className="w-5 h-5 text-secondary" />
                                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">Active Jobs</h3>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-left text-xs">
                                                <thead>
                                                    <tr className="text-text-subtle border-b border-white/10">
                                                        <th className="pb-2 font-medium">Job ID</th>
                                                        <th className="pb-2 font-medium">Mode</th>
                                                        <th className="pb-2 font-medium">Status</th>
                                                        <th className="pb-2 font-medium">Started At</th>
                                                        <th className="pb-2 font-medium">Retry Of</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-white/5">
                                                    {monitoringData.n8n?.currentJobs && monitoringData.n8n.currentJobs.length > 0 ? (
                                                        monitoringData.n8n.currentJobs.map((job: any) => (
                                                            <tr key={job.id} className="group hover:bg-white/5 transition-colors">
                                                                <td className="py-2.5 font-mono text-white">{job.id}</td>
                                                                <td className="py-2.5 text-text-subtle">{job.mode}</td>
                                                                <td className="py-2.5"><span className="text-blue-400">{job.status}</span></td>
                                                                <td className="py-2.5 text-text-subtle">{new Date(job.startedAt).toLocaleString()}</td>
                                                                <td className="py-2.5 text-text-subtle">{job.retry}</td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan={5} className="py-4 text-center text-text-subtle italic">No active jobs running</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="h-32 flex items-center justify-center border border-white/5 rounded-2xl bg-white/5 bg-striped animate-pulse">
                                    <div className="text-text-subtle flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        Connecting to infrastructure...
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NotebookDashboard;
