"use client";
import React, { useState } from "react";
import { api } from "@/trpc/react";

interface ProgressViewProps {
    childId: string;
}

export default function ProgressView({ childId }: ProgressViewProps) {
    const { data: sessions, isLoading } = api.assessment.getChildHistory.useQuery({ childId });

    if (isLoading) return <div className="p-8 text-center text-gray-500 animate-pulse">Loading progress...</div>;

    if (!sessions || sessions.length === 0) {
        return (
            <div className="p-8 text-center bg-gray-50 rounded-xl border border-gray-200">
                <h3 className="text-xl font-medium text-gray-700">No History Available</h3>
                <p className="text-gray-500 mt-2 text-sm">Complete a cognitive assessment to see progress here.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h2 className="text-2xl font-bold border-b pb-4">Recent Assessments</h2>

            {/* Show last 3 sessions (peer comparison is disabled as per compliance) */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map((session: any) => (
                    <div key={session.id} className="border border-gray-200 rounded-xl p-5 shadow-sm bg-white">
                        <div className="flex justify-between items-center mb-4">
                            <span className="font-medium text-sm text-gray-500">
                                {new Date(session.startedAt).toLocaleDateString(undefined, {
                                    month: 'short', day: 'numeric', year: 'numeric'
                                })}
                            </span>
                            <span className={`px-2 py-1 rounded text-xs font-medium ${session.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    session.status === 'PARTIAL' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                                }`}>
                                {session.status}
                            </span>
                        </div>

                        {session.report ? (
                            <div className="space-y-4">
                                <div>
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400">Primary Focus</h4>
                                    <p className="text-lg font-medium text-gray-800">{session.report.planJson.primaryFocus}</p>
                                </div>

                                <div>
                                    <h4 className="text-sm font-semibold uppercase tracking-wider text-gray-400 mb-2">Recommended Strategies</h4>
                                    <ul className="list-disc pl-5 space-y-1 text-sm text-gray-600">
                                        {session.report.planJson.strategies.map((str: string, i: number) => (
                                            <li key={i}>{str}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="pt-4 border-t border-gray-100 text-center text-xs text-gray-400">
                                    Recommended Retest: in {session.report.planJson.retestDays} Days
                                </div>
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 italic text-center py-4">Report not generated (Incomplete session)</p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}
