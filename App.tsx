
import React, { useState, useEffect } from 'react';
import { SignedIn, SignedOut, useAuth, useUser } from '@clerk/clerk-react';
import { logger } from './utils/logger';
import SignInPage from './components/auth/SignInPage';
import SignUpPage from './components/auth/SignUpPage';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Workflow from './components/Workflow';
import RagExplanation from './components/RagExplanation';
import PipelineAnimation from './components/PipelineAnimation';
import Footer from './components/Footer';
import Header from './components/ui/Header';
import Sidebar from './components/Sidebar';
import { GlobalPage, WorkspacePage, DEFAULT_SYSTEM_PROMPTS, DEFAULT_STRATEGIES_CONFIG, NotebookConfig } from './config';
import DocumentsPage from './components/DocumentsPage';
import DashboardPage from './components/DashboardPage';
import NotebookDashboard from './components/workspace/NotebookDashboard';
import NotebookDocuments from './components/workspace/NotebookDocuments';
import PlaygroundSearch from './components/workspace/PlaygroundSearch';
import NotebookChat from './components/workspace/NotebookChat';
import NotebookSettings from './components/workspace/NotebookSettings';
import NotebookEmbeddingSetup from './components/workspace/NotebookEmbeddingSetup';
import NotebookAIEnhancer from './components/workspace/NotebookAIEnhancer';
import NotebookMonitor from './components/workspace/NotebookMonitor';

import { Loader2 } from 'lucide-react';
import { isAdmin, hasNotebookPermission, hasPagePermission } from './utils/admin';
import GlobalSettings from './components/GlobalSettings';

type AppMode = 'global' | 'workspace';

// --- Types for Configuration ---



