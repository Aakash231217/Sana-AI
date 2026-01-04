"use client";
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ArrowRight, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { TechRings } from '@/components/ui/TechRings';
import { useAuth } from '@/context/AuthContext';
import { Navbar } from '@/components/layout/Navbar';

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const { login } = useAuth();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const success = login(username, password);
    if (!success) setError(true);
  };

  return (
    <main className="min-h-screen bg-brand-dark flex items-center justify-center relative overflow-hidden">
      <Navbar />
      <TechRings />
      
      <div className="relative z-10 w-full max-w-md px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-slate-900/50 backdrop-blur-xl border border-white/10 p-8 rounded-3xl shadow-2xl"
        >
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Teacher Portal</h1>
            <p className="text-slate-400 text-sm">Enter your credentials to access the Sana-AI Grid.</p>
            <div className="mt-2 text-xs bg-brand-primary/10 text-brand-primary py-1 px-3 rounded-full inline-block">
              Default: aakash / sanaai
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Username</label>
              <div className="relative">
                <User className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                <input 
                  type="text" 
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  placeholder="Teacher"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-slate-500 w-5 h-5" />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950/50 border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white focus:outline-none focus:border-brand-primary transition-colors"
                  placeholder="••••••••"
                />
              </div>
            </div>

            {error && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-red-400 text-sm bg-red-500/10 p-3 rounded-lg">
                <AlertCircle size={16} /> Invalid credentials. Try again.
              </motion.div>
            )}

            <Button type="submit" variant="primary" className="w-full mt-4 justify-center">
              Access Dashboard <ArrowRight size={18} />
            </Button>
          </form>
        </motion.div>
      </div>
    </main>
  );
}