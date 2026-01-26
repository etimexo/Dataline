
import type { DataRow } from '../types';

export const parseCSV = (csvText: string): { data: DataRow[], columns: string[] } => {
    const lines = csvText.trim().split('\n');
    if (lines.length < 2) {
        throw new Error("CSV must have a header row and at least one data row.");
    }

    const header = lines[0].split(',').map(h => h.trim());
    const data: DataRow[] = [];

    for (let i = 1; i < lines.length; i++) {
        // Handle potentially quoted strings in CSV
        const rowString = lines[i];
        const values: string[] = [];
        let inQuotes = false;
        let currentValue = '';

        for(let charIndex = 0; charIndex < rowString.length; charIndex++) {
            const char = rowString[charIndex];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(currentValue.trim());
                currentValue = '';
            } else {
                currentValue += char;
            }
        }
        values.push(currentValue.trim());

        // Basic parsing
        const row: DataRow = {};
        for (let j = 0; j < header.length; j++) {
            const rawVal = values[j] !== undefined ? values[j] : '';
            // Attempt numeric conversion safely
            const numVal = Number(rawVal);
            if (rawVal !== '' && !isNaN(numVal)) {
                row[header[j]] = numVal;
            } else {
                row[header[j]] = rawVal;
            }
        }
        data.push(row);
    }

    return { data, columns: header };
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

    // 1. Detect Column Types & Missing Values
    columns.forEach(col => {
        report.missingValues[col] = 0;
        let numCount = 0;
        let strCount = 0;

        data.forEach(row => {
            const val = row[col];
            if (val === null || val === undefined || val === '') {
                report.missingValues[col]++;
            } else if (typeof val === 'number') {
                numCount++;
            } else {
                strCount++;
            }
        });

        // Heuristic: If mostly numbers, treat as number (useful for cleaning mixed columns)
        report.columnTypes[col] = numCount > strCount ? 'number' : 'string';
    });

    // 2. Detect Duplicates (simple stringification)
    const seen = new Set<string>();
    data.forEach(row => {
        const signature = JSON.stringify(row);
        if (seen.has(signature)) {
            report.duplicateRows++;
        } else {
            seen.add(signature);
        }
    });

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
            const sig = JSON.stringify(row);
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
            
            // Note: Mean calculation usually happens beforehand or we need to calculate it here. 
            // For simplicity, we handle 'convert_to_number' here which cleans data.
            if (op.type === 'convert_to_number') {
                const num = Number(val);
                if (!isNaN(num)) {
                    newRow[op.column!] = num;
                } else {
                    newRow[op.column!] = 0; // Fallback for hard conversion
                }
            }
        });
        return newRow;
    });

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
