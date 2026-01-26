
import React, { useState, useMemo } from 'react';
import type { Dataset, DataRow } from '../types';
import Button from './ui/Button';
import { DownloadIcon } from './ui/Icons';

interface DatasetViewerProps {
    dataset: Dataset;
}

const ROWS_PER_PAGE = 15;

const DatasetViewer: React.FC<DatasetViewerProps> = ({ dataset }) => {
    const [currentPage, setCurrentPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState('');

    // --- Filter Logic ---
    const filteredData = useMemo(() => {
        if (!searchTerm) return dataset.data;
        const lowerTerm = searchTerm.toLowerCase();
        return dataset.data.filter(row => 
            Object.values(row).some(val => 
                String(val).toLowerCase().includes(lowerTerm)
            )
        );
    }, [dataset.data, searchTerm]);

    const totalPages = Math.ceil(filteredData.length / ROWS_PER_PAGE);
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    const paginatedData = filteredData.slice(startIndex, startIndex + ROWS_PER_PAGE);

    const handleDownload = () => {
        const header = dataset.columns.join(',');
        const rows = dataset.data.map(row => 
            dataset.columns.map(col => `"${String(row[col] ?? '').replace(/"/g, '""')}"`).join(',')
        ).join('\n');
        
        const csvContent = `${header}\n${rows}`;
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `${dataset.name.replace('.csv', '')}_cleaned.csv`);
        link.click();
    };

    return (
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg h-full flex flex-col">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h2 className="text-2xl font-bold text-white">Dataset: {dataset.name}</h2>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <input 
                        type="text" 
                        placeholder="Search data..." 
                        className="bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-sm text-white focus:ring-2 focus:ring-indigo-500 outline-none w-full md:w-64"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                    />
                    <Button onClick={handleDownload} variant="secondary" className="whitespace-nowrap flex items-center gap-2">
                        <DownloadIcon className="w-4 h-4" />
                        Export CSV
                    </Button>
                </div>
            </div>

            <div className="flex-grow overflow-auto border border-gray-700 rounded-lg">
                <table className="w-full text-sm text-left text-gray-300">
                    <thead className="text-xs text-gray-200 uppercase bg-gray-700 sticky top-0 z-10">
                        <tr>
                            {dataset.columns.map(col => (
                                <th key={col} scope="col" className="px-6 py-3 font-semibold tracking-wider whitespace-nowrap bg-gray-700 shadow-sm">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {paginatedData.length > 0 ? (
                            paginatedData.map((row, rowIndex) => (
                                <tr key={rowIndex} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-750 transition-colors">
                                    {dataset.columns.map(col => (
                                        <td key={`${rowIndex}-${col}`} className="px-6 py-4 whitespace-nowrap max-w-xs truncate" title={String(row[col])}>
                                            {String(row[col])}
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={dataset.columns.length} className="px-6 py-12 text-center text-gray-500">
                                    No results found matching "{searchTerm}"
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
             <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-700">
                <span className="text-sm text-gray-400">
                    Showing {Math.min(filteredData.length, startIndex + 1)}-{Math.min(filteredData.length, startIndex + paginatedData.length)} of {filteredData.length} rows
                </span>
                <div className="flex space-x-2">
                    <Button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}>
                        Previous
                    </Button>
                    <Button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages || totalPages === 0}>
                        Next
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default DatasetViewer;
