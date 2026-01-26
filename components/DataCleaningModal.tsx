
import React, { useState } from 'react';
import type { CleaningOperation, DataQualityReport } from '../services/dataService';
import Button from './ui/Button';
import { XIcon, BoltIcon } from './ui/Icons';

interface DataCleaningModalProps {
    filename: string;
    report: DataQualityReport;
    initialSuggestions: CleaningOperation[];
    onApply: (operations: CleaningOperation[]) => void;
    onSkip: () => void;
}

const DataCleaningModal: React.FC<DataCleaningModalProps> = ({ 
    filename, 
    report, 
    initialSuggestions, 
    onApply, 
    onSkip 
}) => {
    const [operations, setOperations] = useState<CleaningOperation[]>(initialSuggestions);

    const toggleOperation = (index: number) => {
        setOperations(prev => prev.map((op, i) => 
            i === index ? { ...op, enabled: !op.enabled } : op
        ));
    };

    const enabledCount = operations.filter(op => op.enabled).length;

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] backdrop-blur-sm p-4 animate-fade-in-up">
            <div className="bg-gray-900 border border-indigo-500/30 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-indigo-900/50 to-gray-900 border-b border-white/10 flex justify-between items-start">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                            <BoltIcon className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Data Quality Check</h2>
                            <p className="text-indigo-200 text-sm mt-1">
                                AI has analyzed <span className="font-mono text-white bg-white/10 px-1 rounded">{filename}</span> and found potential improvements.
                            </p>
                        </div>
                    </div>
                    <button onClick={onSkip} className="text-gray-400 hover:text-white transition-colors">
                        <XIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-gray-700">
                    
                    {/* Quick Stats Grid */}
                    <div className="grid grid-cols-3 gap-4 mb-8">
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center">
                            <div className="text-sm text-gray-400">Total Rows</div>
                            <div className="text-2xl font-bold text-white">{report.totalRows.toLocaleString()}</div>
                        </div>
                        <div className={`bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center ${report.duplicateRows > 0 ? 'border-yellow-500/50 bg-yellow-900/10' : ''}`}>
                            <div className="text-sm text-gray-400">Duplicates</div>
                            <div className={`text-2xl font-bold ${report.duplicateRows > 0 ? 'text-yellow-400' : 'text-green-400'}`}>
                                {report.duplicateRows}
                            </div>
                        </div>
                        <div className="bg-gray-800/50 p-4 rounded-lg border border-gray-700 text-center">
                            <div className="text-sm text-gray-400">Columns w/ Missing</div>
                            <div className="text-2xl font-bold text-white">
                                {Object.values(report.missingValues).filter((v) => (v as number) > 0).length}
                            </div>
                        </div>
                    </div>

                    {/* Suggestions List */}
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Suggested Cleaning Actions</h3>
                        {operations.length > 0 && (
                            <div className="flex gap-3 text-xs">
                                <button 
                                    onClick={() => setOperations(prev => prev.map(op => ({ ...op, enabled: true })))}
                                    className="text-indigo-400 hover:text-indigo-300"
                                >
                                    Select All
                                </button>
                                <button 
                                    onClick={() => setOperations(prev => prev.map(op => ({ ...op, enabled: false })))}
                                    className="text-gray-500 hover:text-gray-300"
                                >
                                    Deselect All
                                </button>
                            </div>
                        )}
                    </div>
                    
                    {operations.length === 0 ? (
                        <div className="p-8 border border-dashed border-gray-700 rounded-xl text-center text-gray-500 bg-gray-800/20">
                            <p>Great news! No critical issues were found in your dataset.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {operations.map((op, idx) => (
                                <div 
                                    key={idx} 
                                    className={`flex items-start gap-3 p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
                                        op.enabled 
                                        ? 'bg-indigo-900/20 border-indigo-500/50 shadow-sm' 
                                        : 'bg-gray-800 border-gray-700 opacity-70 hover:opacity-100'
                                    }`}
                                    onClick={() => toggleOperation(idx)}
                                >
                                    <div className={`mt-1 w-5 h-5 rounded border flex items-center justify-center flex-shrink-0 transition-colors ${
                                        op.enabled ? 'bg-indigo-500 border-indigo-500' : 'border-gray-500'
                                    }`}>
                                        {op.enabled && (
                                            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className={`font-semibold ${op.enabled ? 'text-white' : 'text-gray-400'}`}>
                                                {op.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                            </span>
                                            {op.column && (
                                                <span className="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded font-mono">
                                                    {op.column}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-gray-400 leading-relaxed">{op.description}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}

                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-gray-900 border-t border-white/10 flex justify-between items-center">
                    <button 
                        onClick={onSkip}
                        className="text-gray-400 hover:text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                        Skip Cleaning
                    </button>
                    <Button onClick={() => onApply(operations)}>
                        {enabledCount > 0 ? `Apply ${enabledCount} Fixes & Continue` : 'Continue Without Changes'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DataCleaningModal;
