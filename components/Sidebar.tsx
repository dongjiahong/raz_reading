import React, { useRef, useState, useMemo } from 'react';
import { Plus, FileText, Trash2, Library, BookOpen, Folder, FolderOpen, ChevronRight, ChevronDown, Upload, X } from 'lucide-react';
import { StoredFile, ReadingHistory } from '../types';
import { Button } from './Button';
import clsx from 'clsx';

interface SidebarProps {
  files: StoredFile[];
  history: ReadingHistory[];
  activeFileId: string | null;
  onFileSelect: (id: string) => void;
  onFileDelete: (id: string) => void;
  onFolderDelete: (path: string) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFolderImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isOpen: boolean;
  onClose: () => void;
}

// Tree Node Structure
interface TreeNode {
  id: string;
  name: string;
  path: string;
  type: 'file' | 'folder';
  children: TreeNode[];
  fileId?: string; // Only for files
  size?: number;
}

// Recursive File Tree Component
const FileTreeItem: React.FC<{
  node: TreeNode;
  depth: number;
  activeFileId: string | null;
  expandedFolders: Set<string>;
  toggleFolder: (path: string) => void;
  onFileSelect: (id: string) => void;
  onFileDelete: (id: string) => void;
  onFolderDelete: (path: string) => void;
  getReadPercentage: (fileId: string) => number;
}> = ({ node, depth, activeFileId, expandedFolders, toggleFolder, onFileSelect, onFileDelete, onFolderDelete, getReadPercentage }) => {
  const isExpanded = expandedFolders.has(node.path);
  const isActive = node.fileId === activeFileId;
  const percentage = node.fileId ? getReadPercentage(node.fileId) : 0;
  const paddingLeft = depth * 12 + 12;
  
  if (node.type === 'folder') {
    return (
      <div>
        <div 
          className="group flex items-center justify-between py-2 pr-2 hover:bg-slate-50 cursor-pointer rounded-md text-slate-600 transition-colors select-none"
          style={{ paddingLeft: `${paddingLeft}px` }}
          onClick={() => toggleFolder(node.path)}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-slate-400 shrink-0">
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
            <span className="text-slate-400 shrink-0">
              {isExpanded ? <FolderOpen className="w-4 h-4" /> : <Folder className="w-4 h-4" />}
            </span>
            <span className="text-xs font-medium truncate">{node.name}</span>
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              onFolderDelete(node.path);
            }}
            className="md:opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
            title="Delete folder"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
        {isExpanded && (
          <div>
            {node.children.map(child => (
              <FileTreeItem 
                key={child.path} 
                node={child} 
                depth={depth + 1}
                activeFileId={activeFileId}
                expandedFolders={expandedFolders}
                toggleFolder={toggleFolder}
                onFileSelect={onFileSelect}
                onFileDelete={onFileDelete}
                onFolderDelete={onFolderDelete}
                getReadPercentage={getReadPercentage}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      className={clsx(
        "group relative flex flex-col py-2.5 md:py-2 rounded-lg cursor-pointer transition-all my-0.5",
        isActive ? "bg-indigo-50 text-indigo-900" : "hover:bg-slate-50 text-slate-700"
      )}
      style={{ paddingLeft: `${paddingLeft}px`, paddingRight: '8px' }}
      onClick={() => node.fileId && onFileSelect(node.fileId)}
    >
      <div className="flex items-start gap-3">
        <FileText className={clsx(
          "w-4 h-4 mt-0.5 shrink-0",
          isActive ? "text-indigo-600" : "text-slate-400"
        )} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium truncate">{node.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {node.size && (
              <span className="text-[10px] text-slate-400">
                {(node.size / 1024 / 1024).toFixed(2)} MB
              </span>
            )}
            {percentage > 0 && (
              <span className="text-[10px] font-medium text-indigo-600 bg-indigo-100 px-1.5 rounded-full">
                {percentage}%
              </span>
            )}
          </div>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            node.fileId && onFileDelete(node.fileId);
          }}
          className="md:opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
          title="Delete file"
        >
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  history,
  activeFileId,
  onFileSelect,
  onFileDelete,
  onFolderDelete,
  onImport,
  onFolderImport,
  isOpen,
  onClose
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Build Tree Structure from flat file list
  const treeData = useMemo(() => {
    const root: TreeNode[] = [];
    
    // Sort files by path to ensure folders are created in order
    const sortedFiles = [...files].sort((a, b) => a.path.localeCompare(b.path));

    sortedFiles.forEach(file => {
      // Normalization: remove leading slashes
      const cleanPath = file.path.replace(/^\//, '');
      const parts = cleanPath.split('/');
      
      let currentPath = '';
      let currentLevel = root;

      parts.forEach((part, index) => {
        const isFile = index === parts.length - 1;
        currentPath = currentPath ? `${currentPath}/${part}` : part;

        // Check if node exists at this level
        let node = currentLevel.find(n => n.name === part && n.type === (isFile ? 'file' : 'folder'));

        if (!node) {
          node = {
            id: isFile ? file.id : currentPath,
            name: part,
            path: currentPath,
            type: isFile ? 'file' : 'folder',
            children: [],
            fileId: isFile ? file.id : undefined,
            size: isFile ? file.size : undefined
          };
          currentLevel.push(node);
        }

        if (!isFile) {
          currentLevel = node.children;
        }
      });
    });

    // Recursive sort: Folders first, then files
    const sortNodes = (nodes: TreeNode[]) => {
      nodes.sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
      });
      nodes.forEach(node => {
        if (node.children.length > 0) sortNodes(node.children);
      });
    };

    sortNodes(root);
    return root;
  }, [files]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const getReadPercentage = (fileId: string) => {
    const h = history.find(h => h.fileId === fileId);
    if (!h || !h.totalPages) return 0;
    return Math.round((h.lastPage / h.totalPages) * 100);
  };

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={clsx(
          "fixed inset-0 bg-slate-900/50 z-30 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />
      
      <aside 
        className={clsx(
          "fixed inset-y-0 left-0 z-40 w-72 bg-white border-r border-slate-200 h-full flex flex-col shadow-xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:shadow-none",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-800 font-semibold">
            <BookOpen className="w-5 h-5 text-indigo-600" />
            <span>ZenRead</span>
          </div>
          <button onClick={onClose} className="md:hidden text-slate-400">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-50">
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="application/pdf"
            multiple
            onChange={onImport}
          />
          <input
            type="file"
            ref={folderInputRef}
            className="hidden"
            {...{ webkitdirectory: "", directory: "" } as any}
            multiple
            onChange={onFolderImport}
          />
          
          <Button 
            variant="secondary"
            size="sm"
            className="gap-2 text-xs" 
            onClick={() => fileInputRef.current?.click()}
          >
            <Plus className="w-3.5 h-3.5" /> File
          </Button>
          
          <Button 
            variant="secondary"
            size="sm"
            className="gap-2 text-xs" 
            onClick={() => folderInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5" /> Folder
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 py-2 no-scrollbar">
          {files.length === 0 ? (
            <div className="text-center py-8 text-slate-400 text-sm">
              <Library className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>No files yet</p>
            </div>
          ) : (
            <div className="space-y-0.5">
              {treeData.map(node => (
                <FileTreeItem 
                  key={node.path}
                  node={node}
                  depth={0}
                  activeFileId={activeFileId}
                  expandedFolders={expandedFolders}
                  toggleFolder={toggleFolder}
                  onFileSelect={onFileSelect}
                  onFileDelete={onFileDelete}
                  onFolderDelete={onFolderDelete}
                  getReadPercentage={getReadPercentage}
                />
              ))}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-100 bg-slate-50/50">
           <div className="text-[10px] text-slate-400 text-center">
             <p>Local storage only. {files.length} files.</p>
           </div>
        </div>
      </aside>
    </>
  );
};