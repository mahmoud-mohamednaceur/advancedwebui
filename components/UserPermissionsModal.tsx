import React, { useState, useEffect } from 'react';
import { X, Loader2, Save, ChevronDown, Check, Search, Building2, Database, Shield, Settings, Info } from 'lucide-react';
import { useUser } from '@clerk/clerk-react';

interface AccessControlSetting {
    id: string;
    name: string;
    enabled: boolean;
}

interface UserPermissionsModalProps {
    user: any;
    onClose: () => void;
    onSave: () => void;
}

// Reusable Modern Toggle Switch
const ToggleSwitch = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label?: string }) => (
    <label className="flex items-center gap-3 cursor-pointer group">
        <div className="relative">
            <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
            <div className={`w-10 h-6 rounded-full transition-all duration-300 border ${checked ? 'bg-primary border-primary shadow-[0_0_10px_rgba(126,249,255,0.4)]' : 'bg-white/5 border-white/10 group-hover:border-white/20'}`}></div>
            <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform duration-300 shadow-sm ${checked ? 'translate-x-4' : 'translate-x-0 opacity-50'}`}></div>
        </div>
        {label && <span className={`text-sm font-medium transition-colors ${checked ? 'text-white' : 'text-text-subtle group-hover:text-white/70'}`}>{label}</span>}
    </label>
);

const UserPermissionsModal: React.FC<UserPermissionsModalProps> = ({ user, onClose, onSave }) => {
    const { user: currentAdmin } = useUser();
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [notebooks, setNotebooks] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');

    // Permission States
    const [notebookPermissions, setNotebookPermissions] = useState<Record<string, string[]>>({});
    const [globalAllowedPages, setGlobalAllowedPages] = useState<string[]>([]);
    const [accessControlSettings, setAccessControlSettings] = useState<AccessControlSetting[]>([]);

    // UI State
    const [expandedNotebooks, setExpandedNotebooks] = useState<string[]>([]);

    // Constants
    const GLOBAL_PAGES = [
        { id: 'dashboard', label: 'Main Dashboard' },
        { id: 'notebooks', label: 'All Notebooks View' },
    ];

    const NOTEBOOK_SUBPAGES = [
        { id: 'home', label: 'Overview' },
        { id: 'chat', label: 'Chat Interface' },
        { id: 'documents', label: 'Document Manager' },
        { id: 'search', label: 'Search Playground' },
        { id: 'chart', label: 'Analytics' },
        { id: 'settings', label: 'Configuration' },
    ];

    useEffect(() => {
        initPermissions();
        fetchNotebooks();
    }, [user]);

    const initPermissions = () => {
        // Handle both snake_case (from Clerk API) and camelCase (from Clerk React hooks)
        const metadata = user?.publicMetadata || (user as any)?.public_metadata;
        if (!metadata) return;

        setGlobalAllowedPages(metadata.allowed_pages || []);

        // Load access control settings from Clerk metadata
        if (metadata.access_control_settings) {
            setAccessControlSettings(metadata.access_control_settings as AccessControlSetting[]);
        }

        if (metadata.notebook_permissions) {
            setNotebookPermissions(metadata.notebook_permissions);
        } else {
            const legacyNotebooks = metadata.allowed_notebooks || [];
            if (Array.isArray(legacyNotebooks)) {
                const newPerms: Record<string, string[]> = {};
                legacyNotebooks.forEach((nbId: string) => {
                    newPerms[nbId] = NOTEBOOK_SUBPAGES.map(p => p.id);
                });
                setNotebookPermissions(newPerms);
            }
        }
    };

    const fetchNotebooks = async () => {
        setIsLoading(true);
        try {
            const ORCHESTRATOR_ID = '301f7482-1430-466d-9721-396564618751';
            const PULL_NOTEBOOKS_WEBHOOK_URL = 'https://n8nserver.sportnavi.de/webhook/22e943ae-6bc7-43b3-9ca4-16bdc715a84b-pull-notebooks';

            const response = await fetch(PULL_NOTEBOOKS_WEBHOOK_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orchestrator_id: ORCHESTRATOR_ID, user_id: user?.id })
            });

            if (response.ok) {
                const listRaw = await response.json();
                let listData = [];
                if (Array.isArray(listRaw)) listData = listRaw;
                else listData = [listRaw];

                const notebooksList = listData
                    .map((item: any) => item.json ? item.json : item)
                    .filter((d: any) => d && (d.notebook_id || d.id))
                    .map((item: any) => ({
                        id: item.notebook_id || item.id,
                        title: item.notebook_title || item.title || 'Untitled Notebook'
                    }));

                setNotebooks(notebooksList);
            }
        } catch (error) {
            console.error("Failed to fetch notebooks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const legacyAllowedNotebooks = Object.keys(notebookPermissions);

            // Save ALL permissions to Clerk (including access control settings)
            const response = await fetch('/api/update-permissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: user.id,
                    permissions: {
                        notebook_permissions: notebookPermissions,
                        allowed_notebooks: legacyAllowedNotebooks,
                        allowed_pages: globalAllowedPages,
                        access_control_settings: accessControlSettings,
                        role: user.publicMetadata?.role
                    }
                })
            });

            if (!response.ok) throw new Error('Failed to update permissions');

            onSave();
            onClose();
        } catch (error) {
            console.error("Error saving permissions:", error);
            alert("Failed to save permissions");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleNotebook = (nbId: string) => {
        setNotebookPermissions(prev => {
            const next = { ...prev };
            if (next[nbId]) {
                delete next[nbId];
            } else {
                next[nbId] = NOTEBOOK_SUBPAGES.map(p => p.id);
                setExpandedNotebooks(curr => [...curr, nbId]);
            }
            return next;
        });
    };

    const toggleNotebookPage = (nbId: string, pageId: string) => {
        setNotebookPermissions(prev => {
            const currentPages = prev[nbId] || [];
            const exists = currentPages.includes(pageId);
            const newPages = exists
                ? currentPages.filter(p => p !== pageId)
                : [...currentPages, pageId];

            return {
                ...prev,
                [nbId]: newPages
            };
        });
    };

    const toggleGlobalPage = (pageId: string) => {
        setGlobalAllowedPages(prev =>
            prev.includes(pageId) ? prev.filter(p => p !== pageId) : [...prev, pageId]
        );
    };

    const toggleExpand = (nbId: string) => {
        setExpandedNotebooks(prev =>
            prev.includes(nbId) ? prev.filter(id => id !== nbId) : [...prev, nbId]
        );
    };

    const toggleAccessControlSetting = (settingId: string) => {
        setAccessControlSettings(prev =>
            prev.map(setting =>
                setting.id === settingId
                    ? { ...setting, enabled: !setting.enabled }
                    : setting
            )
        );
    };

    const filteredNotebooks = notebooks.filter(nb =>
        (nb.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (nb.id || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Calculate stats
    const totalNotebooks = notebooks.length;
    const accessibleCount = Object.keys(notebookPermissions).length;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden">
            {/* WebM Video Background */}
            <video
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'brightness(0.25) blur(3px)' }}
            >
                <source src="/Whisk_qtn2uwmzgty5qjzk1syhztotmznyqtl5yznw0iy.webm" type="video/webm" />
            </video>

            {/* Dark Overlay with Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/80 to-black/90"></div>

            {/* Main Content Container - Full Screen with Padding */}
            <div className="relative w-full h-full flex flex-col p-4 md:p-6 lg:p-10 animate-fade-in">

                {/* Header Bar - Glassmorphism */}
                <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl p-5 md:p-6 mb-4 md:mb-6 shadow-2xl">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 md:gap-4">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/20">
                                <Shield className="w-6 h-6 md:w-7 md:h-7" />
                            </div>
                            <div>
                                <h2 className="text-2xl md:text-3xl font-bold text-white tracking-tight">Access Control</h2>
                                <div className="flex items-center gap-2 mt-1 md:mt-1.5">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] animate-pulse"></span>
                                    <p className="text-xs md:text-sm font-medium text-text-subtle">
                                        Editing <span className="text-white font-semibold">{user.firstName} {user.lastName}</span>
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2.5 md:p-3 rounded-xl bg-white/5 hover:bg-white/10 text-text-subtle hover:text-white transition-all duration-200 border border-white/10 hover:border-white/20"
                        >
                            <X className="w-5 h-5 md:w-6 md:h-6" />
                        </button>
                    </div>
                </div>

                {/* Main Content Grid */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 overflow-hidden min-h-0">

                    {/* Left Column - Global & System Config */}
                    <div className="space-y-4 md:space-y-6 overflow-y-auto custom-scrollbar pr-2">

                        {/* Global Platform Access */}
                        <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl hover:border-primary/30 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-4 md:mb-5">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                    <Building2 className="w-4 h-4 md:w-5 md:h-5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider truncate">Global Platform Access</h3>
                                    <p className="text-xs text-text-subtle/70">System-wide pages</p>
                                </div>
                            </div>
                            <div className="space-y-2.5 md:space-y-3">
                                {GLOBAL_PAGES.map(page => (
                                    <div key={page.id} className="flex items-center justify-between p-3 md:p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5">
                                        <span className="text-sm font-medium text-white truncate pr-2">{page.label}</span>
                                        <ToggleSwitch
                                            checked={globalAllowedPages.includes(page.id)}
                                            onChange={() => toggleGlobalPage(page.id)}
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* System Configuration */}
                        <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:p-6 shadow-xl hover:border-secondary/30 transition-all duration-300">
                            <div className="flex items-center gap-3 mb-4 md:mb-5">
                                <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-secondary/10 border border-secondary/20 flex items-center justify-center flex-shrink-0">
                                    <Settings className="w-4 h-4 md:w-5 md:h-5 text-secondary" />
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider truncate">System Configuration</h3>
                                    <p className="text-xs text-text-subtle/70">Feature flags & toggles</p>
                                </div>
                            </div>
                            {accessControlSettings.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-6 md:py-8 text-center">
                                    <Settings className="w-8 h-8 md:w-10 md:h-10 text-text-subtle/30 mb-2 md:mb-3" />
                                    <p className="text-xs md:text-sm text-text-subtle/60">No configuration settings available.</p>
                                </div>
                            ) : (
                                <div className="space-y-2.5 md:space-y-3">
                                    {accessControlSettings.map(setting => (
                                        <div key={setting.id} className="flex items-center justify-between p-3 md:p-3.5 rounded-xl bg-white/5 hover:bg-white/10 transition-all duration-200 border border-white/5">
                                            <span className="text-sm font-medium text-white truncate pr-2">{setting.name}</span>
                                            <ToggleSwitch
                                                checked={setting.enabled}
                                                onChange={() => toggleAccessControlSetting(setting.id)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column (2 cols) - Notebook Contexts */}
                    <div className="lg:col-span-2 flex flex-col overflow-hidden min-h-0">
                        <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-xl flex flex-col overflow-hidden h-full">

                            {/* Notebook Header */}
                            <div className="p-4 md:p-6 border-b border-white/10 flex-shrink-0">
                                <div className="flex items-center justify-between mb-3 md:mb-4">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-accent/10 border border-accent/20 flex items-center justify-center flex-shrink-0">
                                            <Database className="w-4 h-4 md:w-5 md:h-5 text-accent" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-xs md:text-sm font-bold text-white uppercase tracking-wider truncate">Notebook Contexts</h3>
                                            <p className="text-xs text-text-subtle/70">
                                                {accessibleCount}/{totalNotebooks} accessible
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Search */}
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-subtle pointer-events-none" />
                                    <input
                                        type="text"
                                        placeholder="Search notebooks..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-9 md:pl-10 pr-4 py-2 md:py-2.5 text-sm text-white placeholder:text-text-subtle focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all"
                                    />
                                </div>
                            </div>

                            {/* Notebooks List */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 min-h-0">
                                {isLoading ? (
                                    <div className="flex items-center justify-center h-32 md:h-48">
                                        <Loader2 className="w-8 h-8 text-primary animate-spin" />
                                    </div>
                                ) : filteredNotebooks.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-32 md:h-48 text-center">
                                        <Database className="w-10 h-10 md:w-12 md:h-12 text-text-subtle/30 mb-2 md:mb-3" />
                                        <p className="text-sm text-text-subtle/60">No notebooks found</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredNotebooks.map(notebook => {
                                            const isAccessible = notebookPermissions[notebook.id];
                                            const isExpanded = expandedNotebooks.includes(notebook.id);
                                            const allowedPages = notebookPermissions[notebook.id] || [];

                                            return (
                                                <div key={notebook.id} className="bg-white/5 hover:bg-white/[0.07] border border-white/10 rounded-xl overflow-hidden transition-all duration-200">
                                                    <div className="p-3 md:p-4">
                                                        <div className="flex items-center justify-between mb-3 gap-3">
                                                            <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                                                                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isAccessible ? 'bg-emerald-500 shadow-[0_0_6px_#10b981]' : 'bg-gray-500'}`}></div>
                                                                <span className="font-medium text-sm md:text-base text-white truncate">{notebook.title}</span>
                                                            </div>
                                                            <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                                                                <ToggleSwitch
                                                                    checked={isAccessible}
                                                                    onChange={() => toggleNotebook(notebook.id)}
                                                                />
                                                                {isAccessible && (
                                                                    <button
                                                                        onClick={() => toggleExpand(notebook.id)}
                                                                        className="p-1.5 md:p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                                    >
                                                                        <ChevronDown className={`w-4 h-4 text-text-subtle transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {isAccessible && isExpanded && (
                                                            <div className="mt-3 md:mt-4 pt-3 md:pt-4 border-t border-white/10 grid grid-cols-2 gap-2">
                                                                {NOTEBOOK_SUBPAGES.map(page => (
                                                                    <button
                                                                        key={page.id}
                                                                        onClick={() => toggleNotebookPage(notebook.id, page.id)}
                                                                        className={`flex items-center gap-2 p-2 md:p-2.5 rounded-lg text-xs md:text-sm font-medium transition-all ${allowedPages.includes(page.id)
                                                                                ? 'bg-primary/20 text-primary border border-primary/30 shadow-sm'
                                                                                : 'bg-white/5 text-text-subtle border border-white/10 hover:bg-white/10'
                                                                            }`}
                                                                    >
                                                                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${allowedPages.includes(page.id) ? 'bg-primary shadow-[0_0_4px_rgba(126,249,255,0.5)]' : 'bg-text-subtle/30'}`}></div>
                                                                        <span className="truncate">{page.label}</span>
                                                                    </button>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="bg-[#0A0A0F]/50 backdrop-blur-2xl border border-white/10 rounded-2xl p-4 md:p-6 mt-4 md:mt-6 shadow-2xl flex-shrink-0">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 md:gap-4">
                        <p className="text-xs md:text-sm text-text-subtle text-center sm:text-left">
                            <span className="font-medium text-white">{accessibleCount}</span> of {totalNotebooks} notebooks accessible
                        </p>
                        <div className="flex items-center gap-2 md:gap-3 w-full sm:w-auto">
                            <button
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white text-sm md:text-base font-medium transition-all duration-200 border border-white/10"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 sm:flex-none px-4 md:px-6 py-2.5 md:py-3 rounded-xl bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/30 text-white text-sm md:text-base font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="hidden sm:inline">Saving...</span>
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4" />
                                        <span>Save Changes</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPermissionsModal;
