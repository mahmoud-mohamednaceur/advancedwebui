import React from 'react';
import { Server, HardDrive, Cpu, Activity, Wifi, Box } from 'lucide-react';
import { DockerMetrics } from '../../types/monitoring';

interface ContainersPageProps {
    docker?: DockerMetrics;
}

const ContainersPage: React.FC<ContainersPageProps> = ({ docker }) => {
    const containers = docker?.containers || [];
    const images = docker?.images || [];

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Stats Overview */}
            <div className="grid grid-cols-4 gap-3">
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                            <Server className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{docker?.totalContainers || 0}</div>
                            <div className="text-xs text-text-subtle">Containers</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                            <Box className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{docker?.totalImages || 0}</div>
                            <div className="text-xs text-text-subtle">Images</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                            <HardDrive className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-white">{docker?.totalImageSize || '--'}</div>
                            <div className="text-xs text-text-subtle">Total Image Size</div>
                        </div>
                    </div>
                </div>
                <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                            <Activity className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-2xl font-bold text-emerald-400">
                                {containers.filter(c => c.status === 'running').length}
                            </div>
                            <div className="text-xs text-text-subtle">Running</div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Containers Table */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Server className="w-4 h-4 text-cyan-400" />
                    Running Containers
                </h3>
                {containers.length > 0 ? (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-white/10 text-text-subtle">
                                    <th className="pb-3 text-left font-medium">Container</th>
                                    <th className="pb-3 text-left font-medium">Status</th>
                                    <th className="pb-3 text-right font-medium">CPU</th>
                                    <th className="pb-3 text-right font-medium">Memory</th>
                                    <th className="pb-3 text-right font-medium">Mem %</th>
                                    <th className="pb-3 text-right font-medium">Net I/O</th>
                                    <th className="pb-3 text-right font-medium">Block I/O</th>
                                    <th className="pb-3 text-right font-medium">PIDs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {containers.map((container, i) => (
                                    <tr key={i} className="hover:bg-white/5 transition-colors">
                                        <td className="py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                <span className="text-white font-medium">{container.name}</span>
                                            </div>
                                        </td>
                                        <td className="py-3">
                                            <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-500/20 text-emerald-400">
                                                {container.status}
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className={`font-mono ${parseFloat(container.cpu) > 50 ? 'text-yellow-400' : 'text-cyan-400'
                                                }`}>
                                                {container.cpu}%
                                            </span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-purple-400 font-mono">{container.memUsage}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-white font-mono">{container.memPercent}%</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-text-subtle font-mono text-xs">{container.netIO}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-text-subtle font-mono text-xs">{container.blockIO}</span>
                                        </td>
                                        <td className="py-3 text-right">
                                            <span className="text-white">{container.pids}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <div className="text-center py-8 text-text-subtle">Waiting for container data...</div>
                )}
            </div>

            {/* Docker Images */}
            <div className="bg-[#0A0A0F]/60 backdrop-blur-xl border border-white/10 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
                    <span className="flex items-center gap-2">
                        <Box className="w-4 h-4 text-purple-400" />
                        Docker Images ({docker?.totalImages || 0})
                    </span>
                    <span className="text-xs font-normal text-purple-400">
                        Total: {docker?.totalImageSize || '--'}
                    </span>
                </h3>
                {images.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
                        {images.map((img, i) => (
                            <div
                                key={i}
                                className="bg-white/5 hover:bg-white/10 rounded-lg p-3 flex justify-between items-center transition-colors border border-white/5"
                            >
                                <span className="text-white text-sm truncate max-w-[200px]" title={img.name}>
                                    {img.name}
                                </span>
                                <span className="text-purple-400 font-mono text-sm shrink-0 ml-2">
                                    {img.size}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-6 text-text-subtle">Waiting for image data...</div>
                )}
            </div>
        </div>
    );
};

export default ContainersPage;
