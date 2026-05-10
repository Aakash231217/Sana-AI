"use client";
import React, { useState } from 'react';
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AIFeature } from "@/features/learning/AIFeature";
import { ChatWrapper } from "@/components/chat/ChatWrapper";
import { api } from "@/trpc/react";
import { AnimatePresence, motion } from 'framer-motion';
import { Book, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

export default function TutorPage() {
  const [isChatActive, setIsChatActive] = useState(false);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [showBookSelector, setShowBookSelector] = useState(false);

  const { data: files, isLoading: filesLoading } = api.file.getUserFiles.useQuery(undefined, {
    enabled: showBookSelector || isChatActive,
  });

  const handleStartChat = () => {
    setShowBookSelector(true);
  };

  const handleSelectBook = (fileId: string) => {
    setSelectedFileId(fileId);
    setShowBookSelector(false);
    setIsChatActive(true);
  };

  const handleClose = () => {
    setIsChatActive(false);
    setSelectedFileId(null);
    setShowBookSelector(false);
  };

  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-brand-dark pt-20">
        <Navbar />
         <div className="container mx-auto px-4 py-8">
            <div className="flex items-center gap-4 mb-8 pl-4 border-l-4 border-brand-glow">
                <h1 className="text-3xl font-bold text-white">Personal Tutor</h1>
                {isChatActive && (
                    <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full border border-green-500/30 animate-pulse">
                        Session Active
                    </span>
                )}
            </div>
            
            <AnimatePresence mode="wait">
                {isChatActive && selectedFileId ? (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <button
                            onClick={handleClose}
                            className="mb-4 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            <ArrowLeft size={16} />
                            Back to book selection
                        </button>
                        <div className="h-[calc(100vh-14rem)]">
                            <ChatWrapper fileId={selectedFileId} />
                        </div>
                    </motion.div>
                ) : showBookSelector ? (
                    <motion.div
                        key="selector"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.3 }}
                    >
                        <button
                            onClick={() => setShowBookSelector(false)}
                            className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
                        >
                            <ArrowLeft size={16} />
                            Back
                        </button>
                        <h2 className="text-xl font-semibold text-white mb-2">Select a Book</h2>
                        <p className="text-slate-400 mb-6 text-sm">
                            Choose a book to start your tutoring session. Sana will use the book&apos;s content to give you accurate, context-aware answers.
                        </p>
                        {filesLoading ? (
                            <div className="flex items-center justify-center py-16">
                                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                            </div>
                        ) : files && files.length > 0 ? (
                            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {files
                                    .filter((f) => f.uploadStatus === 'SUCCESS')
                                    .map((file) => (
                                        <button
                                            key={file.id}
                                            onClick={() => handleSelectBook(file.id)}
                                            className="group relative overflow-hidden rounded-2xl bg-slate-900 border border-white/10 p-6 text-left hover:border-brand-primary/50 transition-all hover:scale-[1.02]"
                                        >
                                            <div className="w-10 h-10 bg-brand-primary/20 rounded-xl flex items-center justify-center text-brand-primary mb-3">
                                                <Book size={20} />
                                            </div>
                                            <h3 className="text-white font-semibold text-sm truncate mb-1">
                                                {file.name}
                                            </h3>
                                            <p className="text-slate-500 text-xs">
                                                {new Date(file.createdAt).toLocaleDateString()}
                                            </p>
                                            <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-brand-primary opacity-0 group-hover:opacity-10 rounded-full blur-2xl transition-opacity" />
                                        </button>
                                    ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center py-16 text-center">
                                <AlertTriangle className="w-10 h-10 text-yellow-500 mb-4" />
                                <h3 className="text-white font-semibold mb-2">No books uploaded yet</h3>
                                <p className="text-slate-400 text-sm">
                                    Upload a book in the Subjects section first, then come back here to start a tutoring session.
                                </p>
                            </div>
                        )}
                    </motion.div>
                ) : (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AIFeature onStartChat={handleStartChat} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>
    </ProtectedRoute>
  );
}