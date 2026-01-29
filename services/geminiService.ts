
import { GoogleGenAI, Type } from "@google/genai";
import type { Dataset, MLModel, ChatMessage, ChartConfig, ChartType, AggregationType } from '../types';
import type { DataQualityReport, CleaningOperation } from './dataService';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const FAST_MODEL = 'gemini-3-flash-preview';
const THINKING_MODEL = 'gemini-3-pro-preview';

const getDatasetContext = (dataset: Dataset): string => {
    const previewData = dataset.data.slice(0, 5);
    return `
        The user has uploaded a dataset named "${dataset.name}".
        Columns: ${dataset.columns.join(', ')}.
        Total rows: ${dataset.data.length}.
        
        Here is a preview of the first 5 rows:
        ${JSON.stringify(previewData, null, 2)}
    `;
};

const getModelContext = (model: MLModel | null, dataset: Dataset): string => {
    if (!model) return "No ML model is currently active.";

    // Calculate basic stats for features and target to ground the AI's predictions
    const relevantColumns = [model.target, ...model.features];
    const stats: Record<string, any> = {};

    relevantColumns.forEach(col => {
        // Check if column exists in dataset
        if (dataset.columns.includes(col)) {
            const values = dataset.data
                .map(row => row[col])
                .filter(v => v !== null && v !== undefined && v !== '');
            
            // Try to parse as numbers
            const numericValues = values.map(v => Number(v)).filter(n => !isNaN(n));

            if (numericValues.length > 0) {
                const min = Math.min(...numericValues);
                const max = Math.max(...numericValues);
                const sum = numericValues.reduce((a, b) => a + b, 0);
                const avg = sum / numericValues.length;
                stats[col] = { type: 'numeric', min, max, avg: avg.toFixed(2) };
            } else {
                // Categorical
                const uniqueValues = Array.from(new Set(values.map(String)));
                stats[col] = { 
                    type: 'categorical', 
                    sampleValues: uniqueValues.slice(0, 5),
                    count: uniqueValues.length 
                };
            }
        }
    });

    return `
        Active ML Model: "${model.name}"
        Model Type: ${model.modelType}
        Description: ${model.description}
        Target Variable to Predict: "${model.target}"
        Input Features required: ${model.features.join(', ')}
        
        DATA STATISTICS (Use these to generate realistic, mathematically plausible predictions):
        ${JSON.stringify(stats, null, 2)}
    `;
};

export const getAIResponse = async (
    prompt: string,
    history: ChatMessage[],
    dataset: Dataset,
    model: MLModel | null,
    useThinking: boolean = false
): Promise<string> => {
    
    const fullPrompt = `
        System Instructions:
        You are a world-class data analyst AI. Your goal is to help the user understand their data and use their trained ML models.
        - Be concise and clear in your responses.
        - Use markdown for formatting, especially for lists and code blocks.
        
        *** ML PREDICTION TASK ***
        If an ML model is active and the user provides values for the features (${model?.features.join(', ') || ''}) or asks to predict "${model?.target || ''}":
        1. YOU MUST SIMULATE THE MODEL. Do not say "I cannot run the model".
        2. Identify the input feature values from the user's prompt.
        3. Use the "Data Statistics" provided below to infer a realistic predicted value for "${model?.target}". For example, if input features are above average, the target might be above average (depending on the likely relationship).
        4. Provide the result clearly: "**Predicted ${model?.target}: [Value]**".
        5. Briefly explain your reasoning based on the inputs and data stats (e.g., "Because feature X is high...").

        ${getDatasetContext(dataset)}
        ${getModelContext(model, dataset)}

        Conversation History:
        ${history.map(m => `${m.sender}: ${m.text}`).join('\n')}

        New User Prompt: ${prompt}
    `;

    try {
        const modelName = useThinking ? THINKING_MODEL : FAST_MODEL;
        const config = useThinking 
            ? { thinkingConfig: { thinkingBudget: 32768 } } 
            : {};

        const response = await ai.models.generateContent({
          model: modelName,
          contents: fullPrompt,
          config: config
        });
        return response.text || "No response generated.";
    } catch (error) {
        console.error("Gemini API Error:", error);
        return "Sorry, I ran into an issue trying to generate a response. Please check the console for details.";
    }
};

