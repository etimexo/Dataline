
import type { DataRow } from '../types';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export const parseCSV = (csvText: string): { data: DataRow[], columns: string[] } => {
    const result = Papa.parse(csvText, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true
    });

    if (result.errors.length > 0 && result.data.length === 0) {
        throw new Error(`CSV Parsing Error: ${result.errors[0].message}`);
    }

    const data = result.data as DataRow[];
    const columns = result.meta.fields || [];

    if (data.length === 0) {
         throw new Error("CSV file appears to be empty.");
    }

    return { data, columns };
};

export const parseJSON = (jsonText: string): { data: DataRow[], columns: string[] } => {
    let jsonData;
    try {
        jsonData = JSON.parse(jsonText);
    } catch (e) {
        throw new Error("Invalid JSON file.");
    }

    // Handle array directly or object containing array
    let rows = Array.isArray(jsonData) ? jsonData : null;
    if (!rows && typeof jsonData === 'object') {
        // Look for the first array property
        const arrayProp = Object.values(jsonData).find(val => Array.isArray(val));
        if (arrayProp) rows = arrayProp as any[];
    }

    if (!rows || rows.length === 0) {
        throw new Error("Could not find a valid array of data in the JSON file.");
    }

    // Flatten logic could go here, but assuming flat objects for now
    // Only verify columns on the first 100 objects to save time if dataset is huge
    const sampleLimit = Math.min(rows.length, 100);
    const sample = rows.slice(0, sampleLimit);
    const columns = Array.from(new Set(sample.flatMap((r: any) => Object.keys(r))));
    
    // Normalize data - fast map
    const data: DataRow[] = rows.map((r: any) => {
        // Optimization: if it's already a clean object, just return it (shallow copy if needed, but here we trust source)
        // If we strictly need to stringify nested objects:
        const newRow: DataRow = { ...r };
        for (const key in newRow) {
            const val = newRow[key];
             if (typeof val === 'object' && val !== null) {
                 newRow[key] = JSON.stringify(val);
             }
        }
        return newRow;
    });

    return { data, columns };
};

export const parseExcel = (buffer: ArrayBuffer): { data: DataRow[], columns: string[] } => {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" }) as Record<string, any>[];
    
    if (jsonData.length === 0) {
        throw new Error("Excel sheet is empty.");
    }

    const columns = Object.keys(jsonData[0]);
    const data: DataRow[] = jsonData;

    return { data, columns };
};

export const parseFile = async (file: File): Promise<{ data: DataRow[], columns: string[] }> => {
    return new Promise((resolve, reject) => {
        const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
        const isJson = file.name.endsWith('.json');

        if (isExcel) {
             const reader = new FileReader();
             reader.onload = (e) => {
                 try {
                     const result = e.target?.result;
                     if (result instanceof ArrayBuffer) {
                         resolve(parseExcel(result));
                     } else {
                         reject(new Error("Failed to read Excel file as ArrayBuffer"));
                     }
                 } catch (err) { reject(err); }
             };
             reader.onerror = () => reject(new Error("Failed to read file"));
             reader.readAsArrayBuffer(file);
        } else if (isJson) {
             const reader = new FileReader();
             reader.onload = (e) => {
                 try {
                     const text = e.target?.result as string;
                     resolve(parseJSON(text));
                 } catch (err) { reject(err); }
             };
             reader.onerror = () => reject(new Error("Failed to read file"));
             reader.readAsText(file);
        } else {
            // CSV - Use PapaParse on the file object directly for better performance (stream-like)
            Papa.parse(file, {
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: (results) => {
                    if (results.errors.length > 0 && results.data.length === 0) {
                        reject(new Error(`CSV Parsing Error: ${results.errors[0].message}`));
                        return;
                    }
                    if (results.data.length === 0) {
                        reject(new Error("CSV file appears to be empty."));
                        return;
                    }
                    // Sanitize columns from meta
                    const columns = results.meta.fields || [];
                    const data = results.data as DataRow[];
                    resolve({ data, columns });
                },
                error: (error) => reject(new Error(`CSV Parsing Error: ${error.message}`))
            });
        }
    });
};

// --- Data Cleaning Logic ---

export interface DataQualityReport {
    totalRows: number;
    duplicateRows: number;
    missingValues: Record<string, number>; // col -> count
    columnTypes: Record<string, 'string' | 'number'>;
}

export interface CleaningOperation {
    type: 'remove_duplicates' | 'remove_empty_rows' | 'fill_missing_zero' | 'fill_missing_mean' | 'convert_to_number';
    column?: string; // specific column for the operation
    description: string;
    enabled: boolean;
}

