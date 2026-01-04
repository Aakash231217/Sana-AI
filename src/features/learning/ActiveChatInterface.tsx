"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Sparkles, Send, X } from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface ActiveChatProps {
  onClose: () => void;
}

export const ActiveChatInterface: React.FC<ActiveChatProps> = ({ onClose }) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: "Hello! I'm Sana. What subject are we conquering today? 🚀" }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    const newMessages = [...messages, { role: 'user', content: userMsg } as Message];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
      }
    } catch (error) {
      console.error("Chat error", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-4xl mx-auto h-[600px] relative"
    >
      {/* Glow Effect */}
      <div className="absolute -inset-1 bg-gradient-to-r from-brand-primary to-brand-glow rounded-3xl blur opacity-30"></div>
      
      {/* Main Card */}
      <div className="relative h-full bg-brand-dark border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-slate-900/50 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg shadow-brand-primary/20">
              <Bot size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-white font-bold">Sana-AI Live</h3>
              <p className="text-xs text-brand-primary flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-brand-primary rounded-full animate-pulse" /> 
                Online & Ready
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar">
          {messages.map((msg, idx) => (
            <motion.div 
              key={idx}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                msg.role === 'user' ? 'bg-slate-700' : 'bg-brand-primary'
              }`}>
                {msg.role === 'user' ? <User size={14} className="text-slate-300" /> : <Bot size={14} className="text-white" />}
              </div>
              
              <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                msg.role === 'user' 
                  ? 'bg-slate-800 text-slate-200 rounded-tr-none' 
                  : 'bg-gradient-to-br from-brand-primary/20 to-brand-accent/20 border border-brand-primary/30 text-blue-100 rounded-tl-none'
              }`}>
                {msg.content}
              </div>
            </motion.div>
          ))}
          
          {isLoading && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
               <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center flex-shrink-0">
                  <Bot size={14} className="text-white" />
              </div>
              <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center">
                <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-100" />
                <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-200" />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 bg-slate-900/50 border-t border-white/10">
          <form onSubmit={sendMessage} className="relative group">
            <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full opacity-0 group-focus-within:opacity-20 transition-opacity blur-md" />
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Sana anything..."
              className="w-full bg-slate-950/80 border border-white/10 rounded-full py-4 pl-6 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary/50 transition-colors relative z-10"
              disabled={isLoading}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              className="absolute right-2 top-2 w-10 h-10 bg-brand-primary rounded-full flex items-center justify-center text-white hover:bg-brand-accent transition-colors disabled:opacity-50 z-20"
            >
              {isLoading ? <Sparkles size={18} className="animate-spin" /> : <Send size={18} />}
            </button>
          </form>
        </div>

      </div>
    </motion.div>
  );
};