export const generateChartConfigFromAI = async (
    prompt: string, 
    dataset: Dataset
): Promise<ChartConfig | null> => {

    const chartSchema = {
        type: Type.OBJECT,
        properties: {
            title: { type: Type.STRING, description: 'A descriptive title for the chart.' },
            chartType: { type: Type.STRING, description: `The type of chart.`, enum: ['bar', 'line', 'pie', 'scatter', 'area'] },
            x_axis_key: { type: Type.STRING, description: `The column name from the dataset to be used for the X-axis. Must be one of: [${dataset.columns.map(c => `'${c}'`).join(', ')}]` },
            y_axis_key: { type: Type.STRING, description: `The column name from the dataset to be used for the Y-axis. Must be one of: [${dataset.columns.map(c => `'${c}'`).join(', ')}]` },
            aggregation: { type: Type.STRING, description: 'The aggregation function to apply to the Y-axis.', enum: ['sum', 'avg', 'count', 'min', 'max', 'none'] },
        },
        required: ["title", "chartType", "x_axis_key", "y_axis_key"]
    };

    try {
        const response = await ai.models.generateContent({
           model: FAST_MODEL,
           contents: `Based on the user's request: "${prompt}" and the available columns [${dataset.columns.join(', ')}], generate a JSON object that strictly follows the provided schema for creating a chart. 
           - The x_axis_key should be a categorical or time-series column (except for scatter plots where it should be numerical).
           - The y_axis_key should be a numerical column.
           - Choose an appropriate aggregation. Default to 'sum' for quantities (Sales, Revenue) and 'avg' for rates (Price, Rating). Use 'none' for scatter plots.`,
           config: {
             responseMimeType: "application/json",
             responseSchema: chartSchema,
           },
        });

        const jsonStr = response.text!.trim();
        const parsed = JSON.parse(jsonStr);
        
        return {
            id: `chart-${Date.now()}`,
            title: parsed.title,
            type: parsed.chartType as ChartType,
            xKey: parsed.x_axis_key,
            yKey: parsed.y_axis_key,
            aggregation: parsed.aggregation as AggregationType || 'sum'
        };
    } catch (error) {
        console.error("Chart Generation Error:", error);
        return null;
    }
};

export const generateRecommendedDashboard = async (
    dataset: Dataset
): Promise<ChartConfig[]> => {
    
    const dashboardSchema = {
        type: Type.OBJECT,
        properties: {
            charts: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                         title: { type: Type.STRING, description: 'A descriptive title.' },
                         chartType: { type: Type.STRING, description: "Type of chart", enum: ['bar', 'line', 'pie', 'scatter', 'area'] },
                         x_axis_key: { type: Type.STRING, description: "X axis column name" },
                         y_axis_key: { type: Type.STRING, description: "Y axis column name" },
                         aggregation: { type: Type.STRING, description: 'Aggregation type', enum: ['sum', 'avg', 'count', 'min', 'max', 'none'] },
                    },
                    required: ["title", "chartType", "x_axis_key", "y_axis_key"]
                }
            }
        },
        required: ["charts"]
    };

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: `
                I have a dataset with the following columns: ${dataset.columns.join(', ')}.
                
                Please generate 3 or 4 diverse and interesting chart configurations that would visualize key insights from this data automatically. 
                - Pick suitable column pairs (e.g., Categorical vs Numerical for Bar/Pie, Date/Time vs Numerical for Line/Area, Numerical vs Numerical for Scatter).
                - Ensure the x_axis_key exists in: [${dataset.columns.join(', ')}].
                - Ensure the y_axis_key exists in: [${dataset.columns.join(', ')}].
                - Use 'sum' aggregation for total values, 'avg' for means.
            `,
            config: {
                responseMimeType: "application/json",
                responseSchema: dashboardSchema
            }
        });

        const jsonStr = response.text!.trim();
        const parsed = JSON.parse(jsonStr);
        
        return parsed.charts.map((c: any, index: number) => ({
            id: `rec-chart-${Date.now()}-${index}`,
            title: c.title,
            type: c.chartType as ChartType,
            xKey: c.x_axis_key,
            yKey: c.y_axis_key,
            aggregation: c.aggregation as AggregationType || 'sum'
        }));

    } catch (error) {
        console.error("Dashboard Recommendation Error:", error);
        return [];
    }
};