export const assessDataQuality = (data: DataRow[], columns: string[]): DataQualityReport => {
    const report: DataQualityReport = {
        totalRows: data.length,
        duplicateRows: 0,
        missingValues: {},
        columnTypes: {}
    };

    // Optimization: If dataset is huge (>50k rows), we use a sampling strategy for missing value counts
    // to keep the UI responsive.
    const isLargeDataset = data.length > 50000;
    const step = isLargeDataset ? Math.floor(data.length / 10000) : 1; // Limit to ~10k checks per column if large
    
    // 1. Detect Column Types & Missing Values
    columns.forEach(col => {
        report.missingValues[col] = 0;
        let numCount = 0;
        let strCount = 0;

        // Optimization: Analyze first 500 rows for type inference
        const typeCheckLimit = Math.min(data.length, 500);
        
        // Loop for type inference
        for(let i = 0; i < typeCheckLimit; i++) {
             const val = data[i][col];
             if (typeof val === 'number') {
                numCount++;
             } else if (val !== null && val !== undefined && val !== '') {
                 // Try parsing string as number
                 if (!isNaN(Number(val))) {
                     numCount++;
                 } else {
                     strCount++;
                 }
             }
        }
        report.columnTypes[col] = numCount >= strCount ? 'number' : 'string';

        // Loop for Missing Values (Sampled if large)
        for(let i = 0; i < data.length; i += step) {
             const val = data[i][col];
             if (val === null || val === undefined || val === '') {
                report.missingValues[col]++;
             }
        }
        
        // Extrapolate missing count if sampled
        if (isLargeDataset && step > 1) {
            report.missingValues[col] = Math.round(report.missingValues[col] * step);
        }
    });

    // 2. Detect Duplicates
    // Optimization: Check max 2000 rows for duplicates to estimate
    const duplicateCheckLimit = Math.min(data.length, 2000);
    const seen = new Set<string>();
    
    for (let i = 0; i < duplicateCheckLimit; i++) {
        const row = data[i];
        // Fast signature: just join values. Less accurate than JSON.stringify but much faster.
        // Falls back to JSON.stringify if object has complexity, but here we assume DataRow is flat-ish.
        const signature = Object.values(row).join('|'); 
        if (seen.has(signature)) {
            report.duplicateRows++;
        } else {
            seen.add(signature);
        }
    }

    // Extrapolate
    if (duplicateCheckLimit < data.length && report.duplicateRows > 0) {
        report.duplicateRows = Math.floor((report.duplicateRows / duplicateCheckLimit) * data.length);
    }

    return report;
};

export const cleanDataset = (data: DataRow[], columns: string[], operations: CleaningOperation[]): DataRow[] => {
    let cleanedData = [...data];

    // Filter enabled operations
    const activeOps = operations.filter(op => op.enabled);

    // 1. Remove Duplicates
    if (activeOps.some(op => op.type === 'remove_duplicates')) {
        const seen = new Set<string>();
        cleanedData = cleanedData.filter(row => {
            const sig = Object.values(row).join('|'); // Use faster signature
            if (seen.has(sig)) return false;
            seen.add(sig);
            return true;
        });
    }

    // 2. Remove Rows with ANY empty values (if requested generically, usually aggressive)
    if (activeOps.some(op => op.type === 'remove_empty_rows')) {
        cleanedData = cleanedData.filter(row => {
            return columns.every(col => row[col] !== null && row[col] !== undefined && row[col] !== '');
        });
    }

    // 3. Column-specific transformations
    if (activeOps.some(op => op.column)) {
        cleanedData = cleanedData.map(row => {
            const newRow = { ...row };
            
            activeOps.forEach(op => {
                if (!op.column) return;

                // Fill Missing
                const val = newRow[op.column];
                const isMissing = val === null || val === undefined || val === '';

                if (op.type === 'fill_missing_zero' && isMissing) {
                    newRow[op.column!] = 0;
                }
                
                if (op.type === 'convert_to_number') {
                    const num = Number(val);
                    if (!isNaN(num)) {
                        newRow[op.column!] = num;
                    } else {
                        newRow[op.column!] = 0; 
                    }
                }
            });
            return newRow;
        });
    }

    // 4. Handle Mean Filling (Requires aggregating first)
    const meanOps = activeOps.filter(op => op.type === 'fill_missing_mean' && op.column);
    if (meanOps.length > 0) {
        const means: Record<string, number> = {};
        meanOps.forEach(op => {
            const col = op.column!;
            const validValues = cleanedData
                .map(r => r[col])
                .filter(v => typeof v === 'number') as number[];
            
            const sum = validValues.reduce((a, b) => a + b, 0);
            means[col] = validValues.length > 0 ? sum / validValues.length : 0;
        });

        cleanedData = cleanedData.map(row => {
            const newRow = { ...row };
            meanOps.forEach(op => {
                const col = op.column!;
                const val = newRow[col];
                if (val === null || val === undefined || val === '') {
                    newRow[col] = Number(means[col].toFixed(2));
                }
            });
            return newRow;
        });
    }

    return cleanedData;
};
