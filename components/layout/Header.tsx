
import React from 'react';
import type { View } from '../../types';
import { DashboardIcon, BoltIcon } from '../ui/Icons';

interface HeaderProps {
    activeView: View;
    datasetName?: string;
    modelName?: string;
    projectName?: string;
    saveStatus?: 'saved' | 'saving' | 'error';
    onSwitchProject: () => void;
}

const viewTitles: Record<string, string> = {
    upload: 'Upload Dataset',
    dashboard: 'Charts',
    data: 'Dataset Viewer',
    ml: 'Machine Learning Studio',
    history: 'Activity History'
};

const Header: React.FC<HeaderProps> = ({ activeView, datasetName, modelName, projectName, saveStatus = 'saved', onSwitchProject }) => {
    return (
        <header className="bg-gray-900 border-b border-gray-700 shadow-md p-4 flex items-center justify-between shrink-0 h-16">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onSwitchProject}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded-lg text-xs text-gray-300 transition-colors"
                >
                    <DashboardIcon />
                    All Projects
                </button>
                <div className="h-6 w-px bg-gray-700"></div>
                <h1 className="text-xl font-semibold text-white">
                    {projectName ? `${projectName} / ` : ''} 
                    <span className="text-indigo-400">{viewTitles[activeView] || 'Dashboard'}</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-6">
                {/* Auto-save Indicator */}
                {projectName && (
                    <div className="flex items-center gap-2 text-xs">
                        {saveStatus === 'saving' && (
                            <>
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                <span className="text-gray-400">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-gray-500">Auto-saved</span>
                            </>
                        )}
                        {saveStatus === 'error' && (
                            <>
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-red-400">Save Failed (Storage Full)</span>
                            </>
                        )}
                    </div>
                )}

                <div className="text-sm text-gray-400 flex items-center space-x-4 hidden md:flex">
                    {datasetName && (
                        <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                            <span className="font-semibold text-gray-300 text-xs uppercase">Data:</span>
                            <span className="truncate max-w-[150px]">{datasetName}</span>
                        </div>
                    )}
                    {modelName && (
                        <div className="flex items-center space-x-2 bg-gray-800 px-3 py-1 rounded-full border border-gray-700">
                            <span className="font-semibold text-gray-300 text-xs uppercase">Model:</span>
                            <span className="truncate max-w-[150px]">{modelName}</span>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
};

export default Header;
