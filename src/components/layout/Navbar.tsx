"use client";
import React, { useState } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X, Sparkles, LogOut, User } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/context/AuthContext';

export const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { scrollY } = useScroll();
  const { isAuthenticated, logout } = useAuth();

  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 50);
  });

  // Dynamic Links based on Auth
  const navLinks = isAuthenticated
    ? [
      { name: "Dashboard", href: "/dashboard" },
      { name: "AI Tutor", href: "/tutor" },
      { name: "Planner", href: "/planner" },
      { name: "Attendance", href: "/attendance" },
      { name: "Resources", href: "/resources" },
      { name: "Tests", href: "/dashboard/tests" },
    ]
    : [
      { name: "Home", href: "/" },
      { name: "About", href: "/maintenance" }, // Pointing to anchors on home
      { name: "Features", href: "/maintenance" },
    ];

  return (
    <motion.nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${isScrolled ? "bg-brand-dark/80 backdrop-blur-md border-b border-white/10 py-2" : "bg-transparent py-6"
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          {/* Branding */}
          <Link href={isAuthenticated ? "/dashboard" : "/"} className="flex items-center gap-2 cursor-pointer group">
            <div className="relative w-10 h-10 flex items-center justify-center">
              <div className="absolute inset-0 bg-brand-primary rounded-xl blur-lg opacity-50 group-hover:opacity-100 transition-opacity" />
              <div className="relative w-full h-full bg-gradient-to-tr from-brand-primary to-brand-accent rounded-xl flex items-center justify-center border border-white/20">
                <Sparkles className="text-white w-5 h-5" />
              </div>
            </div>
            <span className="text-2xl font-bold tracking-tight text-white">
              Sana-<span className="text-brand-primary">AI</span>
            </span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center space-x-8">
            {navLinks.map((link, i) => (
              <Link
                key={link.name}
                href={link.href}
                className="text-slate-300 hover:text-white text-sm font-medium transition-colors hover:scale-105"
              >
                {link.name}
              </Link>
            ))}

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 }}
            >
              {isAuthenticated ? (
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 text-white bg-white/5 px-3 py-1.5 rounded-full border border-white/10">
                    <User size={14} /> <span className="text-xs">Teacher</span>
                  </div>
                  <Button variant="outline" onClick={logout} className="text-sm px-4 h-10">
                    <LogOut size={16} className="mr-2" /> Logout
                  </Button>
                </div>
              ) : (
                <Link href="/login">
                  <Button variant="accent" className="text-sm px-6 shadow-brand-glow/50">Login</Button>
                </Link>
              )}
            </motion.div>
          </div>

          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="text-white p-2">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      <motion.div
        initial={false}
        animate={isOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden overflow-hidden bg-brand-dark border-b border-white/10"
      >
        <div className="px-4 py-6 space-y-4 flex flex-col">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setIsOpen(false)}
              className="block text-slate-300 hover:text-white text-lg font-medium"
            >
              {link.name}
            </Link>
          ))}
          {!isAuthenticated && (
            <Link href="/login" onClick={() => setIsOpen(false)}>
              <Button variant="accent" className="w-full justify-center">Login</Button>
            </Link>
          )}
          {isAuthenticated && (
            <Button variant="outline" onClick={() => { logout(); setIsOpen(false); }} className="w-full justify-center">Logout</Button>
          )}
        </div>
      </motion.div>
    </motion.nav>
  );
};