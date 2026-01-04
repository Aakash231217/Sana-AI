"use client";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { LibrarySection } from "@/features/library/LibrarySection";

export default function ResourcesPage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-brand-dark pt-20">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8 pl-4 border-l-4 border-brand-primary">My Resources</h1>
            <LibrarySection />
        </div>
      </main>
    </ProtectedRoute>
  );
}