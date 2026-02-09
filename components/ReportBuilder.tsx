
import React, { useRef, useState } from 'react';
import type { ChartConfig, Dataset, DataRow } from '../types';
import Button from './ui/Button';
import { XIcon, DownloadIcon } from './ui/Icons';
// Import library types if using TS, but since we use CDN, we treat them as any or declare globally
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { BarChart, Bar, LineChart, Line, AreaChart, Area, ScatterChart, Scatter, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from 'recharts';
import Markdown from 'react-markdown';

interface ReportBuilderProps {
    dataset: Dataset;
    selectedCharts: ChartConfig[];
    selectedMessages?: string[];
    onClose: () => void;
}

// Re-using simplified chart renderer for the PDF report (static, no tooltips)
const ReportChart: React.FC<{ config: ChartConfig; data: DataRow[] }> = ({ config, data }) => {
    const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff8042', '#0088FE', '#00C49F'];
    
    // Aggregation Logic (Simplified duplication from DashboardView for independence)
    const chartData = React.useMemo(() => {
        if (config.type === 'scatter' || !config.aggregation || config.aggregation === 'none') return data.slice(0, 50); // Limit scatter for PDF perf
        
        const groups: Record<string, any> = {};
        const yKey = Array.isArray(config.yKey) ? config.yKey[0] : config.yKey;

        data.forEach(row => {
            const xVal = row[config.xKey];
            const key = String(xVal);
            if (!groups[key]) groups[key] = { [config.xKey]: xVal, count: 0, _sum: 0 };
            const yVal = Number(row[yKey]);
            if (!isNaN(yVal)) {
                groups[key].count++;
                groups[key]._sum += yVal;
            }
        });

        return Object.values(groups).map(g => ({
            [config.xKey]: g[config.xKey],
            [yKey]: config.aggregation === 'avg' ? g._sum / g.count : g._sum
        })).sort((a, b) => String(a[config.xKey]).localeCompare(String(b[config.xKey]))).slice(0, 20); // Top 20 for report
    }, [data, config]);

    const yKey = Array.isArray(config.yKey) ? config.yKey[0] : config.yKey;
    const common = { data: chartData, margin: {top:5, right:20, left:0, bottom:5} };

    return (
        <div className="h-64 w-full border border-gray-200 rounded p-2 page-break-inside-avoid">
            <h4 className="text-center font-bold text-gray-700 mb-2 text-sm">{config.title}</h4>
            <ResponsiveContainer width="100%" height="100%">
                {config.type === 'bar' ? (
                    <BarChart {...common}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xKey} tick={{fontSize: 10}} />
                        <YAxis tick={{fontSize: 10}} />
                        <Bar dataKey={yKey} fill={config.color || '#8884d8'} />
                    </BarChart>
                ) : config.type === 'pie' ? (
                    <PieChart>
                        <Pie data={chartData} dataKey={yKey} nameKey={config.xKey} cx="50%" cy="50%" outerRadius={60} fill="#8884d8" label>
                            {chartData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Legend />
                    </PieChart>
                ) : (
                    <LineChart {...common}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey={config.xKey} tick={{fontSize: 10}} />
                        <YAxis tick={{fontSize: 10}} />
                        <Line type="monotone" dataKey={yKey} stroke={config.color || '#8884d8'} dot={false} />
                    </LineChart>
                )}
            </ResponsiveContainer>
        </div>
    );
};

const ReportBuilder: React.FC<ReportBuilderProps> = ({ dataset, selectedCharts, selectedMessages = [], onClose }) => {
    const [reportTitle, setReportTitle] = useState(`${dataset.name} Analysis Report`);
    const [summary, setSummary] = useState('This report contains automated insights derived from the dataset.');
    const [isGenerating, setIsGenerating] = useState(false);
    const reportRef = useRef<HTMLDivElement>(null);

    const handleDownload = async () => {
        if (!reportRef.current) return;
        setIsGenerating(true);

        try {
            // Force light theme for capture
            const element = reportRef.current;
            
            const canvas = await html2canvas(element, {
                scale: 2, // High resolution
                backgroundColor: '#ffffff',
                useCORS: true
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF('p', 'mm', 'a4');
            
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            
            const imgX = (pdfWidth - imgWidth * ratio) / 2;
            const imgY = 0; // Top align for simplicity in multi-page scenario

            // Simple one-page fit for now, can be extended for multi-page via JSPDF logic if needed
            // If height > pdfHeight, you'd need multiple addImage calls with offsets.
            // For now, let's just fit width and let height scale, assuming reasonable report size.
            
            if (imgHeight * ratio > pdfHeight) {
                // Multi-page approach needed or scaling down
                // Simple scaling down to fit one page for basic implementation to avoid cutoff
                const scaleToFit = pdfHeight / (imgHeight * ratio);
                // Actually, let's just create a PDF with custom height if it's super long, 
                // OR just paginate properly. 
                // Standard approach: addImage with offsets.
                
                let heightLeft = imgHeight;
                let position = 0;
                let pageHeight = pdfHeight;
                let imgHeightPdf = (imgHeight * pdfWidth) / imgWidth;

                pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightPdf);
                heightLeft -= (pageHeight * imgWidth) / pdfWidth; // logic approximate for standard A4 aspect

                while (heightLeft >= 0) {
                  position = heightLeft - imgHeightPdf; // negative offset
                  pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeightPdf);
                  heightLeft -= pageHeight;
                }
            } else {
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, (imgHeight * pdfWidth) / imgWidth);
            }

            pdf.save('dataline_report.pdf');

        } catch (error) {
            console.error("PDF Generation failed", error);
            alert("Failed to generate PDF. Please try again.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/90 z-[150] flex flex-col items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-gray-800 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-gray-700">
                {/* Header */}
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900">
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <span className="p-1 bg-indigo-500 rounded">
                            <DownloadIcon className="w-4 h-4 text-white" />
                        </span>
                        Report Builder
                    </h2>
                    <div className="flex gap-2">
                        <Button onClick={handleDownload} isLoading={isGenerating} disabled={isGenerating}>
                            Download PDF
                        </Button>
                        <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors">
                            <XIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* Controls Sidebar */}
                    <div className="w-full md:w-80 bg-gray-800 p-6 border-r border-gray-700 overflow-y-auto">
                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Report Title</label>
                                <input 
                                    type="text" 
                                    value={reportTitle} 
                                    onChange={(e) => setReportTitle(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-400 mb-2">Executive Summary</label>
                                <textarea 
                                    rows={5}
                                    value={summary}
                                    onChange={(e) => setSummary(e.target.value)}
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg p-2 text-white text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
                                />
                            </div>
                            <div className="bg-indigo-900/20 p-4 rounded-lg border border-indigo-500/30">
                                <h4 className="text-sm font-bold text-indigo-300 mb-2">Report Content</h4>
                                <ul className="text-xs text-indigo-200 space-y-1">
                                    <li className="flex justify-between">
                                        <span>Charts:</span>
                                        <span className="font-bold">{selectedCharts.length}</span>
                                    </li>
                                    <li className="flex justify-between">
                                        <span>AI Insights:</span>
                                        <span className="font-bold">{selectedMessages.length}</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    {/* Preview Area (White Paper Style) */}
                    <div className="flex-1 bg-gray-500/50 p-8 overflow-y-auto flex justify-center">
                        <div 
                            id="report-content"
                            ref={reportRef}
                            className="bg-white text-black w-[210mm] min-h-[297mm] shadow-2xl p-[15mm] flex flex-col scale-90 origin-top"
                        >
                            <div className="border-b-2 border-indigo-600 pb-4 mb-8 flex justify-between items-end">
                                <div>
                                    <h1 className="text-3xl font-bold text-gray-900">{reportTitle}</h1>
                                    <p className="text-gray-500 mt-1">Generated by Dataline AI</p>
                                </div>
                                <div className="text-right text-sm text-gray-400">
                                    {new Date().toLocaleDateString()}
                                </div>
                            </div>

                            <div className="mb-8 bg-gray-50 p-6 rounded-lg border-l-4 border-indigo-500">
                                <h3 className="text-lg font-bold text-gray-800 mb-2">Executive Summary</h3>
                                <p className="text-gray-700 leading-relaxed text-sm whitespace-pre-wrap">{summary}</p>
                            </div>

                            {/* AI Insights Section */}
                            {selectedMessages.length > 0 && (
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Key AI Insights</h3>
                                    <div className="space-y-4">
                                        {selectedMessages.map((msg, idx) => (
                                            <div key={idx} className="bg-gray-50 p-4 rounded-lg text-sm text-gray-800 border border-gray-100">
                                                <div className="prose prose-sm max-w-none text-gray-800">
                                                    <Markdown>{msg}</Markdown>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Charts Section */}
                            {selectedCharts.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-bold text-gray-800 mb-4 border-b border-gray-200 pb-2">Visualizations</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        {selectedCharts.map((chart, index) => (
                                            <div key={index} className="break-inside-avoid">
                                                <ReportChart config={chart} data={dataset.data} />
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="mt-auto pt-8 border-t border-gray-200 text-center text-xs text-gray-400">
                                Confidential Analysis &bull; {dataset.data.length} Rows Processed
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportBuilder;
