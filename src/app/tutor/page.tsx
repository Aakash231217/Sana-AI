"use client";
import React, { useState } from 'react';
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { AIFeature } from "@/features/learning/AIFeature";
import { ActiveChatInterface } from "@/features/learning/ActiveChatInterface"; // Import the new component
import { AnimatePresence, motion } from 'framer-motion';

export default function TutorPage() {
  const [isChatActive, setIsChatActive] = useState(false);

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
                {!isChatActive ? (
                    <motion.div
                        key="intro"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        <AIFeature onStartChat={() => setIsChatActive(true)} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="chat"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <ActiveChatInterface onClose={() => setIsChatActive(false)} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
      </main>
    </ProtectedRoute>
  );
}