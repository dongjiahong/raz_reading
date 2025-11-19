import React, { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, MessageSquareText, Menu } from 'lucide-react';
import { StoredFile } from '../types';
import { Button } from './Button';
import clsx from 'clsx';
// CSS imported in index.html to avoid ESM errors
// import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
// import 'react-pdf/dist/esm/Page/TextLayer.css';

interface PDFReaderProps {
  file: StoredFile | null;
  initialPage?: number;
  onPageChange: (page: number, total: number) => void;
  onToggleSidebar: () => void;
  onToggleChat: () => void;
  setPdfPageRef: (element: HTMLDivElement | null) => void; // Pass ref up for screenshot
}

export const PDFReader: React.FC<PDFReaderProps> = ({
  file,
  initialPage = 1,
  onPageChange,
  onToggleSidebar,
  onToggleChat,
  setPdfPageRef
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(800);

  // Reset state when file changes
  useEffect(() => {
    setPageNumber(initialPage);
    setRotation(0);
    setScale(1.0);
  }, [file, initialPage]);

  // Resize observer for responsive PDF width
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    onPageChange(pageNumber, numPages);
  }

  const changePage = (offset: number) => {
    setPageNumber(prevPageNumber => {
      const newPage = Math.min(Math.max(1, prevPageNumber + offset), numPages || 1);
      onPageChange(newPage, numPages || 1);
      return newPage;
    });
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-slate-400">
        <div className="w-24 h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Menu className="w-10 h-10 opacity-20" />
        </div>
        <h2 className="text-xl font-semibold text-slate-700 mb-2">No PDF Selected</h2>
        <p className="max-w-sm text-center">Select a file from the sidebar or import a new PDF to start reading.</p>
        <Button className="mt-6 md:hidden" onClick={onToggleSidebar}>Open Menu</Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="lg:hidden">
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-slate-700 truncate max-w-[200px] md:max-w-md">
            {file.name}
          </h1>
        </div>

        <div className="flex items-center gap-1 md:gap-2 bg-slate-100 rounded-lg p-1">
          <Button 
            variant="ghost" size="icon" className="h-7 w-7" 
            onClick={() => changePage(-1)} 
            disabled={pageNumber <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-xs font-medium min-w-[4rem] text-center">
            {pageNumber} / {numPages || '--'}
          </span>
          <Button 
            variant="ghost" size="icon" className="h-7 w-7" 
            onClick={() => changePage(1)} 
            disabled={pageNumber >= (numPages || 1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden md:flex items-center gap-1 border-r border-slate-200 pr-2 mr-2">
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
           <Button 
            variant="primary" 
            size="sm" 
            onClick={onToggleChat}
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 shadow-sm"
          >
            <MessageSquareText className="w-4 h-4" />
            <span className="hidden sm:inline">Ask AI</span>
          </Button>
        </div>
      </div>

      {/* PDF Canvas */}
      <div className="flex-1 overflow-auto bg-slate-100/50 p-4 md:p-8 flex justify-center" ref={containerRef}>
        <Document
          file={file.data}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex items-center gap-2 text-slate-400 mt-20">
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
              <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
            </div>
          }
          className="outline-none"
        >
          <div ref={setPdfPageRef} className="transition-transform duration-200 ease-out origin-top">
            <Page 
              pageNumber={pageNumber} 
              scale={scale} 
              rotate={rotation}
              width={Math.min(containerWidth - 64, 1000)} // Responsive width limiting
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className="bg-white"
            />
          </div>
        </Document>
      </div>
    </div>
  );
};