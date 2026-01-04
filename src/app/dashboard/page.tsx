"use client";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import Link from "next/link";
import { Book, Calendar, Brain, Shield } from "lucide-react";

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <main className="min-h-screen bg-brand-dark pt-24 px-6">
        <Navbar />
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-white mb-2">Welcome back, Teacher.</h1>
          <p className="text-slate-400 mb-12">Here is your Sana-AI learning grid.</p>

          <div className="grid md:grid-cols-3 gap-6">
            <DashboardCard
              title="AI Tutor"
              icon={<Brain />}
              desc="Ask Sana about any topic."
              href="/tutor"
              color="bg-pink-600"
            />
            <DashboardCard
              title="Resources"
              icon={<Book />}
              desc="Access 10,000+ books and papers."
              href="/resources"
              color="bg-blue-600"
            />
            <DashboardCard
              title="My Schedule"
              icon={<Calendar />}
              desc="View classes and upcoming exams."
              href="/schedule"
              color="bg-violet-600"
            />
            <DashboardCard
              title="My Subjects"
              icon={<Book />}
              desc="Upload and manage subject books."
              href="/subjects"
              color="bg-orange-600"
            />
            <DashboardCard
              title="Admin Panel"
              icon={<Shield />}
              desc="Monitor students and manage Sana-AI."
              href="/admin"
              color="bg-red-600"
            />
          </div>
        </div>
      </main>
    </ProtectedRoute>
  );
}

const DashboardCard = ({ title, icon, desc, href, color }: any) => (
  <Link href={href} className="group relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-8 hover:border-white/20 transition-all hover:scale-[1.02]">
    <div className={`w-12 h-12 ${color} rounded-xl flex items-center justify-center text-white mb-4 shadow-lg`}>
      {icon}
    </div>
    <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
    <p className="text-slate-400">{desc}</p>
    <div className={`absolute -right-4 -bottom-4 w-32 h-32 ${color} opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity`} />
  </Link>
);