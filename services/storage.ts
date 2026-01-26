
import type { Project } from '../types';

const DB_NAME = 'DatalineDB';
const STORE_NAME = 'projects';
const DB_VERSION = 1;

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME);
            }
        };
    });
};

export const saveProjectsToDB = async (userId: string, projects: Project[]): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(projects, userId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};

export const loadProjectsFromDB = async (userId: string): Promise<Project[]> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(userId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result || []);
    });
};

export const deleteProjectsFromDB = async (userId: string): Promise<void> => {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(userId);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve();
    });
};
