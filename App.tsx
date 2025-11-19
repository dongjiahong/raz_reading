import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { PDFReader } from './components/PDFReader';
import { ChatPanel } from './components/ChatPanel';
import { saveFile, getFiles, deleteFile, getHistory, updateHistory } from './services/db';
import { StoredFile, ReadingHistory } from './types';
import html2canvas from 'html2canvas';

const App: React.FC = () => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [history, setHistory] = useState<ReadingHistory[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [isSidebarOpen, setSidebarOpen] = useState(true);
  const [isChatOpen, setChatOpen] = useState(false);
  const [currentPdfPageRef, setCurrentPdfPageRef] = useState<HTMLDivElement | null>(null);
  const [pdfScreenshot, setPdfScreenshot] = useState<string | undefined>(undefined);

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
      if (newFiles.length > 0 && !activeFileId) setActiveFileId(newFiles[0].id);
    }
  };

  // Handle Folder Import (Hierarchical)
  const handleFolderImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles: StoredFile[] = [];
      // Convert FileList to Array and cast to File[] to fix type inference
      const fileList = Array.from(e.target.files) as File[];
      
      for (const file of fileList) {
        // Only process PDFs
        if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
          try {
            // webkitRelativePath gives us "Folder/Subfolder/file.pdf"
            // If it's empty (e.g. flat import), fallback to name
            const path = file.webkitRelativePath || file.name;
            const storedFile = await saveFile(file, path);
            newFiles.push(storedFile);
          } catch (err) {
            console.error("Error saving file from folder", err);
          }
        }
      }
      
      if (newFiles.length > 0) {
        setFiles(prev => [...prev, ...newFiles]);
        alert(`Imported ${newFiles.length} PDF files.`);
      } else {
        alert("No PDF files found in the selected folder.");
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Are you sure you want to remove this file?")) {
      await deleteFile(id);
      setFiles(prev => prev.filter(f => f.id !== id));
      if (activeFileId === id) setActiveFileId(null);
    }
  };

  const handleFolderDelete = async (folderPath: string) => {
    if (window.confirm(`Are you sure you want to delete folder "${folderPath}" and all its contents?`)) {
      // Find all files that start with this folder path
      // Normalize path logic: "Folder" should match "Folder/File.pdf" but not "Folder2/File.pdf"
      const filesToDelete = files.filter(f => {
        return f.path === folderPath || f.path.startsWith(folderPath + '/');
      });

      for (const file of filesToDelete) {
        await deleteFile(file.id);
      }

      setFiles(prev => prev.filter(f => !filesToDelete.some(del => del.id === f.id)));
      
      // If active file is in the deleted folder, deselect it
      if (activeFileId && filesToDelete.some(f => f.id === activeFileId)) {
        setActiveFileId(null);
      }
    }
  };

  const handlePageChange = useCallback(async (page: number, total: number) => {
    if (activeFileId) {
      await updateHistory(activeFileId, page, total);
      // Update local history state for UI progress bars
      setHistory(prev => {
        const existing = prev.findIndex(h => h.fileId === activeFileId);
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = { ...updated[existing], lastPage: page, totalPages: total, lastReadAt: Date.now() };
          return updated;
        }
        return [...prev, { fileId: activeFileId, lastPage: page, totalPages: total, lastReadAt: Date.now() }];
      });
    }
  }, [activeFileId]);

  // Capture screenshot for AI when chat is opened or page changes
  const capturePageContext = async () => {
    if (currentPdfPageRef && isChatOpen) {
       try {
         // Find canvas inside the page ref
         const canvas = currentPdfPageRef.querySelector('canvas');
         if (canvas) {
           setPdfScreenshot(canvas.toDataURL('image/png'));
         } else {
           // Fallback if canvas is not directly there
           const cvs = await html2canvas(currentPdfPageRef, { scale: 1, logging: false });
           setPdfScreenshot(cvs.toDataURL('image/png'));
         }
       } catch (e) {
         console.warn("Failed to capture PDF context", e);
       }
    }
  };

  useEffect(() => {
    if (isChatOpen) {
      const timer = setTimeout(capturePageContext, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isChatOpen, activeFileId, history]);

  const activeFile = files.find(f => f.id === activeFileId) || null;
  const currentHistory = history.find(h => h.fileId === activeFileId);

  return (
    <div className="flex h-full w-full overflow-hidden">
      <Sidebar
        isOpen={isSidebarOpen}
        files={files}
        history={history}
        activeFileId={activeFileId}
        onFileSelect={(id) => {
            setActiveFileId(id);
            if (window.innerWidth < 768) setSidebarOpen(false);
        }}
        onFileDelete={handleDelete}
        onFolderDelete={handleFolderDelete}
        onImport={handleImport}
        onFolderImport={handleFolderImport}
      />
      
      <main className="flex-1 flex relative overflow-hidden transition-all">
        <PDFReader
          file={activeFile}
          initialPage={currentHistory?.lastPage || 1}
          onPageChange={handlePageChange}
          onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
          onToggleChat={() => setChatOpen(!isChatOpen)}
          setPdfPageRef={setCurrentPdfPageRef}
        />
        
        {isSidebarOpen && (
            <div 
                className="md:hidden absolute inset-0 bg-black/50 z-20"
                onClick={() => setSidebarOpen(false)}
            />
        )}
      </main>

      <ChatPanel 
        isOpen={isChatOpen} 
        onClose={() => setChatOpen(false)}
        pdfPageImage={pdfScreenshot}
        currentPage={currentHistory?.lastPage || 1}
      />
    </div>
  );
};

export default App;