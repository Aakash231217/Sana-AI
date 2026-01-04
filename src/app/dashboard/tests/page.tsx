"use client";

import { api } from "@/trpc/react";
import Link from "next/link";
import { ArrowRight, Brain, Clock } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function TestsPage() {
    const { data: tests, isLoading } = api.tests.getAll.useQuery();

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="flex flex-col gap-2 mb-8">
                <h1 className="text-3xl font-bold text-white">Available Tests</h1>
                <p className="text-slate-400">Select a test to begin. Your results will be saved automatically.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {tests?.map((test) => (
                    <div
                        key={test.id}
                        className="group relative overflow-hidden rounded-3xl bg-slate-900 border border-white/10 p-8 hover:border-white/20 transition-all hover:scale-[1.02]"
                    >
                        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white mb-4 shadow-lg">
                            <Brain className="w-6 h-6" />
                        </div>

                        <h3 className="text-2xl font-bold text-white mb-2">{test.title}</h3>
                        <p className="text-slate-400 mb-6">{test.description}</p>

                        <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                            <div className="flex items-center gap-1">
                                <Clock size={16} />
                                <span>~15-20 mins</span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span>100 Questions</span>
                            </div>
                        </div>

                        <Link href={`/dashboard/tests/${test.id}`}>
                            <Button variant="accent" className="w-full justify-between group-hover:bg-brand-primary/90">
                                Start Test
                                <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                            </Button>
                        </Link>

                        <div className="absolute -right-4 -bottom-4 w-32 h-32 bg-indigo-600 opacity-10 rounded-full blur-2xl group-hover:opacity-20 transition-opacity" />
                    </div>
                ))}

                {(!tests || tests.length === 0) && (
                    <div className="col-span-2 text-center py-12 text-slate-500 bg-slate-900/50 rounded-3xl border border-white/5">
                        <p>No tests available at the moment.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
