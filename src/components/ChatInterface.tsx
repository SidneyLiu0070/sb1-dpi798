import React, { useState, useRef, useEffect } from 'react';
import { FileText, Send, ArrowLeft, Plus } from 'lucide-react';
import { ChatMessage } from './ChatMessage';

interface Message {
  content: string;
  isBot: boolean;
}

interface ChatInterfaceProps {
  content: string;
  currentFile: File | null;
  onBack: () => void;
  onNewChat: () => void;
  onSendMessage?: (message: string, onResponse: (response: string) => void) => Promise<void>;
}

export function ChatInterface({ 
  content, 
  currentFile, 
  onBack, 
  onNewChat,
  onSendMessage 
}: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (content && !messages.length) {
      setMessages([{ content, isBot: true }]);
    }
  }, [content]);

  useEffect(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !onSendMessage || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setIsLoading(true);
    setMessages(prev => [...prev, { content: userMessage, isBot: false }]);

    try {
      await onSendMessage(userMessage, (response) => {
        setMessages(prev => [...prev, { content: response, isBot: true }]);
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="p-4 border-b flex items-center justify-between bg-white">
        <div className="flex items-center space-x-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          {currentFile && (
            <div className="flex items-center text-sm text-gray-600">
              <FileText className="w-4 h-4 mr-2" />
              {currentFile.name}
            </div>
          )}
        </div>
        <button
          onClick={onNewChat}
          className="flex items-center px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4 mr-1" />
          新对话
        </button>
      </div>

      {/* Chat Messages */}
      <div 
        ref={chatContainerRef}
        className="flex-1 overflow-y-auto"
      >
        <div className="divide-y divide-gray-100">
          {messages.map((msg, index) => (
            <ChatMessage
              key={index}
              content={msg.content}
              isBot={msg.isBot}
            />
          ))}
        </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSubmit} className="border-t p-4 bg-white">
        <div className="max-w-4xl mx-auto flex space-x-4">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="输入问题..."
            disabled={isLoading}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!message.trim() || !onSendMessage || isLoading}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-colors"
          >
            <Send className="w-4 h-4 mr-2" />
            发送
          </button>
        </div>
      </form>
    </div>
  );
}