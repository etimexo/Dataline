
export type DataRow = Record<string, string | number>;

export interface Dataset {
    name: string;
    data: DataRow[];
    columns: string[];
    // Gemini Files API & Caching Integration
    fileUri?: string;
    cacheName?: string;
    mimeType?: string;
}

export interface MLModel {
    id: string;
    name: string;
    datasetName: string;
    target: string;
    features: string[];
    description: string;
    modelType: string;
    metrics?: { name: string; value: string | number }[];
}

export interface ChatMessage {
    id: string;
    sender: 'user' | 'ai';
    text: string;
    isTyping?: boolean;
    feedback?: 'up' | 'down';
}

export type ChartType = 'bar' | 'line' | 'pie' | 'scatter' | 'area';
export type AggregationType = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'none';

export interface ChartConfig {
    id: string;
    title: string;
    type: ChartType;
    xKey: string;
    yKey: string | string[];
    aggregation?: AggregationType;
    // Styling Options
    color?: string;
    axisLabelColor?: string;
    legendTextColor?: string;
    strokeWidth?: number;
    barSize?: number;
}

export interface Project {
    id: string;
    name: string;
    description: string;
    createdAt: number;
    lastModified: number;
    datasets: Dataset[];
    models: MLModel[];
    charts: ChartConfig[];
    chatHistory: ChatMessage[];
}

export type View = 'projects' | 'upload' | 'dashboard' | 'data' | 'ml' | 'history';
