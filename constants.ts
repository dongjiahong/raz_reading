import { pdfjs } from 'react-pdf';

// Configure PDF.js worker
// Using a CDN version that matches standard react-pdf versions to avoid bundler issues in this environment.
// We point to the .mjs file because the browser loads this as a module.
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export const DB_NAME = 'zenread_db';
export const DB_VERSION = 1;
export const STORE_FILES = 'files';
export const STORE_HISTORY = 'history';

export const GEMINI_MODEL = 'gemini-2.5-flash';