"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { Settings, Hammer, ArrowLeft, Bot } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';

export default function MaintenancePage() {
  return (
    <main className="min-h-screen bg-brand-dark flex items-center justify-center relative overflow-hidden">
      {/* Background Blobs (Reused for consistency) */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/20 rounded-full blur-[120px] animate-blob" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-accent/20 rounded-full blur-[120px] animate-blob animation-delay-2000" />

      <div className="relative z-10 max-w-2xl px-6 text-center">
        
        {/* Animated Icon Container */}
        <div className="relative w-40 h-40 mx-auto mb-8">
          {/* Central Robot */}
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-center z-10"
          >
            <div className="w-20 h-20 bg-brand-primary rounded-2xl flex items-center justify-center shadow-lg shadow-brand-primary/40 border border-white/20">
              <Bot size={40} className="text-white" />
            </div>
          </motion.div>

          {/* Spinning Gears */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute -top-4 -right-4 text-slate-600"
          >
            <Settings size={48} />
          </motion.div>
          
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute -bottom-2 -left-4 text-slate-700"
          >
            <Settings size={32} />
          </motion.div>

          {/* Hammer Animation */}
          <motion.div
            animate={{ rotate: [0, -20, 0] }}
            transition={{ duration: 1, repeat: Infinity, repeatDelay: 0.5 }}
            className="absolute top-1/2 -right-12 text-brand-accent"
          >
            <Hammer size={32} />
          </motion.div>
        </div>

        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Sana is <span className="text-brand-glow">Upgrading</span>
          </h1>
          <p className="text-lg text-slate-400 mb-8 max-w-md mx-auto">
            We are currently performing scheduled maintenance to improve your AI learning experience. The virtual classroom will reopen shortly.
          </p>

          <Link href="/">
            <Button variant="outline" className="gap-2">
              <ArrowLeft size={18} />
              Return to Campus
            </Button>
          </Link>
        </motion.div>

        {/* Status Pill */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-yellow-500/10 border border-yellow-500/20"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-yellow-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-yellow-500"></span>
          </span>
          <span className="text-xs font-mono text-yellow-200">SYSTEM_UPDATE_IN_PROGRESS...</span>
        </motion.div>
      </div>
    </main>
  );
}