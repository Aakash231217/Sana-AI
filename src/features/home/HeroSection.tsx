"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import Link from "next/link";
import { Button } from '@/components/ui/Button';
import { TechRings } from '@/components/ui/TechRings'; // <--- IMPORT THIS

export const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen flex items-center justify-center overflow-hidden pt-20">
      
      {/* 1. Deep Background (Blobs) */}
      <div className="absolute inset-0 bg-brand-dark z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-brand-primary/10 rounded-full blur-[120px] animate-blob" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-brand-accent/10 rounded-full blur-[120px] animate-blob animation-delay-2000" />
      </div>

      {/* 2. NEW: Tech Rings Component */}
      <TechRings />

      {/* 3. Main Content (High Z-Index) */}
      <div className="relative z-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center">
        
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md shadow-lg">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-brand-primary"></span>
            </span>
            <span className="text-sm font-medium text-blue-200">Welcome to Sana-AI v2.0</span>
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-6xl md:text-8xl font-black tracking-tight text-white mb-6 leading-tight"
        >
          Learning Reimagined <br />
          with <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-primary via-brand-accent to-brand-glow animate-shimmer bg-[length:200%_100%]">Sana-AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="mt-4 max-w-2xl text-lg md:text-xl text-slate-400 mb-10"
        >
          Experience a student-first platform where assignments meet intelligence. 
          Your library, schedule, and private AI tutor, all in one place.
        </motion.p>

        <motion.div 
          className="flex flex-col sm:flex-row gap-5"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
        >
          <Link href="/maintenance">
            <Button variant="primary" className="group text-lg px-8 py-4">
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          
          <Link href="/maintenance">
            <Button variant="outline" className="text-lg px-8 py-4 group">
              <PlayCircle className="w-5 h-5 mr-2 group-hover:text-brand-glow transition-colors" />
              Watch Demo
            </Button>
          </Link>
        </motion.div>
      </div>

      {/* 4. Overlay Gradients (Foreground) */}
      <div className="absolute bottom-0 w-full h-[200px] bg-gradient-to-t from-brand-dark to-transparent z-10 pointer-events-none" />
      <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-[0.03] z-0 pointer-events-none" />
    </section>
  );
};