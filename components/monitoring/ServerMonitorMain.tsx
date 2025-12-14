import React, { useState } from 'react';
import { Activity, Server, Database, HardDrive, Cpu, FileText, Workflow, RefreshCw } from 'lucide-react';
import { useServerMetrics } from '../../hooks/useServerMetrics';
import { ServerSubPage } from '../../types/monitoring';
import OverviewPage from './OverviewPage';
import ContainersPage from './ContainersPage';
import PostgresPage from './PostgresPage';
import RedisPage from './RedisPage';
import SystemPage from './SystemPage';
import LogsPage from './LogsPage';
import WorkflowsPage from './WorkflowsPage';

const tabs: { id: ServerSubPage; label: string; icon: React.ElementType }[] = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'containers', label: 'Containers', icon: Server },
    { id: 'postgres', label: 'PostgreSQL', icon: Database },
    { id: 'redis', label: 'Redis', icon: Database },
    { id: 'system', label: 'System', icon: Cpu },
    { id: 'logs', label: 'Logs', icon: FileText },
    { id: 'workflows', label: 'Workflows', icon: Workflow },
];

const ServerMonitorMain: React.FC = () => {
    const [activeTab, setActiveTab] = useState<ServerSubPage>('overview');
    const { metrics, isConnected, isLoading, lastUpdate, reconnect } = useServerMetrics();

    const renderPage = () => {
        switch (activeTab) {
            case 'overview':
                return <OverviewPage metrics={metrics} />;
            case 'containers':
                return <ContainersPage docker={metrics?.docker} />;
            case 'postgres':
                return <PostgresPage postgresql={metrics?.postgresql} />;
            case 'redis':
                return <RedisPage redis={metrics?.redis} redisQueues={metrics?.redisQueues} />;
            case 'system':
                return <SystemPage system={metrics?.system} />;
            case 'logs':
                return <LogsPage />;
            case 'workflows':
                return <WorkflowsPage metrics={metrics} />;
            default:
                return <OverviewPage metrics={metrics} />;
        }
    };

    return (
        <div className="flex flex-col h-full relative overflow-hidden animate-fade-in">
            {/* Background */}
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
            <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/75 to-black/85"></div>

            <div className="relative z-10 flex flex-col h-full">
                {/* Header */}
                <div className="bg-[#0A0A0F]/80 backdrop-blur-2xl border-b border-white/10 px-6 py-4">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-purple-500/5 border border-purple-500/20 flex items-center justify-center">
                                <Activity className="w-5 h-5 text-purple-400" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">Server Monitor</h1>
                                <div className="flex items-center gap-3 mt-0.5">
                                    {isConnected && (
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_5px_#10b981] animate-pulse"></span>
                                            <span className="text-xs font-bold text-emerald-400">LIVE</span>
                                        </div>
                                    )}
                                    {lastUpdate && (
                                        <span className="text-xs text-text-subtle">
                                            Updated: {lastUpdate.toLocaleTimeString()}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={reconnect}
                            className="flex items-center gap-2 px-3 py-1.5 text-xs text-text-subtle hover:text-white bg-white/5 hover:bg-white/10 rounded-lg border border-white/10 transition-all"
                        >
                            <RefreshCw className="w-3 h-3" />
                            Refresh
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 overflow-x-auto custom-scrollbar pb-1">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive
                                        ? 'bg-white/10 text-white border border-white/20'
                                        : 'text-text-subtle hover:text-white hover:bg-white/5 border border-transparent'
                                        }`}
                                >
                                    <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                    {renderPage()}
                </div>
            </div>
        </div>
    );
};

export default ServerMonitorMain;
