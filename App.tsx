import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PDFReader } from './components/PDFReader';
import { saveFile, getFiles, deleteFile, getHistory, updateHistory } from './services/db';
import { StoredFile, ReadingHistory } from './types';

const App: React.FC = () => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  
  // Sidebar open by default on desktop, closed on mobile
  const [isSidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 768);
  
  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const [loadedFiles, loadedHistory] = await Promise.all([getFiles(), getHistory()]);
        setFiles(loadedFiles);
        setHistory(loadedHistory);
      } catch (err) {
        console.error("Failed to load data from DB", err);
      }
    };
    loadData();
  }, []);

  // Handle resize for sidebar
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle Single/Multiple PDF Import (Flat)
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: StoredFile[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        try {
          const file = e.target.files[i];
          // Standard import uses filename as path
          const storedFile = await saveFile(file, file.name);
          newFiles.push(storedFile);
        } catch (err) {
          console.error("Error saving file", err);
        }
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input
    e.target.value = '';
  };

  // Handle Folder Import
  const handleFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: StoredFile[] = [];
      for (let i = 0; i < e.target.files.length; i++) {
        try {
          const file = e.target.files[i];
          // webkitRelativePath gives us "Folder/Subfolder/File.pdf"
          const path = file.webkitRelativePath || file.name;
          const storedFile = await saveFile(file, path);
          newFiles.push(storedFile);
        } catch (err) {
          console.error("Error saving file from folder", err);
        }
      }
      setFiles(prev => [...prev, ...newFiles]);
    }
     // Reset input
     e.target.value = '';
  };

  const handleFileSelect = (id: string) => {
    setActiveFileId(id);
    // On mobile, close sidebar when file is selected
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleFileDelete = async (id: string) => {
    try {
      await deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      setHistory(prev => prev.filter(h => h.fileId !== id));
      if (activeFileId === id) {
        setActiveFileId(null);
      }
    } catch (err) {
      console.error("Error deleting file", err);
    }
  };

  const handleFolderDelete = async (folderPath: string) => {
    // Find all files that start with this path
    const filesToDelete = files.filter(f => {
        const cleanPath = f.path.replace(/^\//, '');
        return cleanPath.startsWith(folderPath + '/');
    });

    for (const file of filesToDelete) {
        await handleFileDelete(file.id);
    }
  };

  const handlePageChange = useCallback(async (page: number, total: number) => {
    if (!activeFileId) return;

    // Update local state immediately for UI responsiveness if needed, 
    // but here we just write to DB
    try {
       await updateHistory(activeFileId, page, total);
       setHistory(prev => {
         const existingIndex = prev.findIndex(h => h.fileId === activeFileId);
         const newItem: ReadingHistory = {
           fileId: activeFileId,
           lastPage: page,
           lastReadAt: Date.now(),
           totalPages: total
         };
         
         if (existingIndex >= 0) {
           const newHistory = [...prev];
           newHistory[existingIndex] = newItem;
           return newHistory;
         } else {
           return [...prev, newItem];
         }
       });
    } catch (err) {
      console.error("Error updating history", err);
    }
  }, [activeFileId]);

  const activeFile = files.find(f => f.id === activeFileId) || null;
  const fileHistory = history.find(h => h.fileId === activeFileId);
  const initialPage = fileHistory ? fileHistory.lastPage : 1;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar
        files={files}
        history={history}
        activeFileId={activeFileId}
        onFileSelect={handleFileSelect}
        onFileDelete={handleFileDelete}
        onFolderDelete={handleFolderDelete}
        onImport={handleImport}
        onFolderImport={handleFolderImport}
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className={isSidebarOpen && window.innerWidth < 768 ? "hidden" : "flex-1 flex relative flex-col min-w-0"}>
        <PDFReader 
          file={activeFile}
          initialPage={initialPage}
          onPageChange={handlePageChange}
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
        />
      </main>
    </div>
  );
};

export default App;