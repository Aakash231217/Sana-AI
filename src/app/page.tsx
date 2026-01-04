import { Navbar } from '@/components/layout/Navbar';
import { HeroSection } from '@/features/home/HeroSection';
import React from 'react';

export default function Home() {
  return (
    <main className="min-h-screen bg-brand-dark selection:bg-brand-primary selection:text-white overflow-x-hidden">
      <Navbar />
      <HeroSection />
      
      {/* Footer */}
      <footer className="py-12 border-t border-white/5 bg-slate-950 text-center relative z-10">
        <div className="flex flex-col items-center justify-center gap-4">
           <span className="text-2xl font-bold tracking-tight text-white/20">
              Sana-AI
            </span>
          <p className="text-slate-600 text-xs mt-4">&copy; {new Date().getFullYear()} Sana Learning Systems. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}