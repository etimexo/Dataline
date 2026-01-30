
import React, { useEffect, useState, useRef, useMemo } from 'react';
import type { ChartConfig, Dataset, DataRow, ChartType, AggregationType } from '../types';
import { generateRecommendedDashboard } from '../services/geminiService';
import Button from './ui/Button';
import { DownloadIcon, PlusIcon, XIcon, MaximizeIcon, SettingsIcon } from './ui/Icons';
import Spinner from './ui/Spinner';
import { 
    BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, 
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
    PieChart, Pie, Cell, Brush 
} from 'recharts';

// --- Icons for Slicers ---
const FilterIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
    </svg>
);

const ChevronDownIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const ChevronRightIcon: React.FC<{className?: string}> = ({className}) => (
    <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

// --- Chart Skeleton Component ---
const ChartSkeleton: React.FC = () => (
    <div className="bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg h-[450px] flex flex-col animate-pulse relative">
        <div className="flex justify-between items-start mb-4">
             <div className="h-7 bg-gray-700 rounded w-1/3"></div>
             <div className="flex gap-2">
                 <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
                 <div className="h-8 w-8 bg-gray-700 rounded-full"></div>
             </div>
        </div>
        <div className="flex-grow w-full bg-gray-900/50 rounded-lg flex items-end justify-between px-4 pb-4 gap-4">
             <div className="w-full bg-gray-700/30 rounded-t h-[30%]"></div>
             <div className="w-full bg-gray-700/30 rounded-t h-[50%]"></div>
             <div className="w-full bg-gray-700/30 rounded-t h-[80%]"></div>
             <div className="w-full bg-gray-700/30 rounded-t h-[60%]"></div>
             <div className="w-full bg-gray-700/30 rounded-t h-[40%]"></div>
        </div>
    </div>
);

// --- Chart Component ---

interface ChartComponentProps {
    config: ChartConfig;
    data: DataRow[];
    isFullView?: boolean;
    onExpand?: () => void;
    onDelete?: () => void;
}

const ChartComponent: React.FC<ChartComponentProps> = ({ config, data, isFullView = false, onExpand, onDelete }) => {
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F', '#FFBB28', '#FF8042'];
    const chartRef = useRef<HTMLDivElement>(null);

    // --- Data Aggregation Logic ---
    const chartData = useMemo(() => {
        // Scatter charts typically visualize raw data points to show correlation
        if (config.type === 'scatter') {
            return data;
        }

        if (!config.aggregation || config.aggregation === 'none') {
             // Even without aggregation, we might want to sort for Line/Area
             const sortedData = [...data];
             if (['line', 'area'].includes(config.type)) {
                 sortedData.sort((a, b) => {
                     const valA = a[config.xKey];
                     const valB = b[config.xKey];
                     if (typeof valA === 'number' && typeof valB === 'number') return valA - valB;
                     return String(valA).localeCompare(String(valB));
                 });
             }
             return sortedData;
        }

        const groups: Record<string, any> = {};
        const yKey = Array.isArray(config.yKey) ? config.yKey[0] : config.yKey;

        data.forEach(row => {
            const xVal = row[config.xKey];
            const key = String(xVal); // Group by string representation
            
            if (!groups[key]) {
                groups[key] = { 
                    [config.xKey]: xVal, 
                    count: 0, 
                    _sum: 0, 
                    _min: Infinity, 
                    _max: -Infinity 
                };
            }
            
            const yVal = Number(row[yKey]);
            if (!isNaN(yVal)) {
                groups[key].count += 1;
                groups[key]._sum += yVal;
                groups[key]._min = Math.min(groups[key]._min, yVal);
                groups[key]._max = Math.max(groups[key]._max, yVal);
            }
        });

        const result = Object.values(groups).map(g => {
            let val = 0;
            switch (config.aggregation) {
                case 'sum': val = g._sum; break;
                case 'avg': val = g.count > 0 ? g._sum / g.count : 0; break;
                case 'count': val = g.count; break;
                case 'min': val = g._min === Infinity ? 0 : g._min; break;
                case 'max': val = g._max === -Infinity ? 0 : g._max; break;
            }
            return {
                [config.xKey]: g[config.xKey],
                [yKey]: Number(val.toFixed(2))
            };
        });

        // Robust Sorting for X-Axis (Essential for Line/Area charts)
        // Sort numerically if possible, then by date, then alphabetically
        return result.sort((a, b) => {
            const valA = a[config.xKey];
            const valB = b[config.xKey];
            
            // 1. Try Numeric Sort
            const numA = Number(valA);
            const numB = Number(valB);
            if (!isNaN(numA) && !isNaN(numB) && valA !== '' && valB !== '') {
                return numA - numB;
            }
            
            // 2. Try Date Sort
            const dateA = Date.parse(String(valA));
            const dateB = Date.parse(String(valB));
            if (!isNaN(dateA) && !isNaN(dateB)) {
                return dateA - dateB;
            }

            // 3. Fallback to String Sort
            return String(valA).localeCompare(String(valB));
        });

    }, [data, config]);


    const downloadChart = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (chartRef.current) {
            const svg = chartRef.current.querySelector('.recharts-surface');
            if (svg) {
                const svgData = new XMLSerializer().serializeToString(svg);
                const svgRect = svg.getBoundingClientRect();
                
                const canvas = document.createElement("canvas");
                canvas.width = svgRect.width * 2; 
                canvas.height = svgRect.height * 2;
                
                const ctx = canvas.getContext("2d");
                if (!ctx) return;
                
                ctx.scale(2, 2);
                const img = new Image();
                img.onload = () => {
                     ctx.fillStyle = "#111827"; 
                     ctx.fillRect(0, 0, svgRect.width, svgRect.height);
                     ctx.drawImage(img, 0, 0, svgRect.width, svgRect.height);
                     
                     const a = document.createElement("a");
                     a.download = `${config.title.replace(/\s+/g, '_')}_${Date.now()}.png`;
                     a.href = canvas.toDataURL("image/png");
                     a.click();
                };
                
                img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
            }
        }
    };

    const renderChart = () => {
        const bottomMargin = !isFullView && ['bar', 'line', 'area'].includes(config.type) ? 30 : 0;
        
        // --- Apply Custom Styles ---
        const primaryColor = config.color || '#8884d8';
        const axisColor = config.axisLabelColor || '#9ca3af';
        const legendColor = config.legendTextColor || '#9ca3af';
        const strokeWidth = config.strokeWidth || 2;
        const barSize = config.barSize; // undefined means auto

        const commonProps = { 
            data: chartData, 
            margin: { top: 10, right: 30, left: 0, bottom: bottomMargin } 
        };
        
        const gridStroke = "#4a5568";
        const tooltipStyle = { backgroundColor: '#1f2937', border: '1px solid #4a5568', color: '#f3f4f6', borderRadius: '0.5rem' };
        
        const renderBrush = () => (
             <Brush 
                dataKey={config.xKey} 
                height={25} 
                stroke="#6366f1" 
                fill="#1f2937" 
                tickFormatter={() => ''}
                travellerWidth={10} 
            />
        );

        const yKey = Array.isArray(config.yKey) ? config.yKey[0] : config.yKey;

        if (chartData.length === 0) {
            return (
                <div className="flex items-center justify-center h-full text-gray-500 text-sm">
                    No data available for current filters.
                </div>
            );
        }

        switch (config.type) {
            case 'bar':
                return (
                    <BarChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis 
                            dataKey={config.xKey} 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                            tickLine={{stroke: axisColor}} 
                        />
                        <YAxis 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                            tickLine={{stroke: axisColor}} 
                        />
                        <Tooltip contentStyle={tooltipStyle} cursor={{fill: '#374151', opacity: 0.5}} />
                        <Legend wrapperStyle={{paddingTop: '10px', color: legendColor}} />
                        <Bar 
                            dataKey={yKey} 
                            fill={primaryColor} 
                            radius={[4, 4, 0, 0]} 
                            barSize={barSize} 
                            isAnimationActive={false} 
                        />
                        {renderBrush()}
                    </BarChart>
                );
            case 'line':
                 return (
                    <LineChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis 
                            dataKey={config.xKey} 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                        />
                        <YAxis 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{paddingTop: '10px', color: legendColor}} />
                        <Line 
                            type="monotone" 
                            dataKey={yKey} 
                            stroke={primaryColor} 
                            strokeWidth={strokeWidth} 
                            dot={{r: 3, fill: primaryColor}} 
                            activeDot={{r: 6}} 
                            isAnimationActive={false} 
                        />
                        {renderBrush()}
                    </LineChart>
                );
            case 'area':
                 return (
                    <AreaChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} vertical={false} />
                        <XAxis 
                            dataKey={config.xKey} 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                        />
                        <YAxis 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                        />
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{paddingTop: '10px', color: legendColor}} />
                        <Area 
                            type="monotone" 
                            dataKey={yKey} 
                            stroke={primaryColor} 
                            fill={primaryColor} 
                            fillOpacity={0.3} 
                            strokeWidth={strokeWidth}
                            isAnimationActive={false} 
                        />
                        {renderBrush()}
                    </AreaChart>
                );
            case 'scatter':
                return (
                    <ScatterChart {...commonProps}>
                        <CartesianGrid strokeDasharray="3 3" stroke={gridStroke} />
                        <XAxis 
                            type="number" 
                            dataKey={config.xKey} 
                            name={config.xKey} 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                        />
                        <YAxis 
                            type="number" 
                            dataKey={yKey} 
                            name={yKey as string} 
                            stroke={axisColor} 
                            tick={{fill: axisColor}} 
                        />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{paddingTop: '10px', color: legendColor}} />
                        <Scatter 
                            name={config.title} 
                            data={chartData} 
                            fill={primaryColor} 
                            isAnimationActive={false} 
                        />
                    </ScatterChart>
                );
            case 'pie':
                // For Pie charts, we want to see the largest slices.
                // Sort by Value Descending and take top 20
                const pieData = [...chartData]
                    .sort((a, b) => Number(b[yKey]) - Number(a[yKey]))
                    .slice(0, 20)
                    .map(item => ({ name: item[config.xKey], value: Number(item[yKey]) }));
                    
                 return (
                    <PieChart>
                         <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={isFullView ? 200 : 100} fill="#8884d8" label isAnimationActive={false}>
                            {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={tooltipStyle} />
                        <Legend wrapperStyle={{ color: legendColor }} />
                    </PieChart>
                 );
            default:
                return <p className="text-red-400">Unsupported chart type: {config.type}</p>;
        }
    };

    return (
        <div className={`bg-gray-800 border border-gray-700 p-4 rounded-lg shadow-lg flex flex-col relative group ${isFullView ? 'h-full w-full border-none shadow-none' : 'h-[500px] transition-all duration-200 hover:border-gray-500'}`}>
            <div className="flex justify-between items-start mb-4">
                 <div className="flex flex-col pr-8">
                    <h3 className={`font-semibold text-white truncate ${isFullView ? 'text-2xl' : 'text-lg'}`} title={config.title}>{config.title}</h3>
                    {config.aggregation && config.aggregation !== 'none' && config.type !== 'scatter' && (
                        <span className="text-xs text-indigo-400 font-mono uppercase tracking-wider">{config.aggregation} of {Array.isArray(config.yKey) ? config.yKey[0] : config.yKey} by {config.xKey}</span>
                    )}
                 </div>
                 <div className="flex items-center gap-2 shrink-0">
                     {!isFullView && onExpand && (
                        <button onClick={onExpand} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors text-gray-300 hover:text-white" title="Expand Chart">
                            <MaximizeIcon className="w-4 h-4" />
                        </button>
                     )}
                     <button onClick={downloadChart} className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 transition-colors text-gray-300 hover:text-white" title="Download Chart">
                        <DownloadIcon className="w-4 h-4" />
                     </button>
                     {!isFullView && onDelete && (
                        <button onClick={onDelete} className="p-2 bg-gray-700 rounded-full hover:bg-red-900/50 text-gray-300 hover:text-red-400 transition-colors" title="Remove Chart">
                            <XIcon className="w-4 h-4" />
                        </button>
                     )}
                 </div>
            </div>
            
            <div className="flex-grow w-full h-full min-h-0 relative" ref={chartRef}>
                 <ResponsiveContainer width="100%" height="100%">
                    {renderChart()}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

// --- Slicer Component ---

interface SlicerProps {
    column: string;
    values: string[];
    selectedValues: Set<string>;
    onChange: (column: string, value: string) => void;
}

const Slicer: React.FC<SlicerProps> = ({ column, values, selectedValues, onChange }) => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div className="mb-4 bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-3 bg-gray-800 hover:bg-gray-750 transition-colors"
            >
                <span className="font-semibold text-sm text-gray-200">{column}</span>
                {isOpen ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
            </button>
            
            {isOpen && (
                <div className="max-h-40 overflow-y-auto p-2 space-y-1 scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-transparent">
                    {values.map(val => (
                        <label key={val} className="flex items-center space-x-2 p-1.5 hover:bg-gray-800 rounded cursor-pointer group">
                            <input 
                                type="checkbox" 
                                checked={selectedValues.has(val)} 
                                onChange={() => onChange(column, val)}
                                className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-gray-900"
                            />
                            <span className={`text-sm truncate group-hover:text-white ${selectedValues.has(val) ? 'text-white' : 'text-gray-400'}`}>
                                {val || '(Empty)'}
                            </span>
                        </label>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- Main Dashboard View ---

interface DashboardViewProps {
    charts: ChartConfig[];
    dataset: Dataset;
    onAddCharts: (newCharts: ChartConfig[]) => void;
    onRemoveChart?: (chartId: string) => void;
}

const DashboardView: React.FC<DashboardViewProps> = ({ charts, dataset, onAddCharts, onRemoveChart }) => {
    const [isLoadingRecs, setIsLoadingRecs] = useState(false);
    const [isChartLoading, setIsChartLoading] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [expandedChart, setExpandedChart] = useState<ChartConfig | null>(null);
    const [showSlicers, setShowSlicers] = useState(true);
    const hasInitialized = useRef(false);

    // --- Slicer Logic (Unchanged from prev version) ---
    const slicableColumns = useMemo(() => {
        const cols: { name: string, values: string[] }[] = [];
        dataset.columns.forEach(col => {
            const uniqueValues = new Set<string>(dataset.data.map(d => String(d[col])));
            if (uniqueValues.size > 1 && uniqueValues.size < 50) {
                cols.push({
                    name: col,
                    values: Array.from(uniqueValues).sort()
                });
            }
        });
        return cols;
    }, [dataset]);

    const [activeFilters, setActiveFilters] = useState<Record<string, Set<string>>>({});

    const handleFilterChange = (column: string, value: string) => {
        setActiveFilters(prev => {
            const currentSet = new Set(prev[column] || []);
            if (currentSet.has(value)) {
                currentSet.delete(value);
            } else {
                currentSet.add(value);
            }
            const newFilters = { ...prev };
            if (currentSet.size === 0) {
                delete newFilters[column];
            } else {
                newFilters[column] = currentSet;
            }
            return newFilters;
        });
    };

    const filteredData = useMemo(() => {
        if (Object.keys(activeFilters).length === 0) return dataset.data;
        return dataset.data.filter(row => {
            return Object.entries(activeFilters).every(([col, selectedSet]) => {
                return (selectedSet as Set<string>).has(String(row[col]));
            });
        });
    }, [dataset.data, activeFilters]);

    useEffect(() => {
        setIsChartLoading(true);
        const timer = setTimeout(() => setIsChartLoading(false), 600);
        return () => clearTimeout(timer);
    }, [activeFilters]);

    useEffect(() => {
        const fetchRecommendations = async () => {
            if (charts.length === 0 && !hasInitialized.current) {
                hasInitialized.current = true;
                setIsLoadingRecs(true);
                try {
                    const recs = await generateRecommendedDashboard(dataset);
                    onAddCharts(recs);
                } catch (e) {
                    console.error(e);
                } finally {
                    setIsLoadingRecs(false);
                }
            }
        };
        fetchRecommendations();
    }, [dataset, charts.length, onAddCharts]);

    const handleRemoveChart = (id: string) => {
        if (onRemoveChart) onRemoveChart(id);
    };

    return (
        <div className="h-full flex flex-col relative overflow-hidden">
             {/* Header Toolbar */}
             <div className="flex justify-between items-center mb-6 bg-gray-800 p-4 rounded-xl border border-gray-700 shadow-sm shrink-0">
                <div className="flex items-center gap-4">
                    <div className="bg-indigo-600 p-2 rounded-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Power BI Dashboard</h2>
                        <p className="text-gray-400 text-xs">{dataset.name} &bull; {filteredData.length} rows filtered</p>
                    </div>
                </div>
                
                <div className="flex gap-2">
                     <button 
                        onClick={() => setShowSlicers(!showSlicers)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${showSlicers ? 'bg-indigo-900/50 text-indigo-300 border border-indigo-700' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                     >
                        <FilterIcon className="w-4 h-4" />
                        {showSlicers ? 'Hide Slicers' : 'Show Slicers'}
                     </button>
                     <Button variant="secondary" onClick={() => setShowCreateModal(true)} className="flex items-center gap-2 text-sm">
                        <PlusIcon className="w-4 h-4" />
                        Add Visual
                     </Button>
                </div>
            </div>

            <div className="flex-1 flex overflow-hidden gap-6">
                
                {/* Slicers Panel */}
                <div className={`transition-all duration-300 flex flex-col ${showSlicers ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                    <div className="bg-gray-800 border border-gray-700 rounded-xl p-4 h-full overflow-hidden flex flex-col">
                        <div className="flex items-center justify-between mb-4 pb-2 border-b border-gray-700">
                            <h3 className="font-bold text-gray-300 text-sm uppercase tracking-wider">Slicers</h3>
                            {Object.keys(activeFilters).length > 0 && (
                                <button 
                                    onClick={() => setActiveFilters({})}
                                    className="text-xs text-indigo-400 hover:text-indigo-300"
                                >
                                    Clear All
                                </button>
                            )}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                            {slicableColumns.length > 0 ? (
                                slicableColumns.map(col => (
                                    <Slicer 
                                        key={col.name} 
                                        column={col.name} 
                                        values={col.values} 
                                        selectedValues={activeFilters[col.name] || new Set()} 
                                        onChange={handleFilterChange}
                                    />
                                ))
                            ) : (
                                <p className="text-gray-500 text-sm text-center italic mt-4">
                                    No categorical fields found to slice.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Dashboard Canvas */}
                <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-700">
                    {isLoadingRecs ? (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                             {[...Array(4)].map((_, i) => (
                                <ChartSkeleton key={i} />
                             ))}
                             <div className="col-span-1 lg:col-span-2 flex items-center justify-center gap-2 text-indigo-400 mt-2">
                                <Spinner />
                                <span className="animate-pulse">Analyzing data & generating insights...</span>
                             </div>
                        </div>
                    ) : charts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center border-2 border-dashed border-gray-700 rounded-xl">
                            <p className="text-gray-400">Your dashboard is empty.</p>
                            <Button className="mt-4" onClick={() => setShowCreateModal(true)}>Add Your First Visual</Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                            {charts.map(config => (
                                isChartLoading ? (
                                    <ChartSkeleton key={`skeleton-${config.id}`} />
                                ) : (
                                    <ChartComponent 
                                        key={config.id} 
                                        config={config} 
                                        data={filteredData} 
                                        onExpand={() => setExpandedChart(config)}
                                        onDelete={onRemoveChart ? () => onRemoveChart(config.id) : undefined}
                                    />
                                )
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Manual Creation Modal */}
            {showCreateModal && (
                <CreateChartModal 
                    dataset={dataset} 
                    onClose={() => setShowCreateModal(false)} 
                    onSave={(config) => {
                        onAddCharts([config]);
                        setShowCreateModal(false);
                    }}
                />
            )}

            {/* Full Screen Chart Preview Modal */}
            {expandedChart && (
                <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[100] p-4 backdrop-blur-sm">
                     <div className="w-full h-full max-w-7xl max-h-[90vh] bg-gray-900 rounded-xl relative flex flex-col shadow-2xl overflow-hidden border border-gray-700">
                        <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-800/50">
                            <h2 className="text-xl font-bold text-white">{expandedChart.title}</h2>
                            <button 
                                onClick={() => setExpandedChart(null)}
                                className="p-2 bg-gray-700 rounded-full hover:bg-gray-600 text-white shadow-lg transition-transform hover:rotate-90"
                            >
                                <XIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 p-6 bg-gray-900">
                            <ChartComponent config={expandedChart} data={filteredData} isFullView={true} />
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
};

const CreateChartModal: React.FC<{ dataset: Dataset; onClose: () => void; onSave: (config: ChartConfig) => void }> = ({ dataset, onClose, onSave }) => {
    const [title, setTitle] = useState('');
    const [type, setType] = useState<ChartType>('bar');
    const [xKey, setXKey] = useState(dataset.columns[0]);
    const [yKey, setYKey] = useState(dataset.columns[1] || dataset.columns[0]);
    const [aggregation, setAggregation] = useState<AggregationType>('sum');
    
    // Style States
    const [color, setColor] = useState('#6366f1'); // Default indigo-500
    const [axisLabelColor, setAxisLabelColor] = useState('#9ca3af'); // gray-400
    const [legendTextColor, setLegendTextColor] = useState('#e5e7eb'); // gray-200
    const [strokeWidth, setStrokeWidth] = useState(2);
    const [barSize, setBarSize] = useState<number | ''>(''); // Empty for auto

    const handleSave = () => {
        if (!title) {
            alert("Please enter a title");
            return;
        }
        onSave({
            id: `manual-${Date.now()}`,
            title,
            type,
            xKey,
            yKey,
            aggregation,
            // Style Props
            color,
            axisLabelColor,
            legendTextColor,
            strokeWidth: Number(strokeWidth),
            barSize: barSize === '' ? undefined : Number(barSize)
        });
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[100] backdrop-blur-sm">
            <div className="bg-gray-800 rounded-xl border border-gray-700 w-full max-w-lg shadow-2xl relative flex flex-col max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-white">Create Custom Visual</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <XIcon className="w-6 h-6" />
                    </button>
                </div>
                
                <div className="overflow-y-auto p-6 space-y-6 scrollbar-thin scrollbar-thumb-gray-600">
                    {/* General Settings */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">General Configuration</h4>
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Visual Title</label>
                            <input 
                                type="text" 
                                value={title} 
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full bg-gray-700 border border-gray-600 rounded p-2 focus:ring-indigo-500 text-white focus:outline-none"
                                placeholder="e.g., Sales by Region"
                            />
                            <p className="text-xs text-gray-500 mt-1">A descriptive name for your chart.</p>
                        </div>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-400 mb-1">Chart Type</label>
                            <div className="grid grid-cols-3 gap-2">
                                {['bar', 'line', 'pie', 'area', 'scatter'].map(t => (
                                    <button 
                                        key={t}
                                        onClick={() => setType(t as ChartType)}
                                        className={`p-2 rounded capitalize text-sm border transition-colors ${type === t ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600'}`}
                                    >
                                        {t}
                                    </button>
                                ))}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">Select how you want to visualize the data.</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">X-Axis (Category)</label>
                                <select 
                                    value={xKey} 
                                    onChange={(e) => setXKey(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none"
                                >
                                    {dataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Y-Axis (Value)</label>
                                <select 
                                    value={yKey} 
                                    onChange={(e) => setYKey(e.target.value)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none"
                                >
                                    {dataset.columns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                        </div>
                        
                        {type !== 'scatter' && (
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-1">Aggregation Method</label>
                                <select 
                                    value={aggregation} 
                                    onChange={(e) => setAggregation(e.target.value as AggregationType)}
                                    className="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none"
                                >
                                    <option value="sum">Sum (Total)</option>
                                    <option value="avg">Average (Mean)</option>
                                    <option value="count">Count (Frequency)</option>
                                    <option value="min">Minimum Value</option>
                                    <option value="max">Maximum Value</option>
                                    <option value="none">No Aggregation (Raw Data)</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">How multiple values for the same X category are combined.</p>
                            </div>
                        )}
                    </div>

                    {/* Appearance Settings */}
                    <div className="space-y-4 pt-4 border-t border-gray-700">
                        <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Visual Appearance</h4>
                        
                        <div className="grid grid-cols-2 gap-4">
                            {type !== 'pie' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Primary Color</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={color}
                                            onChange={(e) => setColor(e.target.value)}
                                            className="h-8 w-12 bg-transparent border-0 rounded cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-500 font-mono">{color}</span>
                                    </div>
                                </div>
                            )}
                            
                            {type !== 'pie' && (
                                <div>
                                    <label className="block text-xs font-medium text-gray-400 mb-1">Axis Text Color</label>
                                    <div className="flex items-center gap-2">
                                        <input 
                                            type="color" 
                                            value={axisLabelColor}
                                            onChange={(e) => setAxisLabelColor(e.target.value)}
                                            className="h-8 w-12 bg-transparent border-0 rounded cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-500 font-mono">{axisLabelColor}</span>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Legend Text Color</label>
                                <div className="flex items-center gap-2">
                                    <input 
                                        type="color" 
                                        value={legendTextColor}
                                        onChange={(e) => setLegendTextColor(e.target.value)}
                                        className="h-8 w-12 bg-transparent border-0 rounded cursor-pointer"
                                    />
                                    <span className="text-xs text-gray-500 font-mono">{legendTextColor}</span>
                                </div>
                            </div>
                        </div>

                        {/* Specific Configs */}
                        {(type === 'line' || type === 'area') && (
                            <div className="bg-gray-700/30 p-3 rounded-lg border border-gray-600/50">
                                <label className="block text-xs font-medium text-gray-300 mb-2 flex justify-between">
                                    <span>Line Thickness</span>
                                    <span className="text-indigo-400">{strokeWidth}px</span>
                                </label>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-gray-500">Thin</span>
                                    <input 
                                        type="range" 
                                        min="1" 
                                        max="10" 
                                        step="1"
                                        value={strokeWidth}
                                        onChange={(e) => setStrokeWidth(Number(e.target.value))}
                                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                        title="Drag to adjust line thickness"
                                    />
                                    <span className="text-[10px] text-gray-500">Thick</span>
                                </div>
                                <p className="text-[10px] text-gray-500 mt-1">Controls the visual weight of the lines.</p>
                            </div>
                        )}
                        
                        {type === 'bar' && (
                            <div>
                                <label className="block text-xs font-medium text-gray-400 mb-1">Bar Width (px)</label>
                                <div className="flex gap-2 items-center">
                                    <input 
                                        type="number" 
                                        min="1"
                                        max="200"
                                        value={barSize}
                                        onChange={(e) => setBarSize(e.target.value ? Number(e.target.value) : '')}
                                        className="w-24 bg-gray-700 border border-gray-600 rounded p-1.5 text-white text-sm focus:outline-none"
                                        placeholder="Auto"
                                    />
                                    <span className="text-xs text-gray-500">Leave empty for auto-width</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 border-t border-gray-700 bg-gray-900 rounded-b-xl">
                    <Button onClick={handleSave} className="w-full">Create Visual</Button>
                </div>
            </div>
        </div>
    );
};

export default DashboardView;
