import React, { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { ChatMessage } from '../types';
import { Button } from './Button';
import { generateAIResponse } from '../services/geminiService';
import clsx from 'clsx';

interface ChatPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pdfPageImage?: string; // Base64 image of current page
  pdfPageText?: string;  // Extracted text
  currentPage: number;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onClose,
  pdfPageImage,
  pdfPageText,
  currentPage
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      text: input,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    // Create a placeholder for the model response
    const modelMsgId = crypto.randomUUID();
    setMessages(prev => [...prev, {
      id: modelMsgId,
      role: 'model',
      text: '',
      isLoading: true,
      timestamp: Date.now()
    }]);

    // Call API
    const responseText = await generateAIResponse({
      prompt: userMsg.text,
      text: pdfPageText,
      imageBase64: pdfPageImage // Send current page visually
    });

    setMessages(prev => prev.map(msg => 
      msg.id === modelMsgId 
        ? { ...msg, text: responseText, isLoading: false }
        : msg
    ));
    setIsLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 bg-white border-l border-slate-200 h-full flex flex-col shadow-xl absolute right-0 top-0 z-20 md:relative">
      <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white">
        <div className="flex items-center gap-2 text-indigo-700 font-medium">
          <Sparkles className="w-4 h-4" />
          <span>Gemini Assistant</span>
        </div>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Context Indicator */}
      <div className="px-4 py-2 bg-slate-50 text-xs text-slate-500 border-b border-slate-100 flex items-center justify-between">
        <span>Analyzing Page {currentPage}</span>
        {pdfPageImage && <ImageIcon className="w-3 h-3 text-indigo-500" />}
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50"
      >
        {messages.length === 0 && (
          <div className="text-center mt-10 text-slate-400 text-sm px-6">
            <Sparkles className="w-8 h-8 mx-auto mb-3 text-indigo-200" />
            <p>Ask questions about the current page. I can see the layout and text!</p>
          </div>
        )}

        {messages.map(msg => (
          <div 
            key={msg.id} 
            className={clsx(
              "max-w-[90%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm",
              msg.role === 'user' 
                ? "ml-auto bg-indigo-600 text-white rounded-br-none" 
                : "mr-auto bg-white text-slate-800 border border-slate-100 rounded-bl-none"
            )}
          >
            {msg.isLoading ? (
              <div className="flex items-center gap-2 text-slate-400">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Thinking...</span>
              </div>
            ) : (
              <p className="whitespace-pre-wrap">{msg.text}</p>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 bg-white border-t border-slate-100">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about this page..."
            className="flex-1 px-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <Button 
            variant="primary" 
            size="icon" 
            className="rounded-full w-10 h-10 shrink-0"
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};
