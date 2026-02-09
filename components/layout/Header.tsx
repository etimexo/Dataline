
import React from 'react';
import type { View } from '../../types';
import { DashboardIcon, SunIcon, MoonIcon, ChatIcon } from '../ui/Icons';
import { useTheme } from '../ui/ThemeContext';

interface HeaderProps {
    activeView: View;
    datasetName?: string;
    modelName?: string;
    projectName?: string;
    saveStatus?: 'saved' | 'saving' | 'error';
    onSwitchProject: () => void;
    isChatOpen: boolean;
    onToggleChat: () => void;
}

const viewTitles: Record<string, string> = {
    upload: 'Upload Dataset',
    dashboard: 'Charts',
    data: 'Dataset Viewer',
    ml: 'Machine Learning Studio',
    history: 'Activity History'
};

const Header: React.FC<HeaderProps> = ({ 
    activeView, 
    datasetName, 
    modelName, 
    projectName, 
    saveStatus = 'saved', 
    onSwitchProject,
    isChatOpen,
    onToggleChat
}) => {
    const { theme, toggleTheme } = useTheme();

    return (
        <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 shadow-sm dark:shadow-md p-4 flex items-center justify-between shrink-0 h-16 transition-colors duration-200 z-30 relative">
            <div className="flex items-center gap-4">
                <button 
                    onClick={onSwitchProject}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-xs text-gray-700 dark:text-gray-300 transition-colors"
                >
                    <DashboardIcon className="w-4 h-4" />
                    All Projects
                </button>
                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700"></div>
                <h1 className="text-xl font-semibold text-gray-900 dark:text-white truncate max-w-[200px] md:max-w-md">
                    {projectName ? `${projectName} / ` : ''} 
                    <span className="text-indigo-600 dark:text-indigo-400">{viewTitles[activeView] || 'Dashboard'}</span>
                </h1>
            </div>
            
            <div className="flex items-center gap-4">
                {/* Auto-save Indicator */}
                {projectName && (
                    <div className="flex items-center gap-2 text-xs hidden md:flex">
                        {saveStatus === 'saving' && (
                            <>
                                <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                                <span className="text-gray-500 dark:text-gray-400">Saving...</span>
                            </>
                        )}
                        {saveStatus === 'saved' && (
                            <>
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span className="text-gray-500 dark:text-gray-400">Auto-saved</span>
                            </>
                        )}
                        {saveStatus === 'error' && (
                            <>
                                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                                <span className="text-red-500 dark:text-red-400">Save Failed</span>
                            </>
                        )}
                    </div>
                )}

                <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center space-x-4 hidden lg:flex">
                    {datasetName && (
                        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700">
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase">Data:</span>
                            <span className="truncate max-w-[150px]">{datasetName}</span>
                        </div>
                    )}
                    {modelName && (
                        <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full border border-gray-300 dark:border-gray-700">
                            <span className="font-semibold text-gray-700 dark:text-gray-300 text-xs uppercase">Model:</span>
                            <span className="truncate max-w-[150px]">{modelName}</span>
                        </div>
                    )}
                </div>

                <div className="h-6 w-px bg-gray-300 dark:bg-gray-700 hidden md:block"></div>

                <button 
                    onClick={toggleTheme}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
                    aria-label="Toggle theme"
                >
                    {theme === 'dark' ? (
                        <SunIcon className="w-5 h-5 transition-transform hover:rotate-90" />
                    ) : (
                        <MoonIcon className="w-5 h-5 transition-transform hover:-rotate-12" />
                    )}
                </button>

                <button
                    onClick={onToggleChat}
                    className={`p-2 rounded-lg flex items-center gap-2 transition-colors border ${
                        isChatOpen 
                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
                        : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                    title={isChatOpen ? "Close AI Assistant" : "Open AI Assistant"}
                >
                    <ChatIcon className="w-5 h-5" />
                    <span className="hidden md:inline text-sm font-medium">AI Chat</span>
                </button>
            </div>
        </header>
    );
};

export default Header;
