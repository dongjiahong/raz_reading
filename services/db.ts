import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { StoredFile, ReadingHistory } from '../types';
import { DB_NAME, DB_VERSION, STORE_FILES, STORE_HISTORY } from '../constants';

interface ZenReadDB extends DBSchema {
  files: {
    key: string;
    value: StoredFile;
    indexes: { 'by-date': number };
  };
  history: {
    key: string;
    value: ReadingHistory;
    indexes: { 'by-read': number };
  };
}

let dbPromise: Promise<IDBPDatabase<ZenReadDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<ZenReadDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const fileStore = db.createObjectStore(STORE_FILES, { keyPath: 'id' });
        fileStore.createIndex('by-date', 'createdAt');

        const historyStore = db.createObjectStore(STORE_HISTORY, { keyPath: 'fileId' });
        historyStore.createIndex('by-read', 'lastReadAt');
      },
    });
  }
  return dbPromise;
};

export const saveFile = async (file: File, path?: string): Promise<StoredFile> => {
  const db = await initDB();
  const arrayBuffer = await file.arrayBuffer();
  
  const storedFile: StoredFile = {
    id: crypto.randomUUID(),
    name: file.name,
    type: file.type,
    size: file.size,
    data: arrayBuffer,
    createdAt: Date.now(),
    path: path || file.name, // Use filename as path if no path provided
  };

  await db.put(STORE_FILES, storedFile);
  return storedFile;
};

export const getFiles = async (): Promise<StoredFile[]> => {
  const db = await initDB();
  return db.getAllFromIndex(STORE_FILES, 'by-date');
};

export const getFile = async (id: string): Promise<StoredFile | undefined> => {
  const db = await initDB();
  return db.get(STORE_FILES, id);
};

export const deleteFile = async (id: string): Promise<void> => {
  const db = await initDB();
  await db.delete(STORE_FILES, id);
  await db.delete(STORE_HISTORY, id);
};

export const updateHistory = async (fileId: string, page: number, totalPages?: number): Promise<void> => {
  const db = await initDB();
  const history: ReadingHistory = {
    fileId,
    lastPage: page,
    lastReadAt: Date.now(),
    totalPages,
  };
  await db.put(STORE_HISTORY, history);
};

export const getHistory = async (): Promise<ReadingHistory[]> => {
  const db = await initDB();
  return db.getAllFromIndex(STORE_HISTORY, 'by-read');
};

export const getHistoryItem = async (fileId: string): Promise<ReadingHistory | undefined> => {
  const db = await initDB();
  return db.get(STORE_HISTORY, fileId);
};