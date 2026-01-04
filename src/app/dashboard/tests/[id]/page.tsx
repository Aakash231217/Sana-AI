"use client";

import { useEffect, useState } from "react";
import { api } from "@/trpc/react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, ArrowRight, CheckCircle, Brain } from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function TestRunnerPage() {
    const params = useParams();
    const testId = params.id as string;
    const router = useRouter();

    const { data: test, isLoading } = api.tests.getById.useQuery({ id: testId }, { enabled: !!testId });
    const submitMutation = api.tests.submit.useMutation();

    const [answers, setAnswers] = useState<Record<string, number>>({});
    const [currentPage, setCurrentPage] = useState(0);
    const questionsPerPage = 10;

    const [showResult, setShowResult] = useState(false);
    const [scores, setScores] = useState<Record<string, number>>({});

    const totalQuestions = test?.questions.length || 0;
    const totalPages = Math.ceil(totalQuestions / questionsPerPage);

    const currentQuestions = test?.questions.slice(
        currentPage * questionsPerPage,
        (currentPage + 1) * questionsPerPage
    );

    const handleAnswer = (questionId: string, value: number) => {
        setAnswers((prev) => ({ ...prev, [questionId]: value }));
    };

    const calculateScores = () => {
        const newScores: Record<string, number> = {};
        test?.questions.forEach(q => {
            const val = answers[q.id] || 0;
            if (!newScores[q.section]) newScores[q.section] = 0;
            newScores[q.section] += val;
        });
        return newScores;
    };

    const handleNext = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage((prev) => prev + 1);
            window.scrollTo(0, 0);
        } else {
            handleSubmit();
        }
    };

    const handlePrevious = () => {
        if (currentPage > 0) {
            setCurrentPage((prev) => prev - 1);
            window.scrollTo(0, 0);
        }
    };

    const handleSubmit = async () => {
        const calculatedScores = calculateScores();
        setScores(calculatedScores);

        // Submit to backend
        try {
            await submitMutation.mutateAsync({
                testId,
                answers,
                scores: calculatedScores,
                // studentId will be handled by ctx.session if we had auth there, or passed if needed
            });
            setShowResult(true);
        } catch (error) {
            console.error("Failed to submit", error);
            alert("Failed to submit test. Please try again.");
        }
    };

    if (isLoading || !test) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
            </div>
        );
    }

    if (showResult) {
        return <TestResultView scores={scores} onBack={() => router.push('/dashboard/tests')} />;
    }

    const progress = (Object.keys(answers).length / totalQuestions) * 100;

    return (
        <div className="max-w-4xl mx-auto py-8 px-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <Link href="/dashboard/tests" className="text-slate-400 hover:text-white flex items-center gap-2 mb-2 text-sm">
                        <ArrowLeft size={16} /> Back to Tests
                    </Link>
                    <h1 className="text-2xl font-bold text-white">{test.title}</h1>
                </div>
                <div className="text-right">
                    <span className="text-sm text-slate-400">Progress</span>
                    <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-brand-primary transition-all duration-500" style={{ width: `${progress}%` }} />
                        </div>
                        <span className="text-brand-primary font-bold">{Math.round(progress)}%</span>
                    </div>
                </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                >
                    {currentQuestions?.map((q, idx) => (
                        <div key={q.id} className="bg-slate-900 border border-white/10 rounded-2xl p-6">
                            <div className="flex gap-4">
                                <span className="flex-shrink-0 w-8 h-8 bg-slate-800 rounded-full flex items-center justify-center text-slate-300 font-bold text-sm">
                                    {(currentPage * questionsPerPage) + idx + 1}
                                </span>
                                <div className="flex-1">
                                    <p className="text-lg text-white mb-4 font-medium">{q.text}</p>

                                    <div className="grid grid-cols-5 gap-2 sm:gap-4">
                                        {[1, 2, 3, 4, 5].map((val) => (
                                            <button
                                                key={val}
                                                onClick={() => handleAnswer(q.id, val)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${answers[q.id] === val
                                                    ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25 scale-105"
                                                    : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                                                    }`}
                                            >
                                                <span className="text-xl font-bold">{val}</span>
                                                <span className="text-[10px] uppercase tracking-wider hidden sm:block">
                                                    {val === 1 ? "No, Never" :
                                                        val === 2 ? "Not Really" :
                                                            val === 3 ? "Sometimes" :
                                                                val === 4 ? "Yes, Mostly" : "Yes, Always"}
                                                </span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-8 flex items-center justify-between">
                <Button
                    variant="outline"
                    onClick={handlePrevious}
                    disabled={currentPage === 0}
                    className="text-slate-400 hover:text-white"
                >
                    <ArrowLeft className="mr-2" /> Previous
                </Button>

                <span className="text-slate-500 text-sm">
                    Page {currentPage + 1} of {totalPages}
                </span>

                <Button
                    variant="accent"
                    onClick={handleNext}
                    disabled={currentQuestions?.some(q => !answers[q.id])} // Disable if current page not fully answered? Optional.
                    className="w-32"
                >
                    {currentPage === totalPages - 1 ? "Submit" : "Next"}
                    {currentPage < totalPages - 1 && <ArrowRight className="ml-2" />}
                </Button>
            </div>

        </div>
    );
}

// Simple Inline Result View (Can be moved to separate component later)
function TestResultView({ scores, onBack }: { scores: Record<string, number>, onBack: () => void }) {

    // Normalize scores (assuming 20 questions per section, max score 100, min 20)
    // Actually per section we have 20 questions, score 1-5. So min 20, max 100.
    // If not 20 questions, we should adjust. But we seeded 20 per section.

    const traits = [
        { key: "Extraversion", label: "Extraversion (Social)", desc: "How much you enjoy being with others." },
        { key: "Agreeableness", label: "Agreeableness (Kindness)", desc: "How well you get along with others." },
        { key: "Conscientiousness", label: "Conscientiousness (Focus)", desc: "How organized and responsible you are." },
        { key: "EmotionalStability", label: "Emotional Strength", desc: "How calm and confident you feel." },
        { key: "Openness", label: "Openness (Creativity)", desc: "How much you like trying new things." },
    ];

    return (
        <div className="max-w-4xl mx-auto py-12 px-4 text-center">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-8 md:p-12 mb-8">
                <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center text-white mx-auto mb-6 shadow-xl shadow-green-500/20">
                    <CheckCircle size={40} />
                </div>
                <h2 className="text-3xl font-bold text-white mb-2">Test Completed!</h2>
                <p className="text-slate-400 mb-8">Here is your personality profile.</p>

                <div className="grid gap-6 text-left">
                    {traits.map(trait => {
                        const score = scores[trait.key] || 0;
                        const percentage = ((score - 20) / (100 - 20)) * 100; // Normalize 20-100 to 0-100
                        const normalized = Math.max(0, Math.min(100, percentage)); // Clamp

                        return (
                            <div key={trait.key} className="bg-slate-800/50 rounded-xl p-6">
                                <div className="flex justify-between items-end mb-2">
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{trait.label}</h4>
                                        <p className="text-slate-400 text-sm">{trait.desc}</p>
                                    </div>
                                    <span className="text-2xl font-bold text-brand-primary">{score}</span>
                                </div>
                                <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                                        style={{ width: `${normalized}%` }}
                                    />
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            <Button onClick={() => window.print()} variant="outline" className="mr-4">
                Download Report
            </Button>
            <Button onClick={onBack} variant="accent">
                Back to Dashboard
            </Button>
        </div>
    );
}
