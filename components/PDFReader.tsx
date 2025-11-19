import React, { useState, useEffect, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Menu } from 'lucide-react';
import { StoredFile } from '../types';
import { Button } from './Button';
import clsx from 'clsx';

interface PDFReaderProps {
  file: StoredFile | null;
  initialPage?: number;
  onPageChange: (page: number, total: number) => void;
  onToggleSidebar: () => void;
}

export const PDFReader: React.FC<PDFReaderProps> = ({
  file,
  initialPage = 1,
  onPageChange,
  onToggleSidebar
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(initialPage);
  const [scale, setScale] = useState(1.0);
  const [rotation, setRotation] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Initialize with window width to avoid default 800px causing huge render on mobile
  const [containerWidth, setContainerWidth] = useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 800
  );
  
  // Swipe state
  const touchStart = useRef<number | null>(null);
  const touchEnd = useRef<number | null>(null);
  const touchYStart = useRef<number | null>(null);
  const touchYEnd = useRef<number | null>(null);
  const minSwipeDistance = 50;

  useEffect(() => {
    setPageNumber(initialPage);
    setRotation(0);
    setScale(1.0);
  }, [file, initialPage]);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      }
    };

    // Initial measure
    updateWidth();

    const observer = new ResizeObserver(updateWidth);
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

  // Improved swipe handler that ignores vertical scrolls
  const onTouchStart = (e: React.TouchEvent) => {
    touchEnd.current = null;
    touchYEnd.current = null;
    touchStart.current = e.targetTouches[0].clientX;
    touchYStart.current = e.targetTouches[0].clientY;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEnd.current = e.targetTouches[0].clientX;
    touchYEnd.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = () => {
    if (!touchStart.current || !touchEnd.current || !touchYStart.current || !touchYEnd.current) return;
    
    const xDistance = touchStart.current - touchEnd.current;
    const yDistance = touchYStart.current - touchYEnd.current;
    
    // Only trigger if horizontal swipe is significantly larger than vertical scroll
    if (Math.abs(xDistance) > Math.abs(yDistance) * 1.5) {
      const isLeftSwipe = xDistance > minSwipeDistance;
      const isRightSwipe = xDistance < -minSwipeDistance;

      if (isLeftSwipe && pageNumber < (numPages || 1)) {
        changePage(1);
      } else if (isRightSwipe && pageNumber > 1) {
        changePage(-1);
      }
    }
  };

  // Logic for mobile visual flash on tap
  const [flash, setFlash] = useState<'left' | 'right' | null>(null);
  const handleZoneClick = (direction: 'left' | 'right') => {
    setFlash(direction);
    setTimeout(() => setFlash(null), 200);
    changePage(direction === 'left' ? -1 : 1);
  };

  if (!file) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-gray-50 text-slate-400 p-4">
        <div className="w-20 h-20 md:w-24 md:h-24 bg-slate-100 rounded-full flex items-center justify-center mb-4">
          <Menu className="w-8 h-8 md:w-10 md:h-10 opacity-20" />
        </div>
        <h2 className="text-lg md:text-xl font-semibold text-slate-700 mb-2">No PDF Selected</h2>
        <p className="max-w-sm text-center text-sm md:text-base">Select a file from the sidebar to start reading.</p>
        <Button className="mt-6 md:hidden" onClick={onToggleSidebar}>Open Library</Button>
      </div>
    );
  }

  // Responsive width calculation
  const isMobile = containerWidth < 768;
  // Mobile: Full width (0 padding)
  // Desktop: Container width minus padding (md:p-8 = 2rem*2 = 64px)
  // We also cap the max width for readability on huge screens
  const pdfRenderWidth = isMobile 
    ? containerWidth 
    : Math.min(containerWidth - 64, 1000);

  return (
    <div className="flex-1 flex flex-col h-full relative">
      {/* Toolbar */}
      <div className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-3 md:px-4 shrink-0 z-10 shadow-sm gap-2">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <Button variant="ghost" size="icon" onClick={onToggleSidebar} className="md:hidden shrink-0">
            <Menu className="w-5 h-5" />
          </Button>
          <h1 className="text-sm font-semibold text-slate-700 truncate">
            {file.name}
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
           {/* Pagination */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 md:p-1">
            <Button 
              variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" 
              onClick={() => changePage(-1)} 
              disabled={pageNumber <= 1}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-xs font-medium min-w-[3rem] md:min-w-[4rem] text-center">
              {pageNumber} / {numPages || '--'}
            </span>
            <Button 
              variant="ghost" size="icon" className="h-7 w-7 md:h-8 md:w-8" 
              onClick={() => changePage(1)} 
              disabled={pageNumber >= (numPages || 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="hidden md:flex items-center gap-1 border-r border-slate-200 pr-2">
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.max(0.5, s - 0.1))}>
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs w-12 text-center">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon" onClick={() => setScale(s => Math.min(2.0, s + 0.1))}>
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* PDF Canvas Container */}
      <div 
        className="flex-1 overflow-auto bg-slate-100/50 relative touch-pan-y" 
        ref={containerRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Visual Flash for Tap Zones */}
        <div className={clsx(
          "absolute inset-y-0 left-0 w-12 bg-white/20 z-20 pointer-events-none transition-opacity duration-200",
          flash === 'left' ? "opacity-100" : "opacity-0"
        )} />
        <div className={clsx(
          "absolute inset-y-0 right-0 w-12 bg-white/20 z-20 pointer-events-none transition-opacity duration-200",
          flash === 'right' ? "opacity-100" : "opacity-0"
        )} />

        {/* Mobile Tap Zones */}
        <div 
            className="absolute top-0 left-0 w-[15%] h-full z-10 cursor-pointer md:hidden active:bg-black/5"
            onClick={() => handleZoneClick('left')}
            aria-label="Previous Page"
        />
        <div 
            className="absolute top-0 right-0 w-[15%] h-full z-10 cursor-pointer md:hidden active:bg-black/5"
            onClick={() => handleZoneClick('right')}
            aria-label="Next Page"
        />

        {/* 
            Container for the Page. 
            On mobile (p-0), we want full width. 
            On desktop (p-8), we add breathing room. 
        */}
        <div className="min-h-full flex justify-center p-0 md:p-8">
          <Document
            file={file.data}
            onLoadSuccess={onDocumentLoadSuccess}
            loading={
              <div className="flex items-center justify-center h-[50vh] w-full">
                <div className="flex items-center gap-2 text-slate-400">
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                  <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            }
            className="outline-none"
          >
            <div className="transition-transform duration-200 ease-out origin-top shadow-lg bg-white">
              <Page 
                pageNumber={pageNumber} 
                scale={scale} 
                rotate={rotation}
                width={pdfRenderWidth}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                className="bg-white"
                loading={
                    <div className="w-full h-[600px] bg-white animate-pulse" />
                }
              />
            </div>
          </Document>
        </div>
      </div>
    </div>
  );
};