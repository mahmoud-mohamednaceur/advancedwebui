import React from 'react';
import { Workflow, Clock, CheckCircle2, AlertTriangle, TrendingUp, Activity, Timer, Zap } from 'lucide-react';
import { ServerMetrics } from '../../types/monitoring';

interface WorkflowsPageProps {
    metrics: ServerMetrics | null;
}

const WorkflowsPage: React.FC<WorkflowsPageProps> = ({ metrics }) => {
    const n8n = metrics?.n8n;
    const queues = metrics?.redisQueues?.queues;

    // Calculate success rate from queue stats
    const completed = queues?.completed || 0;
    const failed = queues?.failed || 0;
    const total = completed + failed;
    const successRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '100';

    // Sample execution data (in real implementation, this would come from backend)
    const recentExecutions = [
        { id: '1', workflow: 'Invoice Processing', status: 'success', duration: '2.3s', startedAt: '5 min ago' },
        { id: '2', workflow: 'Email Automation', status: 'success', duration: '1.1s', startedAt: '8 min ago' },
        { id: '3', workflow: 'Data Sync', status: 'running', duration: '45s...', startedAt: '1 min ago' },
        { id: '4', workflow: 'Report Generator', status: 'error', duration: '5.2s', startedAt: '15 min ago' },
        { id: '5', workflow: 'Customer Import', status: 'success', duration: '12.5s', startedAt: '22 min ago' },
        { id: '6', workflow: 'Webhook Handler', status: 'success', duration: '0.3s', startedAt: '25 min ago' },
        { id: '7', workflow: 'Backup Job', status: 'success', duration: '45.2s', startedAt: '1 hour ago' },
    ];

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'success': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case 'error': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'running': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success': return <CheckCircle2 className="w-4 h-4" />;
            case 'error': return <AlertTriangle className="w-4 h-4" />;
            case 'running': return <Activity className="w-4 h-4 animate-pulse" />;
            default: return <Clock className="w-4 h-4" />;
        }
    };

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <Zap className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-blue-400">{n8n?.active || queues?.active || 0}</div>
                            <div className="text-xs text-text-subtle">Running Now</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-400">{completed}</div>
                            <div className="text-xs text-text-subtle">Completed</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                            <AlertTriangle className="w-5 h-5 text-red-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-red-400">{failed}</div>
                            <div className="text-xs text-text-subtle">Failed</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-purple-400">{successRate}%</div>
                            <div className="text-xs text-text-subtle">Success Rate</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Queue Summary */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-cyan-400" />
                    Queue Summary
                </h3>
                <div className="grid grid-cols-6 gap-3">
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-yellow-400">{queues?.waiting || 0}</div>
                        <div className="text-xs text-text-subtle">Waiting</div>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-blue-400">{queues?.active || 0}</div>
                        <div className="text-xs text-text-subtle">Active</div>
                    </div>
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-emerald-400">{completed}</div>
                        <div className="text-xs text-text-subtle">Done</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-red-400">{failed}</div>
                        <div className="text-xs text-text-subtle">Failed</div>
                    </div>
                    <div className="bg-purple-500/10 border border-purple-500/20 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-purple-400">{queues?.delayed || 0}</div>
                        <div className="text-xs text-text-subtle">Delayed</div>
                    </div>
                    <div className="bg-gray-500/10 border border-gray-500/20 rounded-lg p-3 text-center">
                        <div className="text-xl font-bold text-gray-400">{queues?.total || 0}</div>
                        <div className="text-xs text-text-subtle">Total</div>
                    </div>
                </div>
            </div>

            {/* Recent Executions Table */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Workflow className="w-4 h-4 text-purple-400" />
                    Recent Executions
                </h3>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b border-white/10 text-text-subtle">
                                <th className="pb-3 text-left font-medium">Workflow</th>
                                <th className="pb-3 text-left font-medium">Status</th>
                                <th className="pb-3 text-right font-medium">Duration</th>
                                <th className="pb-3 text-right font-medium">Started</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {recentExecutions.map((exec) => (
                                <tr key={exec.id} className="hover:bg-white/5 transition-colors">
                                    <td className="py-3">
                                        <div className="flex items-center gap-2">
                                            <Workflow className="w-4 h-4 text-purple-400" />
                                            <span className="text-white font-medium">{exec.workflow}</span>
                                        </div>
                                    </td>
                                    <td className="py-3">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border ${getStatusColor(exec.status)}`}>
                                            {getStatusIcon(exec.status)}
                                            {exec.status}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right">
                                        <span className="flex items-center justify-end gap-1 text-text-subtle">
                                            <Timer className="w-3 h-3" />
                                            {exec.duration}
                                        </span>
                                    </td>
                                    <td className="py-3 text-right text-text-subtle">{exec.startedAt}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Performance Stats */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-emerald-400" />
                        Performance Metrics
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Success Rate</span>
                            <span className="text-emerald-400 font-bold">{successRate}%</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Avg Duration</span>
                            <span className="text-white font-bold">~3.2s</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Throughput</span>
                            <span className="text-cyan-400 font-bold">~12/hour</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Workers Active</span>
                            <span className="text-white font-bold">{n8n?.workers || 0}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                    <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-400" />
                        Queue Health
                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Queue Depth</span>
                            <span className={`font-bold ${(queues?.waiting || 0) > 10 ? 'text-yellow-400' : 'text-emerald-400'}`}>
                                {queues?.waiting || 0} waiting
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Processing</span>
                            <span className="text-blue-400 font-bold">{queues?.active || 0} active</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Failed Rate</span>
                            <span className={`font-bold ${failed > 5 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {total > 0 ? ((failed / total) * 100).toFixed(1) : '0'}%
                            </span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-lg">
                            <span className="text-text-subtle">Status</span>
                            <span className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                                <span className="text-emerald-400 font-bold">Healthy</span>
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WorkflowsPage;
