
import React, { useState, useEffect, useRef } from 'react';
import type { Dataset, MLModel } from '../types';
import { guideModelCreation } from '../services/geminiService';
import Button from './ui/Button';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface ModelManagerProps {
    dataset: Dataset;
    models: MLModel[];
    onCreateModel: (model: MLModel) => void;
}

type Step = 'initial' | 'target' | 'features' | 'name' | 'training' | 'done';
type ViewMode = 'wizard' | 'compare';

// --- Training Simulation Component ---

const TrainingVisualizer: React.FC<{ model: MLModel; onComplete: () => void }> = ({ model, onComplete }) => {
    const [epochs, setEpochs] = useState<any[]>([]);
    const [currentEpoch, setCurrentEpoch] = useState(0);
    const TOTAL_EPOCHS = 50; // Total simulated epochs
    const scrollRef = useRef<HTMLDivElement>(null);

    // 1. Parse the AI's predicted metrics to set a realistic "Target" for the simulation
    const primaryMetric = model.metrics?.[0] || { name: 'Accuracy', value: '85%' };
    const metricName = primaryMetric.name;
    const metricValueStr = primaryMetric.value.toString();
    const isPercentage = metricValueStr.includes('%');
    const targetValue = parseFloat(metricValueStr.replace('%', ''));

    // Heuristic: Does this metric typically go UP (Accuracy, R2) or DOWN (RMSE, Loss)?
    const isAscendingMetric = !['RMSE', 'MAE', 'MSE', 'LOSS', 'ERROR'].some(k => metricName.toUpperCase().includes(k));

    useEffect(() => {
        // Simulation Loop
        const interval = setInterval(() => {
            setCurrentEpoch(prev => {
                if (prev >= TOTAL_EPOCHS) {
                    clearInterval(interval);
                    setTimeout(onComplete, 1500); // Slight pause at 100% before finishing
                    return prev;
                }
                
                const epoch = prev + 1;
                const progress = epoch / TOTAL_EPOCHS;

                // Simulate Loss: Exponential decay from ~2.0 down to ~0.1
                // Formula: start + (end - start) * (1 - exp(-k * epoch)) -- inverted for decay
                const lossBase = 2.0 * Math.exp(-0.12 * epoch) + 0.1;
                const lossNoise = (Math.random() * 0.1) - 0.05;
                const currentLoss = Math.max(0, lossBase + lossNoise);

                // Simulate Metric (e.g., Accuracy): Logarithmic growth to target
                let currentMetric;
                if (isAscendingMetric) {
                     // Growth curve
                     const startVal = targetValue * 0.4; // Start at 40% of target
                     const rawVal = startVal + (targetValue - startVal) * (1 - Math.exp(-0.15 * epoch));
                     // Add realistic plateau jitter near the end
                     const jitter = progress > 0.8 ? (Math.random() * 2 - 1) : 0;
                     currentMetric = Math.min(100, rawVal + jitter);
                } else {
                     // Decay curve (e.g. RMSE)
                     const startVal = targetValue * 3; 
                     currentMetric = targetValue + (startVal - targetValue) * Math.exp(-0.1 * epoch);
                }

                setEpochs(curr => [...curr, { 
                    epoch, 
                    loss: currentLoss.toFixed(4), 
                    metric: currentMetric.toFixed(2) 
                }]);
                
                return epoch;
            });
        }, 100); // 100ms per epoch = ~5 seconds total training time

        return () => clearInterval(interval);
    }, [isAscendingMetric, targetValue, onComplete]);

    // Auto-scroll the log
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [epochs]);

    return (
        <div className="flex flex-col h-full w-full">
            <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-white flex items-center justify-center gap-3">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-500"></div>
                    Training {model.name}...
                </h3>
                <p className="text-gray-400 text-sm mt-1">
                    Optimizing parameters for {model.modelType}
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                {/* Stats Cards */}
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 text-center">
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Epoch</span>
                    <div className="text-2xl font-mono font-bold text-white">
                        {currentEpoch}<span className="text-gray-500 text-lg">/{TOTAL_EPOCHS}</span>
                    </div>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 text-center">
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Training Loss</span>
                    <div className="text-2xl font-mono font-bold text-red-400">
                        {epochs[epochs.length - 1]?.loss || '...'}
                    </div>
                </div>
                <div className="bg-gray-700/50 p-4 rounded-lg border border-gray-600 text-center">
                    <span className="text-gray-400 text-xs uppercase tracking-wider">Val {metricName}</span>
                    <div className="text-2xl font-mono font-bold text-green-400">
                        {epochs[epochs.length - 1]?.metric || '...'}{isPercentage ? '%' : ''}
                    </div>
                </div>
            </div>

            {/* Live Chart */}
            <div className="h-64 bg-gray-900 rounded-lg p-4 border border-gray-700 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={epochs}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" vertical={false} />
                        <XAxis 
                            dataKey="epoch" 
                            stroke="#9ca3af" 
                            tick={{fill: '#9ca3af', fontSize: 10}} 
                            domain={[1, TOTAL_EPOCHS]} 
                            type="number"
                        />
                        {/* Left Axis: Loss */}
                        <YAxis 
                            yAxisId="left" 
                            stroke="#f87171" 
                            tick={{fill: '#f87171', fontSize: 10}} 
                            label={{ value: 'Loss', angle: -90, position: 'insideLeft', fill: '#f87171', fontSize: 10 }} 
                        />
                        {/* Right Axis: Metric */}
                        <YAxis 
                            yAxisId="right" 
                            orientation="right" 
                            stroke="#4ade80" 
                            tick={{fill: '#4ade80', fontSize: 10}} 
                            domain={['auto', 'auto']}
                            label={{ value: metricName, angle: 90, position: 'insideRight', fill: '#4ade80', fontSize: 10 }} 
                        />
                        <Tooltip 
                            contentStyle={{ backgroundColor: '#1f2937', borderColor: '#4b5563', fontSize: '12px' }}
                            itemStyle={{ padding: 0 }}
                        />
                        <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '5px'}} />
                        <Line 
                            yAxisId="left" 
                            type="monotone" 
                            dataKey="loss" 
                            stroke="#f87171" 
                            strokeWidth={2} 
                            dot={false} 
                            name="Training Loss" 
                            isAnimationActive={false} // Disable individual point animation for smooth streaming
                        />
                        <Line 
                            yAxisId="right" 
                            type="monotone" 
                            dataKey="metric" 
                            stroke="#4ade80" 
                            strokeWidth={2} 
                            dot={false} 
                            name={`Val ${metricName}`} 
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Terminal Log */}
            <div 
                ref={scrollRef}
                className="mt-4 h-32 bg-black rounded-lg p-3 font-mono text-xs text-gray-400 overflow-y-auto border border-gray-700 shadow-inner"
            >
                {epochs.map((e) => (
                    <div key={e.epoch} className="flex gap-4 border-b border-gray-800 py-0.5 last:border-0">
                        <span className="text-gray-500 w-16">[Ep {e.epoch}]</span>
                        <span className="text-red-400 w-24">loss: {e.loss}</span>
                        <span className="text-green-400">{metricName.toLowerCase()}: {e.metric}{isPercentage ? '%' : ''}</span>
                    </div>
                ))}
                {epochs.length === 0 && <span className="animate-pulse">Initializing training environment...</span>}
            </div>
        </div>
    );
};

