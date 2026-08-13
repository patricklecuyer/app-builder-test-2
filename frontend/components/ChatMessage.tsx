import React, { useMemo } from 'react';
import { User, Bot } from 'lucide-react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';
import { Message } from '../types.ts';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';

  // Memoize the markdown rendering to prevent unnecessary recalculations
  const htmlContent = useMemo(() => {
    if (isUser) return message.text; // Don't parse markdown for user input
    
    // Parse markdown and sanitize
    const rawMarkup = marked.parse(message.text, { async: false }) as string;
    return DOMPurify.sanitize(rawMarkup);
  }, [message.text, isUser]);

  return (
    <div className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
      <div className={`flex max-w-[85%] ${isUser ? 'flex-row-reverse' : 'flex-row'} items-end gap-3`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center shadow-sm
          ${isUser ? 'bg-indigo-600 text-white' : 'bg-emerald-500 text-white'}`}
        >
          {isUser ? <User size={18} /> : <Bot size={18} />}
        </div>

        {/* Message Bubble */}
        <div className={`relative px-5 py-3.5 shadow-sm text-[15px] leading-relaxed
          ${isUser 
            ? 'bg-indigo-600 text-white rounded-2xl rounded-br-sm' 
            : 'bg-white text-slate-800 rounded-2xl rounded-bl-sm border border-slate-100'
          }`}
        >
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{message.text}</div>
          ) : (
            <div 
              className="prose prose-sm max-w-none break-words"
              dangerouslySetInnerHTML={{ __html: htmlContent }} 
            />
          )}
          
          {/* Timestamp */}
          <div className={`text-[10px] mt-1.5 text-right ${isUser ? 'text-indigo-200' : 'text-slate-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};
