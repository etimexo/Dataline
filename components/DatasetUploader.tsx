
import React, { useState, useCallback, useEffect } from 'react';
import { parseFile, parseCSV, assessDataQuality, cleanDataset, type DataQualityReport, type CleaningOperation } from '../services/dataService';
import { getCleaningSuggestions, uploadFileToGemini, createContextCache } from '../services/geminiService';
import { initGoogleAuth, requestSheetAccess, extractSpreadsheetId, fetchSheetData } from '../services/sheetService';
import type { Dataset } from '../types';
import Button from './ui/Button';
import { UploadIcon, GoogleIcon } from './ui/Icons';
import DataCleaningModal from './DataCleaningModal';

interface DatasetUploaderProps {
    onDatasetUpload: (dataset: Dataset) => void;
}

const DatasetUploader: React.FC<DatasetUploaderProps> = ({ onDatasetUpload }) => {
    const [activeTab, setActiveTab] = useState<'upload' | 'sheets'>('upload');
    
    // File Upload State
    const [file, setFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    
    // Google Sheets State
    const [sheetUrl, setSheetUrl] = useState('');
    const [isAuthReady, setIsAuthReady] = useState(false);

    // Common State
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('');
    const [error, setError] = useState<string | null>(null);
    
    // Cleaning State
    const [showCleaningModal, setShowCleaningModal] = useState(false);
    const [parsedData, setParsedData] = useState<{ data: any[], columns: string[], file?: File, fileUri?: string, cacheName?: string } | null>(null);
    const [qualityReport, setQualityReport] = useState<DataQualityReport | null>(null);
    const [suggestions, setSuggestions] = useState<CleaningOperation[]>([]);

    useEffect(() => {
        // Initialize Google Auth on mount
        try {
            initGoogleAuth((token) => {
                handleSheetFetch(token);
            });
            setIsAuthReady(true);
        } catch (e) {
            console.warn("Google Auth failed to init", e);
        }
    }, []);

    // --- SHEET HANDLERS ---
    
    const handleSheetFetch = async (token: string) => {
        setIsLoading(true);
        setError(null);
        setLoadingMessage('Fetching data from Google Sheets...');

        try {
            const spreadsheetId = extractSpreadsheetId(sheetUrl);
            if (!spreadsheetId) throw new Error("Invalid Google Sheet URL.");

            const csvContent = await fetchSheetData(spreadsheetId, token);
            setLoadingMessage('Parsing Sheet Data...');
            
            // Create a File object from the CSV string to reuse our parsing/upload pipeline
            const sheetFile = new File([csvContent], "google_sheet.csv", { type: 'text/csv' });
            
            // Re-use the main process flow
            await processDataPipeline(sheetFile);

        } catch (err: any) {
            setError(err.message || "Failed to fetch Google Sheet.");
            setIsLoading(false);
        }
    };

    const handleGoogleConnect = () => {
        if (!sheetUrl) {
            setError("Please paste a Google Sheets URL first.");
            return;
        }
        try {
            requestSheetAccess();
        } catch (e: any) {
            setError(e.message);
        }
    };

    // --- FILE HANDLERS ---

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFile(e.target.files[0]);
            setError(null);
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
        }
    }, []);

    const handleSubmitFile = () => {
        if (file) {
           setIsLoading(true);
           setLoadingMessage('Reading file...');
           setError(null);
           processDataPipeline(file);
        } else {
            setError("Please select a file first.");
        }
    };

    // --- CORE PIPELINE ---

    const processDataPipeline = async (inputFile: File) => {
        try {
            // 1. Parse File
            const result = await parseFile(inputFile);
            if (result.data.length === 0) throw new Error("File is empty.");

            setLoadingMessage('Optimizing for AI (Uploading to Cache)...');
            
            // 2. Upload to Gemini Files API & Create Cache (Background Async)
            // We do this concurrently with local analysis to save time
            let fileUri = undefined;
            let cacheName = undefined;

            try {
                // Determine mime type
                const mimeType = inputFile.name.endsWith('.json') ? 'application/json' : 'text/csv';
                
                // Upload
                fileUri = await uploadFileToGemini(inputFile, mimeType);
                
                // Create Cache if successful
                if (fileUri) {
                    setLoadingMessage('Creating Context Cache...');
                    cacheName = await createContextCache(fileUri, mimeType);
                }
            } catch (e) {
                console.warn("Failed to upload/cache file to Gemini. Falling back to text mode.", e);
            }

            // 3. Local Quality Assessment
            setLoadingMessage('Analyzing Data Structure...');
            const report = assessDataQuality(result.data, result.columns);
            
            // Store intermediate state
            setParsedData({ ...result, file: inputFile, fileUri, cacheName });
            setQualityReport(report);

            // 4. AI Suggestions
            setLoadingMessage('Generating Cleaning Insights...');
            try {
                const cleaningOps = await getCleaningSuggestions(inputFile.name, result.columns, report);
                setSuggestions(cleaningOps);

                if (cleaningOps.length > 0) {
                    setIsLoading(false);
                    setShowCleaningModal(true);
                } else {
                    finalizeUpload(result.data, result.columns, inputFile.name, fileUri, cacheName);
                }
            } catch (aiError) {
                console.warn("AI Cleaning failed", aiError);
                finalizeUpload(result.data, result.columns, inputFile.name, fileUri, cacheName);
            }

        } catch (err: any) {
            setError(err.message || "An error occurred.");
            setIsLoading(false);
        }
    };

    const finalizeUpload = (
        data: any[], 
        columns: string[], 
        name: string, 
        fileUri?: string, 
        cacheName?: string
    ) => {
        onDatasetUpload({
            name,
            data,
            columns,
            fileUri,
            cacheName
        });
        setIsLoading(false);
    };

    // --- CLEANING ACTIONS ---

    const handleApplyCleaning = (ops: CleaningOperation[]) => {
        if (!parsedData || !parsedData.file) return;
        
        setShowCleaningModal(false);
        setIsLoading(true);
        setLoadingMessage('Applying Cleaning Operations...');
        
        setTimeout(async () => {
            // Clean local data
            const cleaned = cleanDataset(parsedData.data, parsedData.columns, ops);
            
            // Re-upload cleaned data to cache? 
            // Ideally yes, but for speed in this demo we might skip re-caching or rely on text fallback for cleaned data.
            // However, to keep it robust: If cleaning changed data, we should probably invalidate the previous cache 
            // or just proceed with the cleaned local data (Files API won't match anymore).
            // Strategy: If data is cleaned, we rely on text-prompting for accuracy OR we re-upload.
            // For this implementation, let's re-upload the cleaned CSV string.
            
            let newUri = parsedData.fileUri;
            let newCache = parsedData.cacheName;

            if (ops.filter(o => o.enabled).length > 0) {
                try {
                    setLoadingMessage('Updating AI Context...');
                    // Convert cleaned data back to CSV string
                    const header = parsedData.columns.join(',');
                    const rows = cleaned.map(r => Object.values(r).join(',')).join('\n');
                    const csvContent = `${header}\n${rows}`;
                    const cleanedFile = new File([csvContent], `cleaned_${parsedData.file.name}`, { type: 'text/csv' });
                    
                    newUri = await uploadFileToGemini(cleanedFile, 'text/csv');
                    if (newUri) {
                        newCache = await createContextCache(newUri, 'text/csv');
                    }
                } catch (e) {
                    console.warn("Failed to re-cache cleaned data");
                }
            }

            finalizeUpload(cleaned, parsedData.columns, parsedData.file.name, newUri, newCache);
        }, 100);
    };

    const handleSkipCleaning = () => {
        if (!parsedData || !parsedData.file) return;
        setShowCleaningModal(false);
        finalizeUpload(parsedData.data, parsedData.columns, parsedData.file.name, parsedData.fileUri, parsedData.cacheName);
    };

    return (
        <div className="flex flex-col items-center justify-center h-full relative p-6">
            
            {/* Tabs */}
            <div className="flex bg-gray-800 p-1 rounded-xl mb-8 border border-gray-700">
                <button
                    onClick={() => setActiveTab('upload')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'upload' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    File Upload
                </button>
                <button
                    onClick={() => setActiveTab('sheets')}
                    className={`px-6 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${activeTab === 'sheets' ? 'bg-indigo-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}
                >
                    <GoogleIcon className="w-4 h-4" />
                    Google Sheets
                </button>
            </div>

            <div 
                className={`w-full max-w-2xl p-8 border-2 border-dashed rounded-2xl text-center transition-all duration-300 relative overflow-hidden ${isDragging ? 'border-indigo-500 bg-gray-800' : 'border-gray-700 bg-gray-900/50'}`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
            >
                {activeTab === 'upload' ? (
                    <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                            <UploadIcon className="w-8 h-8 text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Upload Data File</h2>
                            <p className="text-gray-400">Drag & drop CSV, Excel, or JSON files.</p>
                        </div>
                        
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            accept=".csv,.json,.xlsx,.xls"
                            onChange={handleFileChange}
                        />
                         
                         <div className="flex flex-col gap-3 w-full max-w-xs">
                            <label htmlFor="file-upload" className="cursor-pointer bg-gray-800 border border-gray-600 text-white px-4 py-3 rounded-xl hover:bg-gray-700 transition-colors flex items-center justify-center gap-2">
                                {file ? 'Change File' : 'Select File'}
                            </label>
                            
                            {file && (
                                <div className="bg-indigo-900/20 border border-indigo-500/30 p-3 rounded-lg text-sm text-indigo-300 truncate">
                                    {file.name}
                                </div>
                            )}

                            <Button onClick={handleSubmitFile} isLoading={isLoading} disabled={!file || isLoading} className="w-full">
                                {isLoading ? loadingMessage : 'Analyze Dataset'}
                            </Button>
                         </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center space-y-6 animate-fade-in-up">
                        <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
                            <GoogleIcon className="w-8 h-8" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white mb-2">Connect Google Sheets</h2>
                            <p className="text-gray-400 max-w-sm mx-auto">Paste the link to your Google Sheet. We'll fetch the data securely.</p>
                        </div>

                        <div className="w-full max-w-md space-y-4">
                            <input 
                                type="text" 
                                placeholder="https://docs.google.com/spreadsheets/d/..." 
                                value={sheetUrl}
                                onChange={(e) => setSheetUrl(e.target.value)}
                                className="w-full bg-black/40 border border-gray-600 rounded-xl p-4 text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                            
                            <Button onClick={handleGoogleConnect} isLoading={isLoading} disabled={!sheetUrl || !isAuthReady || isLoading} className="w-full">
                                {isLoading ? loadingMessage : 'Import from Sheets'}
                            </Button>
                            
                            {!process.env.GOOGLE_CLIENT_ID && (
                                <p className="text-xs text-yellow-500/80 bg-yellow-900/20 p-2 rounded">
                                    Note: Client ID not configured in environment. Auth may fail.
                                </p>
                            )}
                        </div>
                    </div>
                )}
                
                {error && (
                    <div className="mt-6 p-4 bg-red-900/20 border border-red-500/30 rounded-xl text-red-300 text-sm animate-pulse">
                        {error}
                    </div>
                )}
            </div>

            <div className="mt-8 text-center max-w-xl">
                <p className="text-gray-500 text-sm">
                    Your data is processed securely using Gemini 1.5 Flash. We use Context Caching to ensure your follow-up questions are answered instantly.
                </p>
            </div>

            {/* Cleaning Modal */}
            {showCleaningModal && qualityReport && parsedData && parsedData.file && (
                <DataCleaningModal 
                    filename={parsedData.file.name}
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
