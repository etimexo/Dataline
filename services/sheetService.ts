
import { parseCSV } from './dataService';

// Robust environment variable access for Vite and standard environments

const cleanEnvVar = (val: string | undefined) => {
    if (!val) return '';
    return val.replace(/['";]/g, '').trim();
};

let CLIENT_ID = '';

// Explicit access for VITE_GOOGLE_CLIENT_ID to ensure Vite replacement works
try {
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    }
} catch (e) {}

if (!CLIENT_ID) {
    try {
        // @ts-ignore
        if (typeof process !== 'undefined' && process.env) {
            // @ts-ignore
            CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID;
        }
    } catch (e) {}
}

CLIENT_ID = cleanEnvVar(CLIENT_ID);

const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly https://www.googleapis.com/auth/drive.readonly';

let tokenClient: any;
let accessToken: string | null = null;

// Allow setting ID at runtime if missing from env
export const setClientId = (id: string) => {
    CLIENT_ID = cleanEnvVar(id);
};

export const hasClientId = () => !!CLIENT_ID;

export const initGoogleAuth = (callback: (token: string) => void) => {
    if (typeof window === 'undefined' || !(window as any).google) {
        console.warn("Google Identity Services script not loaded yet.");
        return;
    }

    if (!CLIENT_ID) {
        console.warn("Google Client ID is missing. Skipping auth init.");
        return;
    }

    try {
        tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
            client_id: CLIENT_ID,
            scope: SCOPES,
            callback: (tokenResponse: any) => {
                if (tokenResponse.access_token) {
                    accessToken = tokenResponse.access_token;
                    callback(accessToken);
                }
            },
        });
    } catch (e) {
        console.error("Failed to init token client:", e);
        throw e;
    }
};

export const requestSheetAccess = () => {
    if (!tokenClient) {
        throw new Error("Google Auth not initialized. Check your Client ID.");
    }
    tokenClient.requestAccessToken();
};

export const extractSpreadsheetId = (url: string): string | null => {
    const matches = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return matches ? matches[1] : null;
};

export const fetchSheetData = async (spreadsheetId: string, token: string): Promise<string> => {
    const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:ZZ?majorDimension=ROWS`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to fetch sheet data");
    }

    const json = await response.json();
    const rows = json.values;

    if (!rows || rows.length === 0) {
        throw new Error("No data found in this sheet.");
    }

    // Convert 2D array to CSV string
    const csvContent = rows.map((row: string[]) => {
        return row.map(cell => {
            // Escape quotes
            const escaped = cell.replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    }).join('\n');

    return csvContent;
};

// New function to list spreadsheets from Google Drive
export interface DriveFile {
    id: string;
    name: string;
    modifiedTime: string;
}

export const listSpreadsheets = async (token: string): Promise<DriveFile[]> => {
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet' and trashed=false");
    const fields = encodeURIComponent("files(id, name, modifiedTime)");
    
    const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${query}&fields=${fields}&pageSize=20&orderBy=modifiedTime desc`,
        {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        }
    );

    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message || "Failed to list spreadsheets");
    }

    const json = await response.json();
    return json.files || [];
};
