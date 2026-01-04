"use client";
import React from "react";
import { motion } from "framer-motion";
import { Atom, Binary, Brain, Calculator, Database, Globe } from "lucide-react";

export const TechRings = () => {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden pointer-events-none z-0">
      
      {/* 1. Core Glow (Center) */}
      <div className="absolute bg-brand-primary/30 w-48 h-48 rounded-full blur-[60px] animate-pulse" />

      {/* 2. Inner Tech Ring - Fast Spin */}
      <motion.div
        className="absolute border border-cyan-500/30 w-[280px] h-[280px] rounded-full border-t-transparent border-l-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
        style={{ borderWidth: "2px" }}
      />

      {/* 3. The "Knowledge Ring" - Floating Icons */}
      <motion.div
        className="absolute w-[450px] h-[450px] rounded-full border border-white/5"
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        {/* Icons placed at cardinal directions */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-dark p-2 border border-brand-primary/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Atom size={20} className="text-cyan-400" />
        </div>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 bg-brand-dark p-2 border border-brand-primary/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Calculator size={20} className="text-pink-400" />
        </div>
        <div className="absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-brand-dark p-2 border border-brand-primary/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Binary size={20} className="text-green-400" />
        </div>
        <div className="absolute right-0 top-1/2 translate-x-1/2 -translate-y-1/2 bg-brand-dark p-2 border border-brand-primary/30 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)]">
          <Brain size={20} className="text-purple-400" />
        </div>
      </motion.div>

      {/* 4. Middle Ring - Dashed Data Stream */}
      <motion.div
        className="absolute border border-white/10 w-[600px] h-[600px] rounded-full border-dashed"
        animate={{ rotate: 20 }}
        transition={{ duration: 4, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }}
        style={{ borderWidth: "1px" }}
      />

      {/* 5. The "Metric Ring" - Ruler Ticks (SVG) */}
      <div className="absolute w-[750px] h-[750px] opacity-30 animate-[spin_100s_linear_infinite]">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          <circle cx="50" cy="50" r="49" fill="none" stroke="url(#tick-gradient)" strokeWidth="0.2" />
          {/* Create ticks using stroke-dasharray */}
          <circle 
            cx="50" cy="50" r="48" 
            fill="none" 
            stroke="white" 
            strokeWidth="0.5" 
            strokeDasharray="0.5 4.5" // Dots along the ring
            opacity="0.5"
          />
          <defs>
            <linearGradient id="tick-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="100%" stopColor="#8b5cf6" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* 6. Outer Orbit - Satellite */}
      <motion.div
        className="absolute border border-brand-primary/10 w-[950px] h-[950px] rounded-full"
        animate={{ rotate: 360 }}
        transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
      >
        {/* Floating Satellite / Data Packet */}
        <div className="absolute top-1/2 -right-3 w-6 h-6 border border-cyan-400 rounded-full flex items-center justify-center bg-brand-dark">
           <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
        </div>
        <div className="absolute bottom-1/2 -left-3 w-4 h-4 bg-brand-accent rounded-full shadow-[0_0_10px_rgba(139,92,246,0.8)]" />
      </motion.div>

      {/* 7. Large Radar Sweep */}
      <svg className="absolute w-[1200px] h-[1200px] animate-[spin_20s_linear_infinite] opacity-20 pointer-events-none">
        <circle
          cx="600"
          cy="600"
          r="598"
          fill="none"
          stroke="url(#radar-gradient)"
          strokeWidth="1.5"
          strokeDasharray="400 3400" // Creates the arc
          strokeLinecap="round"
        />
        <defs>
          <linearGradient id="radar-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
};