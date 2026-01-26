
import React, { useState } from 'react';
import type { Dataset, MLModel, View } from '../../types';
import { UploadIcon, ChatIcon, DashboardIcon, DataIcon, MLIcon, HistoryIcon, BoltIcon } from '../ui/Icons';

interface SidebarProps {
    datasets: Dataset[];
    models: MLModel[];
    activeDataset: Dataset | null;
    activeModel: MLModel | null;
    setActiveDataset: (dataset: Dataset) => void;
    setActiveModel: (model: MLModel | null) => void;
    switchView: (view: View) => void;
    activeView: View;
}

const NavItem: React.FC<{ icon: React.ReactNode, label: string, isActive: boolean, onClick: () => void, disabled?: boolean }> = ({ icon, label, isActive, onClick, disabled = false }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        className={`flex items-center w-full px-4 py-3 text-left text-sm font-medium rounded-xl transition-all duration-200 group relative
            ${isActive 
                ? 'bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-500/20' 
                : 'text-gray-400 hover:bg-white/5 hover:text-white'}
            ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
    >
        <span className={`transition-colors ${isActive ? 'text-white' : 'text-gray-500 group-hover:text-white'}`}>
            {icon}
        </span>
        <span className="ml-3">{label}</span>
        {isActive && <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white/30 rounded-l-full"></div>}
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
    activeView
}) => {
    const isDataLoaded = !!activeDataset;
    const [hoveredDataset, setHoveredDataset] = useState<Dataset | null>(null);
    const [hoverPos, setHoverPos] = useState<number>(0);

    const handleDatasetEnter = (e: React.MouseEvent, d: Dataset) => {
        const rect = e.currentTarget.getBoundingClientRect();
        setHoverPos(rect.top);
        setHoveredDataset(d);
    };

    const handleDatasetLeave = () => {
        setHoveredDataset(null);
    };

    return (
        <aside className="w-64 bg-gray-900/95 backdrop-blur-xl border-r border-white/5 flex flex-col p-4 shadow-2xl relative z-20">
            <div className="flex items-center mb-8 px-2">
                 <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                    <MLIcon className="w-5 h-5" />
                 </div>
                <h2 className="ml-3 text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">Dataline</h2>
            </div>
            
            <nav className="flex-1 space-y-1.5 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                <h3 className="px-4 pt-2 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Workspace</h3>
                <NavItem icon={<UploadIcon />} label="Upload Data" isActive={activeView === 'upload'} onClick={() => switchView('upload')} />
                <NavItem icon={<DashboardIcon />} label="Charts" isActive={activeView === 'dashboard'} onClick={() => switchView('dashboard')} disabled={!isDataLoaded}/>
                <NavItem icon={<DataIcon />} label="View Data" isActive={activeView === 'data'} onClick={() => switchView('data')} disabled={!isDataLoaded}/>
                <NavItem icon={<MLIcon />} label="ML Studio" isActive={activeView === 'ml'} onClick={() => switchView('ml')} disabled={!isDataLoaded}/>
                <NavItem icon={<HistoryIcon />} label="History" isActive={activeView === 'history'} onClick={() => switchView('history')} />
                
                {datasets.length > 0 && (
                    <div className="pt-6">
                        <h3 className="px-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">Datasets</h3>
                        <div className="space-y-1">
                            {datasets.map(d => (
                                <button 
                                    key={d.name} 
                                    onClick={() => setActiveDataset(d)} 
                                    onMouseEnter={(e) => handleDatasetEnter(e, d)}
                                    onMouseLeave={handleDatasetLeave}
                                    className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors border border-transparent ${
                                        activeDataset?.name === d.name 
                                        ? 'bg-gray-800 text-white border-white/5' 
                                        : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                    }`}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-1.5 h-1.5 rounded-full ${activeDataset?.name === d.name ? 'bg-indigo-500' : 'bg-gray-600'}`}></div>
                                        <span className="truncate">{d.name}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {models.length > 0 && (
                     <div className="pt-6">
                        <h3 className="px-4 pb-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">ML Models</h3>
                        <button onClick={() => setActiveModel(null)} className={`w-full text-left px-4 py-2 text-sm rounded-lg mb-1 transition-colors ${!activeModel ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-white/5'}`}>
                            None
                        </button>
                        {models.map(m => (
                            <button key={m.id} onClick={() => setActiveModel(m)} className={`w-full text-left px-4 py-2 text-sm rounded-lg transition-colors border border-transparent ${activeModel?.id === m.id ? 'bg-purple-900/30 text-purple-300 border-purple-500/20' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}>
                                <div className="flex items-center gap-2">
                                    <BoltIcon className="w-3 h-3" />
                                    <span className="truncate">{m.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </nav>

            <div className="pt-4 border-t border-white/5 px-2">
                <div className="text-xs text-gray-600 text-center">v2.5.1 &bull; Gemini 3.0</div>
            </div>

            {/* Dataset Preview Popover */}
            {hoveredDataset && (
                <div 
                    className="fixed left-64 ml-4 w-96 bg-gray-800 border border-gray-600 shadow-2xl rounded-xl p-4 z-50 pointer-events-none animate-fade-in-up"
                    style={{ 
                        top: Math.min(Math.max(hoverPos - 60, 16), window.innerHeight - 350)
                    }}
                >
                    <div className="flex items-center justify-between mb-3 border-b border-gray-700 pb-2">
                        <div>
                            <h4 className="font-bold text-white text-sm truncate max-w-[200px]">{hoveredDataset.name}</h4>
                            <div className="text-xs text-gray-400 mt-0.5">
                                {hoveredDataset.data.length} rows &bull; {hoveredDataset.columns.length} cols
                            </div>
                        </div>
                        <div className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-1 rounded font-mono uppercase">
                            Preview
                        </div>
                    </div>
                    
                    <div className="overflow-hidden rounded-lg border border-gray-700 bg-gray-900/50">
                        <table className="w-full text-[10px] text-left text-gray-400">
                            <thead className="bg-gray-800 text-gray-300">
                                <tr>
                                    {hoveredDataset.columns.slice(0, 3).map(col => (
                                        <th key={col} className="px-2 py-1 font-medium truncate max-w-[80px]">{col}</th>
                                    ))}
                                    {hoveredDataset.columns.length > 3 && <th className="px-2 py-1">...</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {hoveredDataset.data.slice(0, 5).map((row, i) => (
                                    <tr key={i} className="border-b border-gray-700/50 last:border-0">
                                        {hoveredDataset.columns.slice(0, 3).map(col => (
                                            <td key={col} className="px-2 py-1 truncate max-w-[80px]">{String(row[col])}</td>
                                        ))}
                                         {hoveredDataset.columns.length > 3 && <td className="px-2 py-1">...</td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {hoveredDataset.columns.length > 3 && (
                        <div className="mt-2 text-[10px] text-gray-500 italic">
                            + {hoveredDataset.columns.length - 3} more columns
                        </div>
                    )}
                </div>
            )}
        </aside>
    );
};

export default Sidebar;
