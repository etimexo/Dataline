
import React, { useState } from 'react';
import type { Dataset, MLModel, View } from '../../types';
import { UploadIcon, ChatIcon, DashboardIcon, DataIcon, MLIcon, HistoryIcon, BoltIcon, ChevronRightIcon, ChevronDownIcon } from '../ui/Icons';

interface SidebarProps {
    datasets: Dataset[];
    models: MLModel[];
    activeDataset: Dataset | null;
    activeModel: MLModel | null;
    setActiveDataset: (dataset: Dataset) => void;
    setActiveModel: (model: MLModel | null) => void;
    switchView: (view: View) => void;
    activeView: View;
    collapsed: boolean;
    onToggleCollapse: () => void;
}

const NavItem: React.FC<{ 
    icon: React.ReactNode, 
    label: string, 
    isActive: boolean, 
    onClick: () => void, 
    disabled?: boolean,
    collapsed: boolean 
}> = ({ icon, label, isActive, onClick, disabled = false, collapsed }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={collapsed ? label : undefined}
        className={`flex items-center w-full px-4 py-3 text-left text-sm font-medium rounded-xl transition-all duration-200 group relative
            ${isActive 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}
            ${collapsed ? 'justify-center px-2' : ''}`}
    >
        <span className={`transition-colors shrink-0 ${isActive ? 'text-white' : 'text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-white'}`}>
            {icon}
        </span>
        {!collapsed && <span className="ml-3 truncate">{label}</span>}
        {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-indigo-600 dark:bg-white/30 rounded-l-full"></div>}
    </button>
);

const Sidebar: React.FC<SidebarProps> = ({
    datasets,
    models,
    activeDataset,
    activeModel,
    setActiveDataset,
    setActiveModel,
    switchView,
    activeView,
    collapsed,
    onToggleCollapse
}) => {
    const isDataLoaded = !!activeDataset;
    const [hoveredDataset, setHoveredDataset] = useState<Dataset | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);

    const handleDatasetEnter = (e: React.MouseEvent, d: Dataset) => {
        if (collapsed) {
            const rect = e.currentTarget.getBoundingClientRect();
            setHoverPos(rect.top);
            setHoveredDataset(d);
        }
    };

    const handleDatasetLeave = () => {
        setHoveredDataset(null);
    };

    return (
        <aside 
            id="tour-sidebar" 
            className={`${collapsed ? 'w-20' : 'w-64'} bg-white dark:bg-gray-900/95 backdrop-blur-xl border-r border-gray-200 dark:border-white/5 flex flex-col p-3 shadow-2xl relative z-20 transition-all duration-300 ease-in-out`}
        >
            <div className={`flex items-center mb-8 px-2 ${collapsed ? 'justify-center' : ''}`}>
                 <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 shrink-0">
                    <MLIcon className="w-5 h-5" />
                 </div>
                {!collapsed && <h2 className="ml-3 text-xl font-bold text-gray-900 dark:text-white truncate">Dataline</h2>}
            </div>
            
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-none">
                {!collapsed && <h3 className="px-4 pt-2 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Workspace</h3>}
                
                <div id="tour-upload-section">
                    <NavItem collapsed={collapsed} icon={<UploadIcon />} label="Upload Data" isActive={activeView === 'upload'} onClick={() => switchView('upload')} />
                </div>
                <NavItem collapsed={collapsed} icon={<DashboardIcon />} label="Charts" isActive={activeView === 'dashboard'} onClick={() => switchView('dashboard')} disabled={!isDataLoaded}/>
                <NavItem collapsed={collapsed} icon={<DataIcon />} label="View Data" isActive={activeView === 'data'} onClick={() => switchView('data')} disabled={!isDataLoaded}/>
                <NavItem collapsed={collapsed} icon={<MLIcon />} label="ML Studio" isActive={activeView === 'ml'} onClick={() => switchView('ml')} disabled={!isDataLoaded}/>
                <NavItem collapsed={collapsed} icon={<HistoryIcon />} label="History" isActive={activeView === 'history'} onClick={() => switchView('history')} />
                
                {datasets.length > 0 && (
                    <div className="pt-6">
                        {!collapsed && <h3 className="px-4 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Datasets</h3>}
                        <div className="space-y-1">
                            {datasets.map(d => (
                                <button 
                                    key={d.name} 
                                    onClick={() => setActiveDataset(d)} 
                                    onMouseEnter={(e) => handleDatasetEnter(e, d)}
                                    onMouseLeave={handleDatasetLeave}
                                    className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors border border-transparent flex items-center gap-2 ${
                                        activeDataset?.name === d.name 
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border-gray-200 dark:border-white/5' 
                                        : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'
                                    } ${collapsed ? 'justify-center px-0' : ''}`}
                                    title={collapsed ? d.name : undefined}
                                >
                                    <div className={`w-2 h-2 rounded-full shrink-0 ${activeDataset?.name === d.name ? 'bg-indigo-500' : 'bg-gray-400 dark:bg-gray-600'}`}></div>
                                    {!collapsed && <span className="truncate">{d.name}</span>}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {!collapsed && models.length > 0 && (
                     <div className="pt-6">
                        <h3 className="px-4 pb-2 text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">ML Models</h3>
                        {models.map(m => (
                            <button key={m.id} onClick={() => setActiveModel(m)} className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors border border-transparent ${activeModel?.id === m.id ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-500/20' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5 hover:text-gray-900 dark:hover:text-white'}`}>
                                <div className="flex items-center gap-2">
                                    <BoltIcon className="w-3 h-3" />
                                    <span className="truncate">{m.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </nav>

            <div className="pt-4 border-t border-gray-200 dark:border-white/5 px-2 flex flex-col items-center">
                <button 
                    onClick={onToggleCollapse}
                    className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors w-full flex items-center justify-center gap-2 mb-2"
                    title={collapsed ? "Expand Sidebar" : "Collapse (Focus Mode)"}
                >
                    {collapsed ? <ChevronRightIcon className="w-4 h-4" /> : (
                        <>
                            <div className="rotate-180 transform"><ChevronRightIcon className="w-4 h-4" /></div>
                            <span className="text-xs font-medium">Collapse</span>
                        </>
                    )}
                </button>
                {!collapsed && <div className="text-xs text-gray-500 dark:text-gray-600 text-center">v2.5.2 &bull; Gemini 3.0</div>}
            </div>

            {/* Dataset Preview Popover (Only in collapsed mode) */}
            {collapsed && hoveredDataset && (
                <div 
                    className="fixed left-20 ml-2 w-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 shadow-2xl rounded-xl p-4 z-50 pointer-events-none animate-fade-in-up"
                    style={{ 
                        top: Math.min(Math.max(hoverPos - 20, 16), window.innerHeight - 200)
                    }}
                >
                    <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                        <h4 className="font-bold text-gray-900 dark:text-white text-sm truncate">{hoveredDataset.name}</h4>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                        {hoveredDataset.data.length} rows &bull; {hoveredDataset.columns.length} columns
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {hoveredDataset.columns.slice(0, 5).map(col => (
                            <span key={col} className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-[10px] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600">{col}</span>
                        ))}
                        {hoveredDataset.columns.length > 5 && <span className="text-[10px] text-gray-400">...</span>}
                    </div>
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
