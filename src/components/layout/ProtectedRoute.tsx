"use client";
import React, { useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    // Optional: Add a nice spinner here
    return <div className="min-h-screen flex items-center justify-center bg-brand-dark text-white">Loading...</div>;
  }

  if (!isAuthenticated) return null;

  return <>{children}</>;
};