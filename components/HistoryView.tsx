
import React from 'react';
import type { Dataset, MLModel, ChartConfig } from '../types';
import Card from './ui/Card';

interface HistoryViewProps {
    datasets: Dataset[];
    models: MLModel[];
    charts: ChartConfig[];
}

const HistoryView: React.FC<HistoryViewProps> = ({ datasets, models, charts }) => {
    return (
        <div className="space-y-8 h-full">
            <div className="flex items-center justify-between mb-6">
                 <h2 className="text-2xl font-bold">Activity History & Assets</h2>
                 <span className="text-sm text-gray-400">{datasets.length + models.length + charts.length} total items</span>
            </div>
            
            <section>
                <div className="flex items-center gap-2 mb-4">
                     <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                     <h3 className="text-xl font-semibold text-gray-200">Datasets Uploaded</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {datasets.length === 0 ? <p className="text-gray-500 italic">No datasets uploaded yet.</p> : 
                        datasets.map((d, i) => (
                            <Card key={i} className="bg-gray-800 border-gray-700 hover:border-blue-500 transition-colors cursor-default">
                                <h4 className="font-bold text-lg text-white truncate">{d.name}</h4>
                                <p className="text-sm text-gray-400 mt-2">{d.data.length} rows, {d.columns.length} columns</p>
                            </Card>
                        ))
                    }
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                     <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                     <h3 className="text-xl font-semibold text-gray-200">Trained Models</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {models.length === 0 ? <p className="text-gray-500 italic">No models created yet.</p> :
                        models.map((m) => (
                            <Card key={m.id} className="bg-gray-800 border-gray-700 hover:border-purple-500 transition-colors cursor-default">
                                <h4 className="font-bold text-lg text-white">{m.name}</h4>
                                <p className="text-xs font-semibold text-purple-400 mb-2 uppercase tracking-wide">{m.modelType}</p>
                                <p className="text-sm text-gray-300 line-clamp-2">{m.description}</p>
                                <div className="mt-3 text-xs text-gray-500 bg-gray-900 rounded p-2 inline-block">
                                    Target: <span className="text-gray-300">{m.target}</span>
                                </div>
                            </Card>
                        ))
                    }
                </div>
            </section>

            <section>
                <div className="flex items-center gap-2 mb-4">
                     <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
                     <h3 className="text-xl font-semibold text-gray-200">Generated Charts</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {charts.length === 0 ? <p className="text-gray-500 italic">No charts generated yet.</p> :
                        charts.map((c) => (
                            <Card key={c.id} className="bg-gray-800 border-gray-700 hover:border-yellow-500 transition-colors cursor-default">
                                <h4 className="font-bold text-lg text-white">{c.title}</h4>
                                <p className="text-sm text-gray-400 mt-1 capitalize">Type: <span className="text-yellow-400">{c.type}</span></p>
                                <div className="text-xs text-gray-500 mt-3 flex flex-col gap-1">
                                    <span>X: {c.xKey}</span>
                                    <span>Y: {Array.isArray(c.yKey) ? c.yKey.join(', ') : c.yKey}</span>
                                </div>
                            </Card>
                        ))
                    }
                </div>
            </section>
        </div>
    );
};

export default HistoryView;
