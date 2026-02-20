"use client";
import React, { useState } from "react";
import GameEngine from "@/components/assessment/GameEngine";
import ProgressView from "@/components/assessment/ProgressView";
import { api } from "@/trpc/react";

export default function AssessmentPage() {
    const [isTakingTest, setIsTakingTest] = useState(false);
    const [pinEntered, setPinEntered] = useState(false);
    const [pin, setPin] = useState("");

    // Temporary child profile creation/selection for MVP
    // Ideally, this is passed down fully from the logged in parent/teacher portal
    const [childId, setChildId] = useState<string | null>(null);
    const createChildMut = api.assessment.createChild.useMutation();

    const handleStartTest = async () => {
        if (!childId) {
            // Auto-create a dummy child profile for Grade 5 if none exists for quick demo
            const newChild = await createChildMut.mutateAsync({ grade: 5 });
            setChildId(newChild.id);
        }
        setIsTakingTest(true);
    };

    const verifyPin = (e: React.FormEvent) => {
        e.preventDefault();
        if (pin === "1234") { // Hardcoded Teacher PIN for MVP
            setPinEntered(true);
            setPin("");
        } else {
            alert("Incorrect PIN");
        }
    };

    // 1. PIN Gateway
    if (!pinEntered) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-100 max-w-sm w-full text-center">
                    <h1 className="text-2xl font-bold text-gray-800 mb-2">Teacher Login</h1>
                    <p className="text-gray-500 mb-6 text-sm">Enter PIN to access assessment records</p>
                    <form onSubmit={verifyPin} className="space-y-4">
                        <input
                            type="password"
                            placeholder="Enter PIN (1234)"
                            value={pin}
                            onChange={e => setPin(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none text-center tracking-[0.5em] font-medium"
                        />
                        <button className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition">
                            Unlock
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // 2. Taking Test (Child View - No exiting without PIN logic ideally)
    if (isTakingTest && childId) {
        return (
            <div className="min-h-screen bg-white">
                {/* Minimal header without external navigation links */}
                <div className="h-16 border-b flex items-center px-6">
                    <h1 className="font-bold text-lg text-gray-800 tracking-tight">Sana Cognitive Assessment</h1>
                </div>

                <div className="max-w-4xl mx-auto py-12">
                    <GameEngine
                        childId={childId}
                        grade={5}
                        onSessionComplete={() => setIsTakingTest(false)}
                    />
                </div>
            </div>
        );
    }

    // 3. Main Dashboard (Teacher View)
    return (
        <div className="min-h-screen bg-gray-50 pb-20">
            {/* Header Area */}
            <div className="bg-white border-b border-gray-200 py-12 px-6 mb-8">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 mb-2">Cognitive Assessment Battery</h1>
                        <p className="text-gray-500 max-w-2xl">
                            A scientifically-backed 5-game battery designed to assess Sustained Attention, Impulse Control, Working Memory, Processing Consistency, and Cognitive Flexibility.<br />
                            <span className="inline-block mt-2 font-medium text-indigo-600 bg-indigo-50 px-3 py-1 rounded-md">
                                ⏱️ Estimated Duration: ~8 to 10 minutes
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={handleStartTest}
                        className="px-8 py-3.5 bg-indigo-600 text-white flex items-center gap-2 rounded-xl font-bold shadow-md hover:bg-indigo-700 hover:shadow-lg transition-all"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        Start Full Assessment
                    </button>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 space-y-12">

                {/* 5-Game Showcase Section */}
                <section>
                    <h2 className="text-xl font-bold text-gray-800 mb-6">The 5-Game Battery</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold mb-4">G1</div>
                            <h3 className="font-bold text-gray-900 mb-1">Focus Flow</h3>
                            <p className="text-xs text-gray-500">Sustained attention & lapse detection. <br />(120 trials, GO/NOGO)</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-green-300 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center font-bold mb-4">G2</div>
                            <h3 className="font-bold text-gray-900 mb-1">Stop & Go</h3>
                            <p className="text-xs text-gray-500">Impulse control & instability. <br />(100 rapid trials)</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-purple-300 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center font-bold mb-4">G3</div>
                            <h3 className="font-bold text-gray-900 mb-1">Memory Steps</h3>
                            <p className="text-xs text-gray-500">Working memory under load. <br />(Grade-capped sequences)</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-yellow-300 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-yellow-100 text-yellow-600 flex items-center justify-center font-bold mb-4">G4</div>
                            <h3 className="font-bold text-gray-900 mb-1">Steady Speed</h3>
                            <p className="text-xs text-gray-500">Processing consistency. <br />(Response-driven rhythm)</p>
                        </div>

                        <div className="bg-white p-5 rounded-2xl border border-gray-200 shadow-sm hover:border-rose-300 transition-colors">
                            <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center font-bold mb-4">G5</div>
                            <h3 className="font-bold text-gray-900 mb-1">Switch Smart</h3>
                            <p className="text-xs text-gray-500">Cognitive flexibility. <br />(Color/Shape rule switching)</p>
                        </div>
                    </div>
                </section>

                {/* Progress History */}
                <section>
                    <div className="bg-white rounded-3xl p-8 border border-gray-200 shadow-sm">
                        {childId ? (
                            <ProgressView childId={childId} />
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                                </div>
                                <h3 className="text-lg font-medium text-gray-900 mb-1">No Progress Data Yet</h3>
                                <p className="text-gray-500">Click &quot;Start Full Assessment&quot; above to run the 5-game battery.</p>
                            </div>
                        )}
                    </div>
                </section>

            </div>
        </div>
    );
}