export const guideModelCreation = async (
    dataset: Dataset, 
    target: string, 
    features: string[]
): Promise<{ description: string; modelType: string; metrics: { name: string; value: string | number }[] }> => {
    
    // Quick analysis of target to help AI
    const targetValues = dataset.data.map(d => d[target]).filter(v => v !== null && v !== undefined);
    const isNumeric = targetValues.every(v => !isNaN(Number(v)));
    const uniqueCount = new Set(targetValues).size;
    
    // Simple heuristic: if numeric and high cardinality -> Regression. Else Classification.
    const taskTypeHint = (isNumeric && uniqueCount > 10) ? "Regression" : "Classification";

    const modelCreationSchema = {
        type: Type.OBJECT,
        properties: {
            modelType: { type: Type.STRING, description: "Suggest a suitable machine learning model type (e.g., 'Linear Regression', 'Logistic Regression', 'Random Forest')." },
            description: { type: Type.STRING, description: "A brief, one-sentence explanation of what this model does." },
            metrics: { 
                type: Type.ARRAY, 
                description: "Estimated performance metrics for this model trained on this data.",
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING, description: "Name of the metric (e.g., Accuracy, RMSE, R2 Score)." },
                        value: { type: Type.STRING, description: "The estimated value (e.g., '85%', '0.92', '1240.5')." }
                    }
                }
            }
        },
        required: ["modelType", "description", "metrics"],
    };

    const prompt = `
        A user wants to train a machine learning model on the dataset "${dataset.name}".
        Target Variable: "${target}" (Seems to be a ${taskTypeHint} task).
        Selected Features: ${features.join(', ')}.
        Rows in dataset: ${dataset.data.length}.
        
        1. Suggest a suitable model type.
        2. Write a short description.
        3. ESTIAMTE realistic performance metrics based on typical results for this kind of data. 
           - For Classification, provide Accuracy and F1 Score.
           - For Regression, provide RMSE and R-Squared.
           - Be realistic, do not just give 100%.
    `;
    
     try {
        const response = await ai.models.generateContent({
           model: FAST_MODEL,
           contents: prompt,
           config: {
             responseMimeType: "application/json",
             responseSchema: modelCreationSchema,
           },
        });
        
        const jsonStr = response.text!.trim();
        const parsed = JSON.parse(jsonStr);
        return {
            description: parsed.description,
            modelType: parsed.modelType,
            metrics: parsed.metrics
        };

    } catch (error) {
        console.error("Model Creation Guidance Error:", error);
        throw new Error("The AI failed to generate model details. Please try again.");
    }
};