const App: React.FC = () => {
    const [currentView, setCurrentView] = useState<'landing' | 'app'>('landing');

    const [path, setPath] = useState(window.location.pathname);
    const { isSignedIn, isLoaded } = useAuth();
    const { user } = useUser();
    const isUserAdmin = isAdmin(user);

    // Handle URL updates and history changes
    useEffect(() => {
        const handleLocationChange = () => {
            setPath(window.location.pathname);
        };

        // Listen for popstate (back/forward)
        window.addEventListener('popstate', handleLocationChange);

        // Monkey patch pushState/replaceState to detect changes
        const originalPushState = window.history.pushState.bind(window.history);
        const originalReplaceState = window.history.replaceState.bind(window.history);

        window.history.pushState = function (data: any, unused: string, url?: string | URL | null) {
            originalPushState(data, unused, url);
            handleLocationChange();
        };

        window.history.replaceState = function (data: any, unused: string, url?: string | URL | null) {
            originalReplaceState(data, unused, url);
            handleLocationChange();
        };

        return () => {
            window.removeEventListener('popstate', handleLocationChange);
            window.history.pushState = originalPushState;
            window.history.replaceState = originalReplaceState;
        };
    }, []);


    // Redirect to sign-in if accessing app while signed out and not on auth pages
    useEffect(() => {
        if (isLoaded && !isSignedIn && currentView === 'app') {
            if (path !== '/sign-in' && path !== '/sign-up') {
                window.history.replaceState({}, '', '/sign-in');
                setPath('/sign-in');
            }
        }
    }, [isLoaded, isSignedIn, currentView, path]);

    // Switch to app view when signed in and on app pages
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            if (path !== '/' && path !== '/sign-in' && path !== '/sign-up') {
                if (currentView !== 'app') {
                    setCurrentView('app');
                }
            }
        }
    }, [isLoaded, isSignedIn, path, currentView]);

    // App State
    const [appMode, setAppMode] = useState<AppMode>('global');
    const [activeGlobalPage, setActiveGlobalPage] = useState<GlobalPage>('dashboard');
    const [activeWorkspacePage, setActiveWorkspacePage] = useState<WorkspacePage>('home');
    const [isConfigLoading, setIsConfigLoading] = useState(false);

    // Selection State
    const [selectedNotebookId, setSelectedNotebookId] = useState<string | null>(null);
    const [selectedNotebookName, setSelectedNotebookName] = useState<string>('');
    const [selectedNotebookDescription, setSelectedNotebookDescription] = useState<string>('');

    // Configuration State
    // Maps Notebook ID -> NotebookConfig
    // Initialize from LocalStorage to persist settings
    const [notebookConfigs, setNotebookConfigs] = useState<Record<string, NotebookConfig>>(() => {
        try {
            const saved = localStorage.getItem('rag_flow_notebook_configs');
            return saved ? JSON.parse(saved) : {};
        } catch (e) {
            logger.error("Failed to load configs from local storage", e);
            return {};
        }
    });

    // Save to LocalStorage whenever configs change
    useEffect(() => {
        localStorage.setItem('rag_flow_notebook_configs', JSON.stringify(notebookConfigs));
    }, [notebookConfigs]);

    // Helper to sync settings to webhook
    const syncSettingsToWebhook = async (notebookId: string, config: NotebookConfig) => {
        const payload = {
            notebook_id: notebookId,
            system_prompt_retrieval: config.systemPrompts.retrieval,
            system_prompt_dataset: config.systemPrompts.dataset,
            inference_provider: config.inference.provider,
            inference_model: config.inference.model,
            embedding_model: config.embeddingModel,
            inference_temperature: config.inference.temperature,
            active_strategy_id: config.activeStrategyId,
            strategies_config: config.strategies,
            avatar_chat_config: config.avatarChat || null,
            user_id: user?.id
        };

        logger.debug("Syncing Initial/Default Settings to Webhook", { payload });

        try {
            await fetch('https://n8nserver.sportnavi.de/webhook/e64ae3ac-0d81-4303-be26-d18fd2d1faf6-notebook-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
        } catch (error) {
            logger.warn("Failed to sync initial settings to webhook", error);
        }
    };

    // Helper to fetch remote settings and update config
    const fetchRemoteConfig = async (notebookId: string) => {
        try {
            const response = await fetch('https://n8nserver.sportnavi.de/webhook/e64ae3ac-0d81-4303-be26-d18fd2d1faf6-get-current-notebook-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ notebook_id: notebookId, user_id: user?.id })
            });

            if (response.ok) {
                const text = await response.text();
                if (!text) return;

                let data;
                try {
                    const json = JSON.parse(text);
                    data = Array.isArray(json) ? json[0] : json;
                } catch (e) {
                    return;
                }

                if (data) {
                    setNotebookConfigs(prev => {
                        const existing = prev[notebookId] || {
                            embeddingModel: '',
                            systemPrompts: DEFAULT_SYSTEM_PROMPTS,
                            inference: { provider: 'openai', model: 'gpt-4o-mini', temperature: 0.0 },
                            strategies: JSON.parse(JSON.stringify(DEFAULT_STRATEGIES_CONFIG)),
                            activeStrategyId: 'fusion'
                        };

                        return {
                            ...prev,
                            [notebookId]: {
                                ...existing,
                                embeddingModel: data.embedding_model || existing.embeddingModel,
                                systemPrompts: {
                                    retrieval: data.system_prompt_retrieval || existing.systemPrompts.retrieval,
                                    dataset: data.system_prompt_dataset || existing.systemPrompts.dataset
                                },
                                inference: {
                                    provider: data.inference_provider || existing.inference.provider,
                                    model: data.inference_model || existing.inference.model,
                                    temperature: data.inference_temperature !== undefined ? Number(data.inference_temperature) : existing.inference.temperature
                                },
                                activeStrategyId: data.active_strategy_id || existing.activeStrategyId,
                                strategies: data.strategies_config || existing.strategies,
                                avatarChat: data.avatar_chat_config || existing.avatarChat
                            }
                        };
                    });
                }
            }
        } catch (e) {
            logger.error("Failed to fetch remote config", e);
        }
    };

    // Pre-populated with mock data matching the UUIDs in DocumentsPage
    const initialMocks = {
        '550e8400-e29b-41d4-a716-446655440000': 'text-embedding-3-small', // Financial Reports Q3
        'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11': 'nomic-embed-text:latest', // Engineering Docs
        // Add other mocks as needed for UUIDs
    };

    // Helper to initialize config if missing
    const ensureNotebookConfig = (id: string, embeddingModel?: string) => {
        setNotebookConfigs(prev => {
            const existingConfig = prev[id];

            // Check if we have a mock embedding model for this ID
            const mockEmbedding = (initialMocks as any)[id];
            const finalEmbedding = embeddingModel || (existingConfig ? existingConfig.embeddingModel : mockEmbedding) || '';

            // Deep merge strategies to ensure new defaults appear even for existing configs
            const mergedStrategies = JSON.parse(JSON.stringify(DEFAULT_STRATEGIES_CONFIG));

            if (existingConfig && existingConfig.strategies) {
                Object.keys(existingConfig.strategies).forEach(key => {
                    if (mergedStrategies[key]) {
                        const existingStrat = existingConfig.strategies[key];
                        const defaultStrat = mergedStrategies[key];

                        mergedStrategies[key] = {
                            ...defaultStrat,
                            ...existingStrat,
                            // Ensure we don't lose the default webhooks if the saved ones are empty
                            retrievalWebhook: existingStrat.retrievalWebhook || defaultStrat.retrievalWebhook,
                            agenticWebhook: existingStrat.agenticWebhook || defaultStrat.agenticWebhook,
                            params: { ...defaultStrat.params, ...existingStrat.params }
                        };
                    }
                });
            }

            return {
                ...prev,
                [id]: {
                    embeddingModel: finalEmbedding,
                    systemPrompts: existingConfig ? existingConfig.systemPrompts : DEFAULT_SYSTEM_PROMPTS,
                    inference: existingConfig ? existingConfig.inference : {
                        provider: 'openai',
                        model: 'gpt-4o-mini',
                        temperature: 0.0,
                    },
                    strategies: mergedStrategies,
                    activeStrategyId: existingConfig ? existingConfig.activeStrategyId : 'fusion'
                }
            };
        });
    };

    // URL Synchronization Logic
    useEffect(() => {
        const syncUrl = () => {
            const currentPath = window.location.pathname;

            // Don't override auth pages - let Clerk handle navigation between sign-in/sign-up
            if (currentPath === '/sign-in' || currentPath === '/sign-up') {
                return;
            }

            let newPath = '/';
            if (currentView === 'landing') {
                newPath = '/';
            } else if (appMode === 'global') {
                newPath = activeGlobalPage === 'dashboard' ? '/dashboard' :
                    activeGlobalPage === 'notebooks' ? '/notebooks' :
                        activeGlobalPage === 'settings' ? '/settings' : '/dashboard';
            } else if (appMode === 'workspace' && selectedNotebookId) {
                newPath = `/notebook/${selectedNotebookId}/${activeWorkspacePage === 'home' ? '' : activeWorkspacePage}`;
            }

            // Cleanup trailing slash if not root
            if (newPath.length > 1 && newPath.endsWith('/')) {
                newPath = newPath.slice(0, -1);
            }

            if (currentPath !== newPath) {
                window.history.pushState({}, '', newPath);
                setPath(newPath);
            }
        };

        // Delay sync slightly to allow state to settle
        const timeout = setTimeout(syncUrl, 50);
        return () => clearTimeout(timeout);
    }, [currentView, appMode, activeGlobalPage, activeWorkspacePage, selectedNotebookId]);

    // Initial URL Parsing
    useEffect(() => {
        const handleInitialRoute = () => {
            const currentPath = window.location.pathname;

            // Skip if landing page
            if (currentPath === '/' || currentPath === '/sign-in' || currentPath === '/sign-up') return;

            // Wait for auth to load
            if (!isLoaded) return;

            // If not signed in and trying to access protected route, redirect will be handled by auth effect
            if (isLoaded && !isSignedIn) return;

            // Switch to app view
            setCurrentView('app');

            // Global Routes
            if (currentPath.startsWith('/dashboard')) {
                setAppMode('global');
                setActiveGlobalPage('dashboard');
            } else if (currentPath.startsWith('/notebooks')) {
                setAppMode('global');
                setActiveGlobalPage('notebooks');
            } else if (currentPath.startsWith('/settings')) {
                setAppMode('global');
                setActiveGlobalPage('settings');
            }
            // Workspace Routes /notebook/:id/:page?
            else if (currentPath.startsWith('/notebook/')) {
                const parts = currentPath.split('/');
                const notebookId = parts[2];
                const page = parts[3] as WorkspacePage | undefined;

                if (notebookId) {
                    setAppMode('workspace');
                    setSelectedNotebookId(notebookId);
                    setActiveWorkspacePage(page || 'home');
                    // Note: Notebook name/desc won't be set until fetched
                    ensureNotebookConfig(notebookId);
                    fetchRemoteConfig(notebookId);
                }
            }
        };

        handleInitialRoute();
    }, [isLoaded, isSignedIn]);

    const handleStart = () => {
        if (isSignedIn) {
            window.history.pushState({}, '', '/dashboard');
            setPath('/dashboard');
        } else {
            window.history.pushState({}, '', '/sign-in');
            setPath('/sign-in');
        }
        setCurrentView('app');
        setAppMode('global');
        setActiveGlobalPage('dashboard');
        window.scrollTo(0, 0);
    };

    const handleOpenNotebook = async (id: string, name: string, description: string = '') => {
        // Check permission
        if (!hasNotebookPermission(user, id)) {
            alert("You do not have permission to access this notebook.");
            return;
        }

        setIsConfigLoading(true);
        try {
            setSelectedNotebookId(id);
            setSelectedNotebookName(name);
            setSelectedNotebookDescription(description);

            // Ensure configuration exists with defaults first
            ensureNotebookConfig(id);

            // Fetch remote config to ensure we have the embedding model if it exists
            await fetchRemoteConfig(id);

            setAppMode('workspace');
            setActiveWorkspacePage('home');
        } finally {
            setIsConfigLoading(false);
        }
    };

    const handleBackToGlobal = () => {
        setAppMode('global');
        setSelectedNotebookId(null);
        setSelectedNotebookName('');
        setSelectedNotebookDescription('');
    };

    const handleRegisterEmbedding = (id: string, modelId: string) => {
        // Initialize config with this embedding model
        setNotebookConfigs(prev => {
            // Create a fresh config with defaults
            const newConfig: NotebookConfig = {
                embeddingModel: modelId,
                systemPrompts: DEFAULT_SYSTEM_PROMPTS,
                inference: {
                    provider: 'openai',
                    model: 'gpt-4o-mini',
                    temperature: 0.0,
                },
                strategies: JSON.parse(JSON.stringify(DEFAULT_STRATEGIES_CONFIG)),
                activeStrategyId: 'fusion'
            };

            // 2. Send this fresh config to webhook immediately
            syncSettingsToWebhook(id, newConfig);

            return {
                ...prev,
                [id]: newConfig
            };
        });
    };

    const handleSetupComplete = (modelId: string) => {
        if (selectedNotebookId) {
            handleRegisterEmbedding(selectedNotebookId, modelId);
        }
    };

    const handleUpdateConfig = (newConfig: NotebookConfig) => {
        if (selectedNotebookId) {
            setNotebookConfigs(prev => ({
                ...prev,
                [selectedNotebookId]: newConfig
            }));
        }
    };

    if (isConfigLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-text-subtle animate-pulse">Loading configuration...</p>
                </div>
            </div>
        );
    }

    if (currentView === 'app') {
        // Determine if we need to show the setup page
        // We check if the config exists AND if embeddingModel is set
        const currentConfig = selectedNotebookId ? notebookConfigs[selectedNotebookId] : undefined;
        const needsSetup = selectedNotebookId && (!currentConfig || !currentConfig.embeddingModel);

        return (
            <>
                <SignedOut>
                    {path === '/sign-up' ? <SignUpPage /> : <SignInPage />}
                </SignedOut>
                <SignedIn>
                    <div className="min-h-screen bg-background text-text-light font-sans flex overflow-hidden relative selection:bg-primary/20 selection:text-primary">
                        {/* Authentication Header - Hidden on chat and search pages to avoid covering buttons */}
                        {!(appMode === 'workspace' && (activeWorkspacePage === 'chat' || activeWorkspacePage === 'search')) && (
                            <Header />
                        )}

                        {/* Ambient Background Mesh */}
                        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] animate-pulse-slow"></div>
                            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
                        </div>

                        <div className="relative z-20 flex w-full">
                            {!needsSetup && (
                                <Sidebar
                                    mode={appMode}
                                    activePage={appMode === 'global' ? activeGlobalPage : activeWorkspacePage}
                                    onNavigate={(page) => appMode === 'global' ? setActiveGlobalPage(page as GlobalPage) : setActiveWorkspacePage(page as WorkspacePage)}
                                    onBackToGlobal={handleBackToGlobal}
                                    notebookName={selectedNotebookName}
                                    notebookId={selectedNotebookId || undefined}
                                />
                            )}

                            <main className="flex-1 h-screen overflow-y-auto relative custom-scrollbar scroll-smooth">

                                {/* Setup Page (Blocking) */}
                                {needsSetup && (
                                    <NotebookEmbeddingSetup
                                        notebookName={selectedNotebookName}
                                        onComplete={handleSetupComplete}
                                        onCancel={handleBackToGlobal}
                                    />
                                )}

                                {/* Global Pages */}
                                {!needsSetup && appMode === 'global' && (
                                    <>
                                        {activeGlobalPage === 'dashboard' && (
                                            <DashboardPage
                                                onOpenNotebook={handleOpenNotebook}
                                                onRegisterEmbedding={handleRegisterEmbedding}
                                            />
                                        )}
                                        {activeGlobalPage === 'notebooks' && (
                                            <DocumentsPage
                                                onOpenNotebook={handleOpenNotebook}
                                                onRegisterEmbedding={handleRegisterEmbedding}
                                            />
                                        )}
                                        {activeGlobalPage === 'settings' && (
                                            isUserAdmin ? (
                                                <GlobalSettings />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-red-400 animate-fade-in-up">
                                                    <div className="text-center p-8 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                                                        <p>Access Denied</p>
                                                        <span className="text-xs opacity-50">Admin privileges required</span>
                                                    </div>
                                                </div>
                                            )
                                        )}

                                    </>
                                )}

                                {/* Workspace Pages */}
                                {!needsSetup && appMode === 'workspace' && selectedNotebookId && currentConfig && (
                                    <>
                                        {activeWorkspacePage === 'home' && (
                                            <NotebookDashboard
                                                notebookId={selectedNotebookId}
                                                notebookName={selectedNotebookName}
                                                notebookDescription={selectedNotebookDescription}
                                                onNavigate={(page) => setActiveWorkspacePage(page)}
                                            />
                                        )}
                                        {activeWorkspacePage === 'chat' && (
                                            hasPagePermission(user, 'chat', selectedNotebookId) ? (
                                                <NotebookChat
                                                    config={currentConfig}
                                                    notebookId={selectedNotebookId}
                                                    notebookName={selectedNotebookName}
                                                    onConfigChange={handleUpdateConfig}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-text-subtle">Access Denied</div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'documents' && (
                                            hasPagePermission(user, 'documents', selectedNotebookId) ? (
                                                <NotebookDocuments
                                                    notebookId={selectedNotebookId}
                                                    notebookName={selectedNotebookName}
                                                    notebookDescription={selectedNotebookDescription}
                                                    config={currentConfig}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-red-400 animate-fade-in-up">
                                                    <div className="text-center p-8 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                                                        <p>Access Denied</p>
                                                        <span className="text-xs opacity-50">Permission required</span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'search' && (
                                            hasPagePermission(user, 'search', selectedNotebookId) ? (
                                                <PlaygroundSearch
                                                    notebookId={selectedNotebookId}
                                                    config={currentConfig}
                                                    onConfigChange={handleUpdateConfig}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-text-subtle">Access Denied</div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'settings' && (
                                            hasPagePermission(user, 'settings', selectedNotebookId) ? (
                                                <NotebookSettings
                                                    key={selectedNotebookId}
                                                    notebookId={selectedNotebookId}
                                                    notebookName={selectedNotebookName}
                                                    config={currentConfig}
                                                    onConfigChange={handleUpdateConfig}
                                                    defaultStrategies={DEFAULT_STRATEGIES_CONFIG}
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full text-red-400 animate-fade-in-up">
                                                    <div className="text-center p-8 border border-dashed border-red-500/20 rounded-2xl bg-red-500/5">
                                                        <p>Access Denied</p>
                                                        <span className="text-xs opacity-50">Permission required</span>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                        {activeWorkspacePage === 'ai-enhancer' && (
                                            <NotebookAIEnhancer
                                                notebookId={selectedNotebookId}
                                                notebookName={selectedNotebookName}
                                                config={currentConfig}
                                            />
                                        )}
                                        {activeWorkspacePage === 'monitor' && (
                                            <NotebookMonitor
                                                notebookId={selectedNotebookId}
                                                notebookName={selectedNotebookName}
                                                config={currentConfig}
                                            />
                                        )}

                                    </>
                                )}
                            </main>
                        </div>
                    </div>
                </SignedIn>
            </>
        );
    }

    // Render auth pages when on auth routes (even if in landing view)
    if (path === '/sign-up') {
        return <SignUpPage />;
    }

    if (path === '/sign-in') {
        return <SignInPage />;
    }

    return (
        <div className="min-h-screen bg-background text-text-light font-sans selection:bg-primary/30 selection:text-white flex flex-col">
            <Navbar onStart={handleStart} />
            <main className="flex flex-col w-full flex-grow">
                <Hero onStart={handleStart} />
                <PipelineAnimation />
                <RagExplanation onStart={handleStart} />
            </main>
            <Footer />
        </div>
    );
};

export default App;
