export interface StoredFile {
  id: string;
  name: string;
  type: string;
  size: number;
  data: ArrayBuffer; // Stored in IndexedDB
  createdAt: number;
  path: string; // Relative path (e.g. "folder/subfolder/file.pdf")
}

export interface ReadingHistory {
  fileId: string;
  lastPage: number;
  lastReadAt: number;
  totalPages?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isLoading?: boolean;
  timestamp: number;
}

export interface AIAnalysisRequest {
  text?: string;
  imageBase64?: string;
  prompt: string;
}