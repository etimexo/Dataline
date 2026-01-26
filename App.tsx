
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
import Button from './components/ui/Button';
import { ChatIcon, XIcon } from './components/ui/Icons';
import { ToastProvider, useToast } from './components/ui/Toast';

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
    
    // --- UI State ---
    const [activeView, setActiveView] = useState<View>('upload');
    const [isChatOpen, setIsChatOpen] = useState(false);

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

    const loadUserProjects = async (userId: string) => {
        try {
            const dbProjects = await loadProjectsFromDB(userId);
            // Only overwrite if we found data in DB. If DB is empty, 
            // we might be converting a guest to a user, so we keep current state
            // to allow it to be saved to the new ID in the auto-save effect.
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
        setIsChatOpen(false);
    };

    const handleDatasetUpload = (dataset: Dataset) => {
        setDatasets(prev => [...prev, dataset]);
        setActiveDataset(dataset);
        setActiveView('dashboard');
        setIsChatOpen(true);
        addToast("Dataset uploaded & ready", "success");

        const firstMessage: ChatMessage = { 
            id: `init-${Date.now()}`, 
            sender: 'ai', 
            text: `Hello! I'm your Dataline assistant. I've loaded "**${dataset.name}**".\n\nYou can ask me to:\n* Visualize trends (e.g., "Show me a bar chart of Sales by Region")\n* Analyze patterns (e.g., "What is the correlation between price and demand?")\n* Build ML models (e.g., "Predict future sales")`
        };
        setChatHistory(prev => [...prev, firstMessage]);
    };

    const handleModelCreation = (model: MLModel) => {
        setMlModels(prev => [...prev, model]);
        setActiveModel(model);
        setIsChatOpen(true);
        addToast(`Model "${model.name}" created`, "success");
    };

    const handleAddChart = (newCharts: ChartConfig[]) => {
        setCharts(prev => [...prev, ...newCharts]);
        addToast(`${newCharts.length} chart(s) added to dashboard`, "success");
    };

    const handleRemoveChart = (chartId: string) => {
        setCharts(prev => prev.filter(c => c.id !== chartId));
        addToast("Chart removed", "info");
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
                        onRemoveChart={handleRemoveChart}
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
    }, [activeDataset, activeView, activeModel, charts, datasets, mlModels]);

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
        <>
            {!activeProject ? (
                <div className="relative">
                    <button 
                        onClick={handleSignOutRequest}
                        className="absolute top-4 right-4 z-50 text-gray-400 hover:text-white text-sm"
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
                <div className="flex h-screen bg-gray-900 text-gray-100 font-sans relative">
                    <Sidebar 
                        datasets={datasets}
                        models={mlModels}
                        activeDataset={activeDataset}
                        activeModel={activeModel}
                        setActiveDataset={setActiveDataset}
                        setActiveModel={setActiveModel}
                        switchView={switchView}
                        activeView={activeView}
                    />
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <Header 
                            activeView={activeView} 
                            datasetName={activeDataset?.name} 
                            modelName={activeModel?.name}
                            projectName={activeProject.name}
                            saveStatus={saveStatus}
                            onSwitchProject={() => setActiveProject(null)}
                        />
                        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-900 p-4 sm:p-6 md:p-8 relative">
                            {renderContent()}
                        </main>
                    </div>

                    {/* Floating Chat Bubble */}
                    {activeDataset && (
                        <>
                            <div 
                                className={`fixed bottom-24 right-6 w-[90vw] md:w-[500px] bg-gray-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden transition-all duration-300 origin-bottom-right z-50 flex flex-col ${
                                    isChatOpen 
                                    ? 'opacity-100 scale-100 translate-y-0 h-[85vh] max-h-[900px]' 
                                    : 'opacity-0 scale-90 translate-y-10 h-0 pointer-events-none'
                                }`}
                            >
                                <div className="flex items-center justify-between p-4 bg-indigo-600 text-white shadow-md">
                                    <h3 className="font-semibold flex items-center gap-2 text-lg">
                                        <ChatIcon className="w-6 h-6" />
                                        Dataline Assistant
                                    </h3>
                                    <button 
                                        onClick={() => setIsChatOpen(false)} 
                                        className="hover:bg-indigo-700 rounded-lg p-2 transition-colors flex items-center justify-center"
                                        aria-label="Close Chat"
                                    >
                                        <XIcon className="w-6 h-6" />
                                    </button>
                                </div>
                                <div className="flex-1 overflow-hidden relative bg-gray-900">
                                     <ChatInterface 
                                        dataset={activeDataset} 
                                        model={activeModel} 
                                        messages={chatHistory}
                                        setMessages={setChatHistory}
                                        onNewChart={(chart) => handleAddChart([chart])}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setIsChatOpen(!isChatOpen)}
                                className={`fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50 hover:scale-110 ${
                                    isChatOpen ? 'bg-gray-600 rotate-90 shadow-xl' : 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-500/30'
                                }`}
                                title={isChatOpen ? "Close Chat" : "Open Assistant"}
                            >
                                {isChatOpen ? <XIcon className="w-6 h-6 text-white" /> : <ChatIcon className="w-8 h-8 text-white" />}
                            </button>
                        </>
                    )}
                </div>
            )}
            
            {/* Guest Sign Out Warning Modal */}
            {showGuestWarning && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-md p-4 animate-fade-in-up">
                    <div className="bg-gray-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4 text-red-400">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
                                <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                            </svg>
                            <h2 className="text-xl font-bold text-white">Guest Data Warning</h2>
                        </div>
                        <p className="text-gray-300 mb-6 leading-relaxed">
                            You are currently using a Guest account. 
                            <br/><br/>
                            <span className="font-bold text-white">If you sign out now, all your projects and data will be permanently deleted from this device.</span>
                        </p>
                        <div className="space-y-3">
                             <Button onClick={handleGuestSave} className="w-full">
                                Create Account to Save Work
                            </Button>
                            <button 
                                onClick={performSignOut}
                                className="w-full py-2.5 bg-red-900/20 hover:bg-red-900/40 text-red-400 border border-red-500/30 rounded-lg transition-colors font-medium text-sm"
                            >
                                Delete Everything & Sign Out
                            </button>
                             <button 
                                onClick={() => setShowGuestWarning(false)}
                                className="w-full text-gray-500 hover:text-white text-sm py-2"
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
        </>
    );
};

export default function App() {
    return (
        <ToastProvider>
            <DatalineApp />
        </ToastProvider>
    );
}
