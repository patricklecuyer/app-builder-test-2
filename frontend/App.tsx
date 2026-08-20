import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { Message } from './types.ts';
import { createSession, streamQuery } from './services/agentService.ts';
import { ChatMessage } from './components/ChatMessage.tsx';

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [userId, setUserId] = useState<string>('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize session on mount
  useEffect(() => {
    const init = async () => {
      try {
        setIsInitializing(true);
        setError(null);
        // Generate a pseudo-random UUID for the user session
        const uid = crypto.randomUUID ? crypto.randomUUID() : `user-${Date.now()}`;
        setUserId(uid);
        
        const sid = await createSession(uid);
        setSessionId(sid);
        
        // Add initial greeting
        setMessages([
          {
            id: 'welcome',
            role: 'agent',
            text: 'Hello! I am Concierge. How can I assist you today?',
            timestamp: Date.now(),
          }
        ]);
      } catch (err: any) {
        console.error("Initialization error:", err);
        setError(err.message || "Failed to connect to the agent.");
      } finally {
        setIsInitializing(false);
      }
    };

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    const trimmedInput = inputValue.trim();
    if (!trimmedInput || !sessionId || isLoading) return;

    const userMsgId = crypto.randomUUID ? crypto.randomUUID() : `msg-${Date.now()}`;
    const agentMsgId = `agent-${Date.now()}`;

    // 1. Add user message to UI
    const userMessage: Message = {
      id: userMsgId,
      role: 'user',
      text: trimmedInput,
      timestamp: Date.now(),
    };

    // 2. Add placeholder agent message to UI
    const initialAgentMessage: Message = {
      id: agentMsgId,
      role: 'agent',
      text: '',
      timestamp: Date.now(),
    };

    setMessages(prev => [...prev, userMessage, initialAgentMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);

    try {
      // 3. Stream the response
      await streamQuery(userId, sessionId, trimmedInput, (chunkText) => {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIndex = newMessages.length - 1;
          const lastMsg = newMessages[lastIndex];
          
          if (lastMsg && lastMsg.id === agentMsgId) {
            // Append the chunk to the existing text
            newMessages[lastIndex] = {
              ...lastMsg,
              text: lastMsg.text + chunkText
            };
          }
          return newMessages;
        });
      });
    } catch (err: any) {
      console.error("Streaming error:", err);
      setError(err.message || "An error occurred while communicating with the agent.");
      // Remove the empty agent message if it failed immediately
      setMessages(prev => {
        const newMessages = [...prev];
        if (newMessages[newMessages.length - 1].text === '') {
          newMessages.pop();
        }
        return newMessages;
      });
    } finally {
      setIsLoading(false);
      // Refocus input after sending
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto bg-slate-50 shadow-2xl sm:border-x sm:border-slate-200">
      
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0 z-10 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2 rounded-lg">
            <Sparkles className="text-emerald-600" size={24} />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight">Concierge</h1>
            <p className="text-xs text-slate-500 font-medium flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Agent Platform ADK - Test test test
            </p>
          </div>
        </div>
      </header>

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 rounded-r-md flex items-start gap-3 shrink-0">
          <AlertCircle className="text-red-500 mt-0.5 shrink-0" size={18} />
          <div className="text-sm text-red-800">
            <p className="font-semibold">Connection Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 scroll-smooth">
        {isInitializing ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
            <Loader2 className="animate-spin text-emerald-500" size={40} />
            <p className="text-sm font-medium animate-pulse">Connecting to Concierge...</p>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            {messages.map((msg) => (
              <ChatMessage key={msg.id} message={msg} />
            ))}
            
            {/* Loading Indicator for Agent Response */}
            {isLoading && messages[messages.length - 1]?.role === 'user' && (
              <div className="flex justify-start mb-6">
                <div className="flex items-end gap-3">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm">
                    <Sparkles size={16} />
                  </div>
                  <div className="bg-white px-5 py-4 rounded-2xl rounded-bl-sm border border-slate-100 shadow-sm flex gap-1.5 items-center">
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-slate-300 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} className="h-4" />
          </div>
        )}
      </main>

      {/* Input Area */}
      <footer className="bg-white border-t border-slate-200 p-4 shrink-0">
        <div className="max-w-3xl mx-auto relative flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isInitializing ? "Connecting..." : "Type your message..."}
            disabled={isInitializing || isLoading}
            className="w-full bg-slate-100 border-transparent focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 rounded-full py-3.5 pl-6 pr-14 text-slate-800 placeholder-slate-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed outline-none shadow-inner"
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isInitializing || isLoading}
            className="absolute right-2 p-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full transition-colors disabled:opacity-50 disabled:hover:bg-emerald-500 flex items-center justify-center shadow-md"
            aria-label="Send message"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} className="ml-0.5" />}
          </button>
        </div>
        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400">Powered by Vertex AI Agent Platform</span>
        </div>
      </footer>
    </div>
  );
}
