
import React, { useState } from 'react';
import type { Project } from '../types';
import Button from './ui/Button';
import { PlusIcon, DashboardIcon, XIcon } from './ui/Icons';
import Card from './ui/Card';

interface ProjectSelectorProps {
    projects: Project[];
    onSelectProject: (project: Project) => void;
    onCreateProject: (name: string, description: string) => void;
    onDeleteProject: (id: string) => void;
}

const ProjectSelector: React.FC<ProjectSelectorProps> = ({ projects, onSelectProject, onCreateProject, onDeleteProject }) => {
    const [showNewModal, setShowNewModal] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [newName, setNewName] = useState('');
    const [newDesc, setNewDesc] = useState('');

    const handleCreate = () => {
        if (!newName.trim()) return;
        onCreateProject(newName, newDesc);
        setShowNewModal(false);
        setNewName('');
        setNewDesc('');
    };

    const confirmDelete = () => {
        if (projectToDelete) {
            onDeleteProject(projectToDelete.id);
            setProjectToDelete(null);
        }
    };

    const formatDate = (ts: number) => new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

    return (
        <div className="min-h-screen bg-[#0a0a0c] text-gray-100 p-8 relative overflow-hidden">
            {/* Background elements */}
            <div className="fixed inset-0 pointer-events-none">
                 <div className="absolute -top-[20%] -left-[10%] w-[700px] h-[700px] bg-indigo-900/10 rounded-full blur-[120px]"></div>
                 <div className="absolute top-[40%] right-[0%] w-[500px] h-[500px] bg-purple-900/10 rounded-full blur-[100px]"></div>
            </div>

            <div className="max-w-6xl mx-auto relative z-10">
                <div className="flex justify-between items-center mb-12 animate-fade-in-up">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
                        <p className="text-gray-400">Select a project to continue your analysis or start a new one.</p>
                    </div>
                    <Button onClick={() => setShowNewModal(true)} className="flex items-center gap-2 px-6 py-3 text-lg shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 transition-shadow">
                        <PlusIcon className="w-5 h-5" />
                        New Project
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {/* Create New Card (Visual) */}
                    <button 
                        onClick={() => setShowNewModal(true)}
                        className="h-64 border-2 border-dashed border-gray-800 rounded-2xl p-8 flex flex-col items-center justify-center text-gray-500 hover:text-indigo-400 hover:border-indigo-500/50 hover:bg-gray-900/50 transition-all duration-300 group animate-fade-in-up"
                        style={{ animationDelay: '0.1s' }}
                    >
                        <div className="w-16 h-16 rounded-full bg-gray-900 group-hover:bg-indigo-900/30 flex items-center justify-center mb-4 transition-colors ring-1 ring-white/5">
                            <PlusIcon className="w-8 h-8" />
                        </div>
                        <span className="font-semibold text-lg">Create New Project</span>
                    </button>

                    {/* Project List */}
                    {projects.sort((a, b) => b.lastModified - a.lastModified).map((project, index) => (
                        <div 
                            key={project.id} 
                            className="relative group animate-fade-in-up"
                            style={{ animationDelay: `${0.15 + (index * 0.05)}s` }}
                        >
                            <button 
                                onClick={() => onSelectProject(project)}
                                className="w-full text-left"
                            >
                                <div className="h-64 flex flex-col bg-gray-900/60 backdrop-blur-sm border border-white/5 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-gray-800/80 transition-all duration-300 relative overflow-hidden group-hover:shadow-2xl group-hover:shadow-indigo-500/10 hover:-translate-y-1">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                    
                                    <div className="flex items-start justify-between mb-4 relative z-10">
                                        <div className="p-3 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl text-indigo-400 border border-white/5">
                                            <DashboardIcon className="w-6 h-6" />
                                        </div>
                                        <span className="text-xs text-gray-500 font-mono bg-black/20 px-2 py-1 rounded">
                                            {formatDate(project.lastModified)}
                                        </span>
                                    </div>

                                    <h3 className="text-xl font-bold text-white mb-2 truncate relative z-10">{project.name}</h3>
                                    <p className="text-gray-400 text-sm line-clamp-2 mb-6 flex-grow relative z-10">{project.description || "No description provided."}</p>

                                    <div className="flex gap-4 text-xs text-gray-500 mt-auto pt-4 border-t border-white/5 relative z-10">
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-200 text-lg">{project.datasets.length}</span>
                                            <span>Datasets</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-200 text-lg">{project.charts.length}</span>
                                            <span>Charts</span>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-gray-200 text-lg">{project.models.length}</span>
                                            <span>Models</span>
                                        </div>
                                    </div>
                                </div>
                            </button>
                            <button 
                                onClick={(e) => { e.stopPropagation(); setProjectToDelete(project); }}
                                className="absolute top-4 right-4 p-2 text-gray-500 hover:text-red-400 hover:bg-red-900/20 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20"
                                title="Delete Project"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            {/* New Project Modal */}
            {showNewModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md animate-fade-in-up duration-150">
                    <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-700 shadow-2xl relative">
                        <button onClick={() => setShowNewModal(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white">
                            <XIcon className="w-6 h-6" />
                        </button>
                        <h2 className="text-2xl font-bold text-white mb-6">Start New Project</h2>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Project Name</label>
                                <input 
                                    autoFocus
                                    type="text" 
                                    className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                                    placeholder="e.g., Q4 Sales Analysis"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && handleCreate()}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Description (Optional)</label>
                                <textarea 
                                    className="w-full bg-black/40 border border-gray-600 rounded-lg p-3 text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none h-24"
                                    placeholder="What is this analysis about?"
                                    value={newDesc}
                                    onChange={e => setNewDesc(e.target.value)}
                                />
                            </div>
                            <Button onClick={handleCreate} className="w-full mt-2 py-3" disabled={!newName.trim()}>
                                Create Project
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {projectToDelete && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 backdrop-blur-md animate-fade-in-up duration-150">
                    <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-red-500/20 shadow-2xl relative">
                        <h2 className="text-2xl font-bold text-white mb-2">Delete Project?</h2>
                        <p className="text-gray-300 mb-6">
                            Are you sure you want to delete <span className="font-bold text-white">"{projectToDelete.name}"</span>?
                        </p>
                        
                        <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-8">
                            <div className="flex gap-3">
                                <div className="text-red-400 mt-0.5">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                                        <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
                                    </svg>
                                </div>
                                <div className="text-sm text-red-200">
                                    <p className="font-bold mb-1">Warning: Permanent Data Loss</p>
                                    <p>This action cannot be undone. You will lose:</p>
                                    <ul className="list-disc list-inside mt-1 ml-1 opacity-90">
                                        <li>{projectToDelete.datasets.length} Uploaded Datasets</li>
                                        <li>{projectToDelete.charts.length} Charts & Dashboards</li>
                                        <li>{projectToDelete.models.length} Trained ML Models</li>
                                        <li>All Chat History</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button 
                                onClick={() => setProjectToDelete(null)}
                                className="flex-1 px-4 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors font-medium border border-gray-700"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={confirmDelete}
                                className="flex-1 px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-lg shadow-red-900/20"
                            >
                                Delete Project
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectSelector;
