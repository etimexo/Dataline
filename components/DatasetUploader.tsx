
import React, { useState, useCallback } from 'react';
import { parseCSV, assessDataQuality, cleanDataset, type DataQualityReport, type CleaningOperation } from '../services/dataService';
import { getCleaningSuggestions } from '../services/geminiService';
import type { Dataset } from '../types';
import Button from './ui/Button';
import { UploadIcon } from './ui/Icons';
import DataCleaningModal from './DataCleaningModal';

interface DatasetUploaderProps {
    onDatasetUpload: (dataset: Dataset) => void;
}

const DatasetUploader: React.FC<DatasetUploaderProps> = ({ onDatasetUpload }) => {
    const [file, setFile] = useState<File | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Cleaning State
    const [showCleaningModal, setShowCleaningModal] = useState(false);
    const [parsedData, setParsedData] = useState<{ data: any[], columns: string[] } | null>(null);
    const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
    const [suggestions, setSuggestions] = useState<CleaningOperation[]>([]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
        }
    };

    const processFile = useCallback(async (selectedFile: File) => {
        setIsLoading(true);
        setLoadingMessage('Parsing CSV...');
        setError(null);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const result = parseCSV(text);
                
                if (result.data.length === 0) {
                    throw new Error("CSV is empty or could not be parsed.");
                }

                setParsedData(result);

                // Start Cleaning Analysis
                setLoadingMessage('AI Analyzing Data Quality...');
                const report = assessDataQuality(result.data, result.columns);
                setQualityReport(report);

                // Ask Gemini for suggestions
                const cleaningOps = await getCleaningSuggestions(selectedFile.name, result.columns, report);
                setSuggestions(cleaningOps);

                if (cleaningOps.length > 0) {
                    setIsLoading(false);
                    setShowCleaningModal(true);
                } else {
                    // No cleaning needed, proceed
                    onDatasetUpload({
                        name: selectedFile.name,
                        data: result.data,
                        columns: result.columns,
                    });
                    setIsLoading(false);
                }

            } catch (err) {
                setError(err instanceof Error ? err.message : "An unknown error occurred during parsing.");
                setIsLoading(false);
            }
        };
        reader.onerror = () => {
             setError("Failed to read the file.");
             setIsLoading(false);
        }
        reader.readAsText(selectedFile);
    }, [onDatasetUpload]);


    const handleSubmit = () => {
        if (file) {
           processFile(file);
        } else {
            setError("Please select a file first.");
        }
    };
    
    const handleDrag = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setIsDragging(true);
        } else if (e.type === "dragleave") {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
            // Don't auto-process, let user click analyze to be consistent with UI flow
        }
    }, []);

    const handleApplyCleaning = (ops: CleaningOperation[]) => {
        if (!parsedData || !file) return;
        
        setShowCleaningModal(false);
        setIsLoading(true);
        setLoadingMessage('Applying Cleaning Operations...');
        
        // Small delay to let UI render the loading state
        setTimeout(() => {
            const cleaned = cleanDataset(parsedData.data, parsedData.columns, ops);
            onDatasetUpload({
                name: file.name,
                data: cleaned,
                columns: parsedData.columns
            });
            setIsLoading(false);
        }, 100);
    };

    const handleSkipCleaning = () => {
        if (!parsedData || !file) return;
        setShowCleaningModal(false);
        onDatasetUpload({
            name: file.name,
            data: parsedData.data,
            columns: parsedData.columns
        });
    };


    return (
        <div className="flex flex-col items-center justify-center h-full relative">
            <div 
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`w-full max-w-2xl p-8 border-2 border-dashed rounded-lg text-center transition-colors duration-300 ${isDragging ? 'border-indigo-500 bg-gray-700' : 'border-gray-600 bg-gray-800'}`}>
                <div className="flex flex-col items-center justify-center space-y-4">
                    <UploadIcon />
                    <h2 className="text-2xl font-bold">Upload Your Dataset</h2>
                    <p className="text-gray-400">Drag & drop a CSV file here, or click to select a file.</p>
                    <input
                        type="file"
                        id="file-upload"
                        className="hidden"
                        accept=".csv"
                        onChange={handleFileChange}
                    />
                     <label htmlFor="file-upload" className="cursor-pointer bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-500 transition-colors">
                        Select File
                    </label>
                    {file && <p className="text-gray-300 mt-2">Selected: {file.name}</p>}
                    
                    <Button onClick={handleSubmit} isLoading={isLoading} disabled={!file || isLoading}>
                        {isLoading ? loadingMessage : 'Analyze Dataset'}
                    </Button>
                    
                    {error && <p className="text-red-400 mt-4">{error}</p>}
                </div>
            </div>
             <div className="mt-8 text-center max-w-2xl">
                <h3 className="text-lg font-semibold">How it works</h3>
                <p className="text-gray-400 mt-2">
                    Upload a CSV file to begin. Our AI will first inspect your data for quality issues (missing values, duplicates) and ask for your approval to clean it before generating any insights or dashboards.
                </p>
            </div>

            {/* Cleaning Modal */}
            {showCleaningModal && qualityReport && parsedData && file && (
                <DataCleaningModal 
                    filename={file.name}
                    report={qualityReport}
                    initialSuggestions={suggestions}
                    onApply={handleApplyCleaning}
                    onSkip={handleSkipCleaning}
                />
            )}
        </div>
    );
};

export default DatasetUploader;