export const getCleaningSuggestions = async (
    datasetName: string,
    columns: string[],
    qualityReport: DataQualityReport
): Promise<CleaningOperation[]> => {
    
    const cleaningSchema = {
        type: Type.OBJECT,
        properties: {
            operations: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        type: { 
                            type: Type.STRING, 
                            enum: ['remove_duplicates', 'remove_empty_rows', 'fill_missing_zero', 'fill_missing_mean', 'convert_to_number'],
                            description: "The specific cleaning operation type."
                        },
                        column: { 
                            type: Type.STRING, 
                            description: "The name of the column to apply this to (optional for global ops). Must match one of the dataset columns."
                        },
                        description: { type: Type.STRING, description: "A user-friendly explanation of why this cleaning step is needed." }
                    },
                    required: ["type", "description"]
                }
            }
        },
        required: ["operations"]
    };

    const prompt = `
        Analyze this data quality report for dataset "${datasetName}" and suggest necessary cleaning operations.
        
        Columns: ${columns.join(', ')}
        Total Rows: ${qualityReport.totalRows}
        Duplicate Rows Detected: ${qualityReport.duplicateRows}
        Missing Values Count Per Column: ${JSON.stringify(qualityReport.missingValues)}
        Inferred Column Types: ${JSON.stringify(qualityReport.columnTypes)}

        Rules:
        - If duplicates > 0, suggest 'remove_duplicates'.
        - If a numeric column has missing values, suggest 'fill_missing_mean' or 'fill_missing_zero'.
        - If a categorical column has missing values, suggest 'remove_empty_rows' ONLY if missing count is small (< 10%).
        - Only suggest operations that are strictly necessary to improve data quality for analysis.
    `;

    try {
        const response = await ai.models.generateContent({
            model: FAST_MODEL,
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: cleaningSchema
            }
        });

        const jsonStr = response.text!.trim();
        const parsed = JSON.parse(jsonStr);
        
        // Post-process to ensure enabled default is true
        return parsed.operations.map((op: any) => ({
            ...op,
            enabled: true
        }));
    } catch (e) {
        console.error("Cleaning Suggestion Error", e);
        return [];
    }
};

// --- File API & Caching Support ---

export const uploadFileToGemini = async (file: File, mimeType: string): Promise<string> => {
    const API_KEY = process.env.API_KEY;
    const uploadUrl = `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${API_KEY}`;
    
    // 1. Start Resumable Upload
    const initResponse = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
            'X-Goog-Upload-Protocol': 'resumable',
            'X-Goog-Upload-Command': 'start',
            'X-Goog-Upload-Header-Content-Length': file.size.toString(),
            'X-Goog-Upload-Header-Content-Type': mimeType,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: file.name } })
    });

    if (!initResponse.ok) {
        throw new Error(`Failed to initialize upload: ${initResponse.statusText}`);
    }
    
    const uploadUrlHeader = initResponse.headers.get('X-Goog-Upload-URL');
    if (!uploadUrlHeader) {
        throw new Error("No upload URL received from Gemini API");
    }

    // 2. Upload Bytes
    const uploadResponse = await fetch(uploadUrlHeader, {
        method: 'POST',
        headers: {
            'Content-Length': file.size.toString(),
            'X-Goog-Upload-Offset': '0',
            'X-Goog-Upload-Command': 'upload, finalize',
        },
        body: file 
    });

    if (!uploadResponse.ok) {
        throw new Error(`Failed to upload file bytes: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();
    return result.file.uri;
};

export const createContextCache = async (fileUri: string, mimeType: string): Promise<string> => {
    const API_KEY = process.env.API_KEY;
    const cacheUrl = `https://generativelanguage.googleapis.com/v1beta/cachedContents?key=${API_KEY}`;
    
    // Cache for 10 minutes for this session
    const ttlSeconds = 600; 

    const cachePayload = {
        model: 'models/gemini-1.5-flash-001', // Explicitly using 1.5-flash for confirmed cache support
        contents: [{
            parts: [{
                fileData: {
                    mimeType: mimeType,
                    fileUri: fileUri
                }
            }]
        }],
        ttl: `${ttlSeconds}s`
    };

    const response = await fetch(cacheUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(cachePayload)
    });

    if (!response.ok) {
        console.warn("Context Cache creation failed (falling back to standard prompt):", await response.text());
        return ""; 
    }

    const result = await response.json();
    return result.name; 
};
