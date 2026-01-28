
import { parseCSV } from './dataService';

// Note: In a production environment, use environment variables.
// For this demo, we assume the user might provide it or it's injected.
// You need a Google Cloud Project with the Google Sheets API enabled.
const CLIENT_ID = process.env.GOOGLE_CLIENT_ID || ''; 
const SCOPES = 'https://www.googleapis.com/auth/spreadsheets.readonly';

let tokenClient: any;
let accessToken: string | null = null;

export const initGoogleAuth = (callback: (token: string) => void) => {
    if (typeof window === 'undefined' || !(window as any).google) {
        console.error("Google Identity Services not loaded");
        return;
    }

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
    // This allows us to reuse our robust PapaParse logic in dataService
    const csvContent = rows.map((row: string[]) => {
        return row.map(cell => {
            // Escape quotes
            const escaped = cell.replace(/"/g, '""');
            return `"${escaped}"`;
        }).join(',');
    }).join('\n');

    return csvContent;
};
