"use client";
import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, User, Sparkles, Send, X } from 'lucide-react';
import { Mascot3D } from '@/components/learning/Mascot3D';
import { detectEmotion, type MascotEmotion } from '@/utils/emotionDetector';

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
  const [mascotEmotion, setMascotEmotion] = useState<MascotEmotion>('happy');
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
    setMascotEmotion('thinking');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await response.json();

      if (data.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
        // Detect emotion from AI response and update mascot
        const detectedEmotion = detectEmotion(data.reply);
        setMascotEmotion(detectedEmotion);
      }
    } catch (error) {
      console.error("Chat error", error);
      setMascotEmotion('confused');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="w-full max-w-5xl mx-auto h-[700px] relative p-4"
    >

      {/* Wrapper for positioning Mascot outside the clipped glass console */}
      <div className="relative w-full h-full flex flex-col items-center">

        {/* INTEGRATED MASCOT: Giant Center-Left Sidekick */}
        <div className="absolute top-1/2 -left-[280px] -translate-y-1/2 w-[500px] h-[500px] z-50 pointer-events-none hidden xl:block select-none">
          <div className="pointer-events-auto w-full h-full transform hover:scale-110 transition-transform duration-500 hover:rotate-3">
            <Mascot3D
              state={isLoading ? 'thinking' : mascotEmotion}
              onClick={() => setMascotEmotion('excited')}
              className="drop-shadow-2xl w-full h-full"
            />
          </div>
          {/* Speech Bubble Positioned for Center-Left */}
          {isLoading && (
            <div className="absolute top-1/3 right-20 bg-white/10 backdrop-blur-md border border-white/10 px-4 py-2 rounded-2xl rounded-bl-none text-xs text-white font-medium animate-in fade-in slide-in-from-bottom-2 shadow-lg">
              Generating answer... ✨
            </div>
          )}
        </div>

        {/* Unified Glass Console */}
        <div className="relative w-full h-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col z-10">

          {/* Background Decor */}
          <div className="absolute top-[-100px] left-[-100px] w-[600px] h-[600px] bg-brand-primary/10 blur-[150px] rounded-full pointer-events-none -z-10" />
          <div className="absolute bottom-[-100px] right-[-100px] w-[500px] h-[500px] bg-brand-glow/10 blur-[130px] rounded-full pointer-events-none -z-10" />

          {/* Header */}
          <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/5 backdrop-blur-md z-20">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg shadow-brand-primary/25">
                <Bot size={20} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Personal Tutor</h3>
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
          <div className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth custom-scrollbar relative z-10">
            {messages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg ${msg.role === 'user' ? 'bg-slate-700' : 'bg-gradient-to-br from-brand-primary to-brand-glow'
                  }`}>
                  {msg.role === 'user' ? <User size={16} className="text-slate-300" /> : <Bot size={18} className="text-white" />}
                </div>

                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed shadow-md backdrop-blur-sm ${msg.role === 'user'
                  ? 'bg-slate-800/80 text-slate-200 rounded-tr-none border border-slate-700'
                  : 'bg-white/5 border border-brand-primary/20 text-blue-50 rounded-tl-none'
                  }`}>
                  {msg.content}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-primary to-brand-glow flex items-center justify-center flex-shrink-0">
                  <Bot size={18} className="text-white" />
                </div>
                <div className="bg-white/5 px-4 py-3 rounded-2xl rounded-tl-none flex gap-1 items-center border border-white/5 backdrop-blur-sm">
                  <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce" />
                  <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-100" />
                  <span className="w-2 h-2 bg-brand-primary rounded-full animate-bounce delay-200" />
                </div>
              </motion.div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <div className="p-6 bg-gradient-to-t from-slate-900/80 to-transparent z-20 relative backdrop-blur-md">
            <form onSubmit={sendMessage} className="relative group flex-1">
              <div className="absolute inset-0 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full opacity-0 group-focus-within:opacity-30 transition-opacity blur-md" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask your tutor simply..."
                className="w-full bg-slate-950/60 border border-white/10 rounded-full py-4 pl-6 pr-14 text-white placeholder:text-slate-500 focus:outline-none focus:border-brand-primary/50 transition-all relative z-10 shadow-inner backdrop-blur-md"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-2 w-10 h-10 bg-gradient-to-r from-brand-primary to-brand-accent rounded-full flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-50 z-20 shadow-lg transform active:scale-95"
              >
                {isLoading ? <Sparkles size={18} className="animate-spin" /> : <Send size={18} />}
              </button>
            </form>
          </div>

        </div>
      </div>
    </motion.div>
  );
};