"use client";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { TimetableWidget } from "@/features/schedule/TimetableWidget";

export default function SchedulePage() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-brand-dark pt-20">
        <Navbar />
         <div className="container mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8 pl-4 border-l-4 border-brand-accent">Live Schedule</h1>
            <TimetableWidget />
        </div>
      </main>
    </ProtectedRoute>
  );
}