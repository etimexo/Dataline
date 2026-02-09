
import React, { useState, useCallback, useEffect } from 'react';
import { supabase } from './services/supabaseClient';
import { saveProjectsToDB, loadProjectsFromDB, deleteProjectsFromDB } from './services/storage';
import type { Dataset, MLModel, ChartConfig, View, Project, ChatMessage } from './types';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import DatasetUploader from './components/DatasetUploader';
import DatasetViewer from './components/DatasetViewer';
import ChatInterface from './components/ChatInterface';
import DashboardView from './components/DashboardView';
import ModelManager from './components/ModelManager';
import HistoryView from './components/HistoryView';
import ProjectSelector from './components/ProjectSelector';
import LandingPage from './components/LandingPage';
import AuthModal from './components/AuthModal';
import OnboardingTour from './components/OnboardingTour';
import Button from './components/ui/Button';
import { ChatIcon, XIcon, HelpIcon } from './components/ui/Icons';
import { ToastProvider, useToast } from './components/ui/Toast';
import { ThemeProvider } from './components/ui/ThemeContext';
import ReportBuilder from './components/ReportBuilder';

const DatalineApp: React.FC = () => {
    // --- Auth State ---
    const [session, setSession] = useState<any>(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [showPasswordReset, setShowPasswordReset] = useState(false);
    const [showGuestWarning, setShowGuestWarning] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);

    // --- Project Management State ---
    const [projects, setProjects] = useState<Project[]>([]);
    const [activeProject, setActiveProject] = useState<Project | null>(null);
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
    const [projectsLoaded, setProjectsLoaded] = useState(false);

    // --- Active Workspace State ---
    const [datasets, setDatasets] = useState<Dataset[]>([]);
    const [activeDataset, setActiveDataset] = useState<Dataset | null>(null);
    const [mlModels, setMlModels] = useState<MLModel[]>([]);
    const [activeModel, setActiveModel] = useState<MLModel | null>(null);
    const [charts, setCharts] = useState<ChartConfig[]>([]);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    
    // --- Report State ---
    const [reportCharts, setReportCharts] = useState<Set<string>>(new Set());
    const [reportMessages, setReportMessages] = useState<Set<string>>(new Set());
    const [showReportBuilder, setShowReportBuilder] = useState(false);

    // --- UI State ---
    const [activeView, setActiveView] = useState<View>('upload');
    const [isChatOpen, setIsChatOpen] = useState(false);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [showOnboarding, setShowOnboarding] = useState(false);

    const { addToast } = useToast();

    // --- Auth Initialization ---
    useEffect(() => {
        const initAuth = async () => {
            try {
                // Check for hash parameters from OAuth redirect immediately
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                if (session) {
                    setSession(session);
                    // Explicitly fetch projects for the logged-in user immediately
                    loadUserProjects(session.user.id);
                }
            } catch (error) {
                console.warn("Auth initialization failed:", error);
                setSession(null);
            } finally {
                setAuthLoading(false);
            }
        };

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                setSession(session);
                if (session) loadUserProjects(session.user.id);
            }
            
            if (event === 'SIGNED_OUT') {
                setSession(null);
                setProjects([]);
                setActiveProject(null);
            }
            
            if (event === 'PASSWORD_RECOVERY') setShowPasswordReset(true);
        });
        return () => subscription.unsubscribe();
    }, []);

    // Check for onboarding
    useEffect(() => {
        // Only start onboarding if user is logged in, has entered a project, and hasn't completed it before
        if (session && activeProject && !localStorage.getItem('dataline_onboarding_complete')) {
            const timer = setTimeout(() => setShowOnboarding(true), 500);
            return () => clearTimeout(timer);
        }
    }, [session, activeProject]);

    const handleOnboardingComplete = () => {
        setShowOnboarding(false);
        localStorage.setItem('dataline_onboarding_complete', 'true');
    };

    const loadUserProjects = async (userId: string) => {
        try {
            const dbProjects = await loadProjectsFromDB(userId);
            if (dbProjects && dbProjects.length > 0) {
                setProjects(dbProjects);
            }
            setProjectsLoaded(true);
        } catch (e) {
            console.error("Failed to load projects", e);
        }
    };

    // --- Save Projects ---
    useEffect(() => {
        if (!session?.user || !projectsLoaded) return;
        setSaveStatus('saving');
        const save = async () => {
            try {
                await saveProjectsToDB(session.user.id, projects);
                setSaveStatus('saved');
            } catch (e) {
                console.error("Failed to save projects to DB", e);
                setSaveStatus('error');
            }
        };
        const timer = setTimeout(save, 800);
        return () => clearTimeout(timer);
    }, [projects, session, projectsLoaded]);

    // --- Auto-Save Logic ---
    const saveCurrentWorkspaceToProject = useCallback(() => {
        if (!activeProject) return;
        setProjects(prevProjects => prevProjects.map(p => {
            if (p.id === activeProject.id) {
                return {
                    ...p,
                    lastModified: Date.now(),
                    datasets: datasets,
                    models: mlModels,
                    charts: charts,
                    chatHistory: chatHistory
                };
            }
            return p;
        }));
    }, [activeProject, datasets, mlModels, charts, chatHistory]);

    useEffect(() => {
        if (activeProject) {
            const timeout = setTimeout(saveCurrentWorkspaceToProject, 1000);
            return () => clearTimeout(timeout);
        }
    }, [datasets, mlModels, charts, chatHistory, activeProject, saveCurrentWorkspaceToProject]);


    // --- Handlers ---

    const handleSignOutRequest = () => {
        if (session?.user?.id === 'guest-user-demo') {
            setShowGuestWarning(true);
        } else {
            performSignOut();
        }
    };

    const performSignOut = async () => {
        if (session?.user?.id === 'guest-user-demo') {
            await deleteProjectsFromDB('guest-user-demo');
            setProjects([]);
        }
        await supabase.auth.signOut();
        setSession(null);
        setActiveProject(null);
        setShowGuestWarning(false);
        addToast("Signed out successfully");
    };

    const handleGuestSave = () => {
        setShowGuestWarning(false);
        setShowAuthModal(true);
    };
    
    const handleGuestLogin = () => {
        const mockSession = {
            access_token: 'mock-token',
            token_type: 'bearer',
            expires_in: 3600,
            refresh_token: 'mock-refresh',
            user: {
                id: 'guest-user-demo',
                aud: 'authenticated',
                role: 'authenticated',
                email: 'guest@demo.com',
                app_metadata: { provider: 'email' },
                user_metadata: {},
                created_at: new Date().toISOString(),
            }
        };
        setSession(mockSession);
        setProjectsLoaded(true); // Allow immediate saving to guest DB slot
        addToast("Welcome, Guest User!", "success");
    };

    const handleCreateProject = (name: string, description: string) => {
        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name,
            description,
            createdAt: Date.now(),
            lastModified: Date.now(),
            datasets: [],
            models: [],
            charts: [],
            chatHistory: []
        };
        setProjects(prev => [...prev, newProject]);
        handleSelectProject(newProject);
        addToast(`Project "${name}" created`, "success");
    };

    const handleDeleteProject = (id: string) => {
        setProjects(prev => prev.filter(p => p.id !== id));
        if (activeProject?.id === id) {
            setActiveProject(null);
        }
        addToast("Project deleted", "info");
    };

    const handleSelectProject = (project: Project) => {
        setActiveProject(project);
        setDatasets(project.datasets || []);
        setMlModels(project.models || []);
        setCharts(project.charts || []);
        setChatHistory(project.chatHistory || []);
        
        if (project.datasets && project.datasets.length > 0) {
            setActiveDataset(project.datasets[project.datasets.length - 1]);
            setActiveView('dashboard');
        } else {
            setActiveDataset(null);
            setActiveView('upload');
        }
        setActiveModel(project.models && project.models.length > 0 ? project.models[0] : null);
    };

    const handleDatasetUpload = (dataset: Dataset) => {
        setDatasets(prev => [...prev, dataset]);
        setActiveDataset(dataset);
        setActiveView('dashboard');
        addToast("Dataset uploaded & ready", "success");

        // --- Proactive AI Logic ---
        let proactiveMessage = `I've successfully loaded "**${dataset.name}**" (${dataset.data.length} rows, ${dataset.columns.length} columns). \n\nWhat would you like to do next?`;
        
        const numericCols = dataset.columns.filter(col => {
            const val = dataset.data[0]?.[col];
            return typeof val === 'number';
        });

        if (numericCols.length > 0) {
            proactiveMessage += `\n\n**Here are some ideas:**\n* "Analyze trends in ${numericCols[0]}"\n* "Predict future values for ${numericCols[0]}"`;
        }
        
        proactiveMessage += `\n* "Generate a dashboard summary"\n* "Create a PDF report of my findings"`;

        const firstMessage: ChatMessage = { 
            id: `init-${Date.now()}`, 
            sender: 'ai', 
            text: proactiveMessage
        };
        setChatHistory(prev => [...prev, firstMessage]);
        
        if (chatHistory.length === 0) {
            setIsChatOpen(true);
        }
    };

    const handleModelCreation = (model: MLModel) => {
        setMlModels(prev => [...prev, model]);
        setActiveModel(model);
        addToast(`Model "${model.name}" created`, "success");
    };

    const handleAddChart = (newCharts: ChartConfig[]) => {
        setCharts(prev => [...prev, ...newCharts]);
        addToast(`${newCharts.length} chart(s) added to dashboard`, "success");
    };

    const handleUpdateChart = (updatedChart: ChartConfig) => {
        setCharts(prev => prev.map(c => c.id === updatedChart.id ? updatedChart : c));
        addToast("Chart updated", "success");
    };

    const handleRemoveChart = (chartId: string) => {
        setCharts(prev => prev.filter(c => c.id !== chartId));
        addToast("Chart removed", "info");
    };

    // --- Report State Management ---
    const toggleReportChart = (id: string) => {
        setReportCharts(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const toggleReportMessage = (id: string) => {
        setReportMessages(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    const switchView = (view: View) => {
        if (!activeDataset && view !== 'upload' && view !== 'history') {
            addToast('Please upload a dataset first.', "error");
            return;
        }
        setActiveView(view);
    };

    const renderContent = useCallback(() => {
        switch (activeView) {
            case 'dashboard':
                return activeDataset ? (
                    <DashboardView 
                        charts={charts} 
                        dataset={activeDataset} 
                        onAddCharts={handleAddChart}
                        onUpdateChart={handleUpdateChart}
                        onRemoveChart={handleRemoveChart}
                        reportCharts={reportCharts}
                        onToggleReportChart={toggleReportChart}
                        openReportBuilder={() => setShowReportBuilder(true)}
                    />
                ) : null;
            case 'data':
                 return activeDataset ? <DatasetViewer dataset={activeDataset} /> : null;
            case 'ml':
                return activeDataset ? <ModelManager 
                          dataset={activeDataset} 
                          models={mlModels.filter(m => m.datasetName === activeDataset.name)}
                          onCreateModel={handleModelCreation}
                       /> : null;
            case 'history':
                return <HistoryView datasets={datasets} models={mlModels} charts={charts} />;
            case 'upload':
            default:
                return <DatasetUploader onDatasetUpload={handleDatasetUpload} />;
        }
    }, [activeDataset, activeView, activeModel, charts, datasets, mlModels, reportCharts]);

    if (authLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500"></div>
            </div>
        );
    }

    if (!session) {
        return <LandingPage onGuestLogin={handleGuestLogin} />;
    }

    return (
        <div className="bg-gray-100 dark:bg-gray-900 min-h-screen transition-colors duration-200">
            {!activeProject ? (
                <div className="relative">
                    <button 
                        onClick={handleSignOutRequest}
                        className="absolute top-4 right-4 z-50 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white text-sm"
                    >
                        Sign Out ({session.user.email})
                    </button>
                    <ProjectSelector 
                        projects={projects}
                        onSelectProject={handleSelectProject}
                        onCreateProject={handleCreateProject}
                        onDeleteProject={handleDeleteProject}
                    />
                </div>
            ) : (
                <div className="flex h-screen font-sans relative overflow-hidden">
                    <Sidebar 
                        datasets={datasets}
                        models={mlModels}
                        activeDataset={activeDataset}
                        activeModel={activeModel}
                        setActiveDataset={setActiveDataset}
                        setActiveModel={setActiveModel}
                        switchView={switchView}
                        activeView={activeView}
                        collapsed={isSidebarCollapsed}
                        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                    />
                    
                    <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-gray-900">
                        <Header 
                            activeView={activeView} 
                            datasetName={activeDataset?.name} 
                            modelName={activeModel?.name}
                            projectName={activeProject.name}
                            saveStatus={saveStatus}
                            onSwitchProject={() => setActiveProject(null)}
                            isChatOpen={isChatOpen}
                            onToggleChat={() => setIsChatOpen(!isChatOpen)}
                        />
                        
                        <div className="flex-1 flex overflow-hidden relative">
                            {/* Main Content Area */}
                            <main className="flex-1 overflow-x-hidden overflow-y-auto p-4 sm:p-6 md:p-8 relative transition-all duration-300 ease-in-out">
                                {renderContent()}
                            </main>

                            {/* Chat Sidebar Panel */}
                            {activeDataset && (
                                <div 
                                    className={`border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex flex-col transition-all duration-300 ease-in-out ${
                                        isChatOpen ? 'w-[400px] opacity-100 translate-x-0' : 'w-0 opacity-0 translate-x-full overflow-hidden'
                                    }`}
                                >
                                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
                                        <h3 className="font-semibold flex items-center gap-2 text-lg text-gray-800 dark:text-white">
                                            <ChatIcon className="w-5 h-5 text-indigo-500" />
                                            Assistant
                                        </h3>
                                        <button 
                                            onClick={() => setIsChatOpen(false)} 
                                            className="hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg p-1.5 transition-colors text-gray-500 dark:text-gray-400"
                                            aria-label="Close Chat"
                                        >
                                            <XIcon className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <div className="flex-1 overflow-hidden relative">
                                         <ChatInterface 
                                            dataset={activeDataset} 
                                            model={activeModel} 
                                            messages={chatHistory}
                                            setMessages={setChatHistory}
                                            onNewChart={(chart) => handleAddChart([chart])}
                                            reportMessages={reportMessages}
                                            onToggleReportMessage={toggleReportMessage}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            
            <OnboardingTour 
                isActive={showOnboarding} 
                onComplete={handleOnboardingComplete} 
            />

            {/* Report Builder Modal - Global */}
            {showReportBuilder && activeDataset && (
                <ReportBuilder 
                    dataset={activeDataset} 
                    selectedCharts={charts.filter(c => reportCharts.has(c.id))} 
                    selectedMessages={chatHistory.filter(m => reportMessages.has(m.id)).map(m => m.text)}
                    onClose={() => setShowReportBuilder(false)} 
                />
            )}

            {activeProject && !showOnboarding && (
                <button 
                    onClick={() => setShowOnboarding(true)}
                    className="fixed bottom-6 left-6 w-10 h-10 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-full flex items-center justify-center shadow-lg border border-gray-200 dark:border-gray-700 z-40 transition-colors"
                    title="Start Tour"
                >
                    <HelpIcon className="w-5 h-5" />
                </button>
            )}
            
            {showGuestWarning && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md p-4 animate-fade-in-up">
                    <div className="bg-white dark:bg-gray-900 border border-red-200 dark:border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4 text-red-500 dark:text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Guest Data Warning</h2>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
                            You are currently using a Guest account. 
                            <br/><br/>
                            <span className="font-bold text-gray-800 dark:text-white">If you sign out now, all your projects and data will be permanently deleted from this device.</span>
                        </p>
                        <div className="space-y-3">
                             <Button onClick={handleGuestSave} className="w-full">
                                Create Account to Save Work
                            </Button>
                            <button 
                                onClick={performSignOut}
                                className="w-full py-2.5 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-lg transition-colors font-medium text-sm"
                            >
                                Delete Everything & Sign Out
                            </button>
                             <button 
                                onClick={() => setShowGuestWarning(false)}
                                className="w-full text-gray-500 hover:text-gray-800 dark:hover:text-white text-sm py-2"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <AuthModal 
                isOpen={showPasswordReset || showAuthModal}
                onClose={() => {
                    setShowPasswordReset(false);
                    setShowAuthModal(false);
                }}
                defaultMode={showAuthModal ? 'signup' : 'update_password'}
                onGuestLogin={handleGuestLogin} 
            />
        </div>
    );
};

export default function App() {
    return (
        <ThemeProvider>
            <ToastProvider>
                <DatalineApp />
            </ToastProvider>
        </ThemeProvider>
    );
}