// --- Main ModelManager Component ---

const ModelManager: React.FC<ModelManagerProps> = ({ dataset, models, onCreateModel }) => {
    const [viewMode, setViewMode] = useState<ViewMode>('wizard');
    const [step, setStep] = useState<Step>('initial');
    const [target, setTarget] = useState<string>('');
    const [features, setFeatures] = useState<string[]>([]);
    const [modelName, setModelName] = useState('');
    
    // State to manage the AI initialization vs Visual Simulation
    const [isInitializing, setIsInitializing] = useState(false);
    const [pendingModel, setPendingModel] = useState<MLModel | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleFeatureToggle = (feature: string) => {
        setFeatures(prev => prev.includes(feature) ? prev.filter(f => f !== feature) : [...prev, feature]);
    };
    
    const handleStartTraining = async () => {
        if (!target || features.length === 0 || !modelName) {
            setError("Please fill all fields.");
            return;
        }
        
        setIsInitializing(true); // Phase 1: Contact AI for parameters
        setError(null);
        
        try {
            const modelData = await guideModelCreation(dataset, target, features);
            const newModel: MLModel = {
                id: `model-${Date.now()}`,
                name: modelName,
                datasetName: dataset.name,
                target,
                features,
                description: modelData.description,
                modelType: modelData.modelType,
                metrics: modelData.metrics
            };
            
            setPendingModel(newModel);
            setIsInitializing(false);
            setStep('training'); // Phase 2: Start Visual Simulation
            
        } catch (err) {
            setError(err instanceof Error ? err.message : "Failed to create model.");
            setIsInitializing(false);
        }
    };

    const handleSimulationComplete = () => {
        if (pendingModel) {
            onCreateModel(pendingModel);
            setStep('done');
            setPendingModel(null);
        }
    };

    const renderComparisonView = () => {
        if (models.length === 0) {
            return (
                <div className="text-center py-10">
                    <p className="text-gray-400">No models available for comparison. Create a model first.</p>
                    <Button onClick={() => setViewMode('wizard')} className="mt-4">Back to Creation</Button>
                </div>
            );
        }

        return (
            <div>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold">Model Comparison</h3>
                    <Button variant="secondary" onClick={() => setViewMode('wizard')}>Create New Model</Button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-300">
                        <thead className="text-xs text-gray-200 uppercase bg-gray-700">
                            <tr>
                                <th className="px-6 py-3">Model Name</th>
                                <th className="px-6 py-3">Type</th>
                                <th className="px-6 py-3">Target</th>
                                <th className="px-6 py-3">Features</th>
                                <th className="px-6 py-3">Performance Metrics (Est.)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {models.map(m => (
                                <tr key={m.id} className="bg-gray-800 border-b border-gray-700">
                                    <td className="px-6 py-4 font-semibold text-white">{m.name}</td>
                                    <td className="px-6 py-4">{m.modelType}</td>
                                    <td className="px-6 py-4 font-mono text-indigo-300">{m.target}</td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-wrap gap-1">
                                            {m.features.map(f => (
                                                <span key={f} className="px-2 py-0.5 bg-gray-700 rounded text-xs">{f}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        {m.metrics && m.metrics.length > 0 ? (
                                            <ul className="space-y-1">
                                                {m.metrics.map((metric, idx) => (
                                                    <li key={idx} className="flex justify-between text-xs bg-gray-900 bg-opacity-50 p-1 rounded">
                                                        <span className="text-gray-400">{metric.name}:</span>
                                                        <span className="font-bold text-green-400">{metric.value}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        ) : (
                                            <span className="text-gray-500 italic">No metrics available</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        );
    };
    
    const renderWizardStep = () => {
        if (isInitializing) {
             return (
                <div className="text-center py-20">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto mb-6"></div>
                    <h3 className="text-xl font-bold animate-pulse">Initializing Training Environment...</h3>
                    <p className="mt-2 text-gray-400">Analyzing dataset structure and configuring model parameters.</p>
                </div>
            );
        }

        switch (step) {
            case 'initial':
                return (
                    <div className="text-center">
                        <h3 className="text-xl font-bold">Create a New ML Model</h3>
                        <p className="mt-2 text-gray-400">Let's build a model to make predictions from your data. I'll guide you through the process.</p>
                        <div className="flex justify-center gap-4 mt-8">
                            <Button onClick={() => setStep('target')}>Start Training</Button>
                            {models.length > 0 && (
                                <Button variant="secondary" onClick={() => setViewMode('compare')}>
                                    Compare Existing Models ({models.length})
                                </Button>
                            )}
                        </div>
                    </div>
                );
            case 'target':
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">1. Select Target Variable</h3>
                            <button onClick={() => setStep('initial')} className="text-sm text-gray-400 hover:text-white">Cancel</button>
                        </div>
                        <p className="mt-2 text-gray-400">This is the column you want to predict.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            {dataset.columns.map(col => (
                                <button key={col} onClick={() => { setTarget(col); setStep('features'); }} 
                                className="p-4 bg-gray-700 rounded-lg text-center hover:bg-indigo-600 transition-colors">
                                    {col}
                                </button>
                            ))}
                        </div>
                    </div>
                );
            case 'features':
                const availableFeatures = dataset.columns.filter(c => c !== target);
                return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">2. Select Feature Variables</h3>
                            <button onClick={() => setStep('target')} className="text-sm text-gray-400 hover:text-white">Back</button>
                        </div>
                        <p className="mt-2 text-gray-400">These are the columns the model will use to make predictions.</p>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                            {availableFeatures.map(col => (
                                <button key={col} onClick={() => handleFeatureToggle(col)} 
                                className={`p-4 rounded-lg text-center transition-colors ${features.includes(col) ? 'bg-indigo-600' : 'bg-gray-700 hover:bg-gray-600'}`}>
                                    {col}
                                </button>
                            ))}
                        </div>
                        <Button onClick={() => setStep('name')} disabled={features.length === 0} className="mt-6">Next</Button>
                    </div>
                );
            case 'name':
                 return (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold">3. Name Your Model</h3>
                            <button onClick={() => setStep('features')} className="text-sm text-gray-400 hover:text-white">Back</button>
                        </div>
                        <p className="mt-2 text-gray-400">Give your model a descriptive name.</p>
                        <input
                            type="text"
                            value={modelName}
                            onChange={(e) => setModelName(e.target.value)}
                            className="w-full mt-4 p-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                            placeholder="e.g., House Price Predictor"
                        />
                        <Button onClick={handleStartTraining} disabled={!modelName} className="mt-6">Train Model</Button>
                    </div>
                );
            case 'training':
                return pendingModel ? (
                    <TrainingVisualizer 
                        model={pendingModel} 
                        onComplete={handleSimulationComplete} 
                    />
                ) : null;
            case 'done':
                return (
                    <div className="text-center">
                        <h3 className="text-xl font-bold text-green-400">Model Created Successfully!</h3>
                        <p className="mt-2 text-gray-400">Your new model is ready. You can now select it from the sidebar and use it in the chat to make predictions.</p>
                        <div className="flex justify-center gap-4 mt-6">
                            <Button onClick={() => { setStep('initial'); setModelName(''); setFeatures([]); setTarget(''); }}>Create Another</Button>
                            <Button variant="secondary" onClick={() => setViewMode('compare')}>Compare Models</Button>
                        </div>
                    </div>
                );
        }
    };

    return (
        <div className="max-w-6xl mx-auto bg-gray-800 p-8 rounded-lg shadow-2xl min-h-[500px] flex flex-col">
            {viewMode === 'compare' ? renderComparisonView() : renderWizardStep()}
            {error && <p className="text-red-400 mt-4 text-center">{error}</p>}
        </div>
    );
};

export default ModelManager;
