"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { api } from "@/trpc/react";
import {
    Calendar,
    BookOpen,
    Plus,
    Trash2,
    ChevronDown,
    ChevronRight,
    CheckCircle,
    XCircle,
    RefreshCw,
    Clock,
    Target,
    Sparkles,
    Play,
    Pause,
    CheckCircle2,
    MessageSquare,
    Send,
    Lightbulb,
    FileText,
} from "lucide-react";

type TabType = "plans" | "create" | "view";

export default function PlannerPage() {
    const [activeTab, setActiveTab] = useState<TabType>("plans");
    const [selectedPlanId, setSelectedPlanId] = useState<string>("");

    return (
        <ProtectedRoute>
            <main className="min-h-screen bg-brand-dark pt-24 px-6 pb-12">
                <Navbar />
                <div className="max-w-7xl mx-auto">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <h1 className="text-4xl font-bold text-white mb-2">
                                <span className="bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
                                    AI Teaching Planner
                                </span>
                            </h1>
                            <p className="text-slate-400">
                                Plan your teaching schedule with AI-powered suggestions based on your course content
                            </p>
                        </div>
                    </div>

                    {/* Navigation Tabs */}
                    <div className="flex gap-2 mb-8 border-b border-white/10 pb-4">
                        {[
                            { id: "plans", label: "My Plans", icon: Calendar },
                            { id: "create", label: "Create Plan", icon: Plus },
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => {
                                    setActiveTab(tab.id as TabType);
                                    if (tab.id !== "view") setSelectedPlanId("");
                                }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                    activeTab === tab.id
                                        ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <tab.icon className="w-4 h-4" />
                                {tab.label}
                            </button>
                        ))}
                        {selectedPlanId && (
                            <button
                                onClick={() => setActiveTab("view")}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                                    activeTab === "view"
                                        ? "bg-gradient-to-r from-pink-600 to-violet-600 text-white"
                                        : "text-slate-400 hover:text-white hover:bg-white/5"
                                }`}
                            >
                                <BookOpen className="w-4 h-4" />
                                View Plan
                            </button>
                        )}
                    </div>

                    {/* Tab Content */}
                    {activeTab === "plans" && (
                        <PlansListTab
                            onSelectPlan={(id) => {
                                setSelectedPlanId(id);
                                setActiveTab("view");
                            }}
                        />
                    )}
                    {activeTab === "create" && (
                        <CreatePlanTab
                            onPlanCreated={(id) => {
                                setSelectedPlanId(id);
                                setActiveTab("view");
                            }}
                        />
                    )}
                    {activeTab === "view" && selectedPlanId && (
                        <ViewPlanTab planId={selectedPlanId} />
                    )}
                </div>
            </main>
        </ProtectedRoute>
    );
}

// ============ PLANS LIST TAB ============
function PlansListTab({ onSelectPlan }: { onSelectPlan: (id: string) => void }) {
    const { data: plans, isLoading, refetch } = api.planner.getAllPlans.useQuery();
    const deletePlan = api.planner.deletePlan.useMutation({
        onSuccess: () => refetch(),
    });
    const updateStatus = api.planner.updatePlanStatus.useMutation({
        onSuccess: () => refetch(),
    });

    const getStatusColor = (status: string) => {
        switch (status) {
            case "DRAFT":
                return "bg-yellow-500/20 text-yellow-400";
            case "ACTIVE":
                return "bg-green-500/20 text-green-400";
            case "COMPLETED":
                return "bg-blue-500/20 text-blue-400";
            case "PAUSED":
                return "bg-slate-500/20 text-slate-400";
            default:
                return "bg-slate-500/20 text-slate-400";
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
        );
    }

    if (!plans || plans.length === 0) {
        return (
            <div className="text-center py-12">
                <Calendar className="w-16 h-16 mx-auto text-slate-600 mb-4" />
                <p className="text-slate-400 mb-4">No teaching plans yet</p>
                <p className="text-slate-500 text-sm">Create your first plan to get AI-powered teaching suggestions</p>
            </div>
        );
    }

    return (
        <div className="grid gap-4">
            {plans.map((plan) => (
                <div
                    key={plan.id}
                    className="bg-slate-900 rounded-2xl border border-white/10 p-6 hover:border-pink-500/30 transition-all"
                >
                    <div className="flex items-start justify-between">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <h3 className="text-xl font-bold text-white">{plan.name}</h3>
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(plan.status)}`}>
                                    {plan.status}
                                </span>
                            </div>
                            <p className="text-slate-400 text-sm mb-4">
                                <FileText className="w-4 h-4 inline mr-1" />
                                {plan.file.name}
                                {plan.class && (
                                    <span className="ml-3">
                                        • Class: {plan.class.name} {plan.class.section && `(${plan.class.section})`}
                                    </span>
                                )}
                            </p>
                            <div className="flex items-center gap-6 text-sm text-slate-400">
                                <span className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {new Date(plan.startDate).toLocaleDateString()} -{" "}
                                    {new Date(plan.endDate).toLocaleDateString()}
                                </span>
                                <span className="flex items-center gap-1">
                                    <Clock className="w-4 h-4" />
                                    {plan.totalDays} days
                                </span>
                                <span className="flex items-center gap-1">
                                    <BookOpen className="w-4 h-4" />
                                    {plan.chaptersTocover.length} chapters
                                </span>
                                <span className="flex items-center gap-1">
                                    <Target className="w-4 h-4" />
                                    {plan._count.dailyPlans} daily plans
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {plan.status === "DRAFT" && (
                                <button
                                    onClick={() => updateStatus.mutate({ planId: plan.id, status: "ACTIVE" })}
                                    className="p-2 hover:bg-green-500/20 rounded-lg text-slate-400 hover:text-green-400 transition-colors"
                                    title="Start Plan"
                                >
                                    <Play className="w-5 h-5" />
                                </button>
                            )}
                            {plan.status === "ACTIVE" && (
                                <button
                                    onClick={() => updateStatus.mutate({ planId: plan.id, status: "PAUSED" })}
                                    className="p-2 hover:bg-yellow-500/20 rounded-lg text-slate-400 hover:text-yellow-400 transition-colors"
                                    title="Pause Plan"
                                >
                                    <Pause className="w-5 h-5" />
                                </button>
                            )}
                            {plan.status === "PAUSED" && (
                                <button
                                    onClick={() => updateStatus.mutate({ planId: plan.id, status: "ACTIVE" })}
                                    className="p-2 hover:bg-green-500/20 rounded-lg text-slate-400 hover:text-green-400 transition-colors"
                                    title="Resume Plan"
                                >
                                    <Play className="w-5 h-5" />
                                </button>
                            )}
                            <button
                                onClick={() => onSelectPlan(plan.id)}
                                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90"
                            >
                                View Details
                            </button>
                            <button
                                onClick={() => {
                                    if (confirm("Delete this teaching plan?")) {
                                        deletePlan.mutate({ planId: plan.id });
                                    }
                                }}
                                className="p-2 hover:bg-red-500/20 rounded-lg text-slate-400 hover:text-red-400 transition-colors"
                                title="Delete Plan"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============ CREATE PLAN TAB ============
function CreatePlanTab({ onPlanCreated }: { onPlanCreated: (id: string) => void }) {
    const [formData, setFormData] = useState({
        name: "",
        fileId: "",
        classId: "",
        startDate: "",
        endDate: "",
        chaptersTocover: [] as number[],
        notes: "",
    });
    const [isGenerating, setIsGenerating] = useState(false);

    const { data: files } = api.planner.getFilesWithChapters.useQuery();
    const { data: classes } = api.teacher.getAllClasses.useQuery();

    const createPlan = api.planner.createPlan.useMutation();
    const generateAIPlan = api.planner.generateAIPlan.useMutation();

    const selectedFile = files?.find((f) => f.id === formData.fileId);

    const handleSubmit = async () => {
        if (!formData.name || !formData.fileId || !formData.startDate || !formData.endDate || formData.chaptersTocover.length === 0) {
            alert("Please fill all required fields");
            return;
        }

        setIsGenerating(true);
        try {
            // Create the plan
            const plan = await createPlan.mutateAsync({
                name: formData.name,
                fileId: formData.fileId,
                classId: formData.classId || undefined,
                startDate: formData.startDate,
                endDate: formData.endDate,
                chaptersTocover: formData.chaptersTocover,
                notes: formData.notes,
            });

            // Generate AI plan
            await generateAIPlan.mutateAsync({ planId: plan.id });

            onPlanCreated(plan.id);
        } catch (error: any) {
            alert(error.message || "Failed to create plan");
        } finally {
            setIsGenerating(false);
        }
    };

    const toggleChapter = (chapterNum: number) => {
        setFormData((prev) => ({
            ...prev,
            chaptersTocover: prev.chaptersTocover.includes(chapterNum)
                ? prev.chaptersTocover.filter((c) => c !== chapterNum)
                : [...prev.chaptersTocover, chapterNum].sort((a, b) => a - b),
        }));
    };

    return (
        <div className="max-w-3xl mx-auto">
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Sparkles className="w-6 h-6 text-pink-500" />
                    <h2 className="text-2xl font-bold text-white">Create AI-Powered Teaching Plan</h2>
                </div>

                <div className="space-y-6">
                    {/* Plan Name */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Plan Name *</label>
                        <input
                            type="text"
                            placeholder="e.g., Physics Chapter 1-3 for Class 10-A"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                        />
                    </div>

                    {/* File Selection */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Select Book/PDF *</label>
                        <div className="relative">
                            <select
                                value={formData.fileId}
                                onChange={(e) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        fileId: e.target.value,
                                        chaptersTocover: [],
                                    }))
                                }
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-pink-500"
                            >
                                <option value="">Select a file...</option>
                                {files?.map((file) => (
                                    <option key={file.id} value={file.id}>
                                        {file.name} ({file.chapters.length} chapters)
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Class Selection (Optional) */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Assign to Class (Optional)</label>
                        <div className="relative">
                            <select
                                value={formData.classId}
                                onChange={(e) => setFormData((prev) => ({ ...prev, classId: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white appearance-none cursor-pointer focus:outline-none focus:border-pink-500"
                            >
                                <option value="">No specific class</option>
                                {classes?.map((cls) => (
                                    <option key={cls.id} value={cls.id}>
                                        {cls.name} {cls.section && `(${cls.section})`}
                                    </option>
                                ))}
                            </select>
                            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {/* Date Range */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Start Date *</label>
                            <input
                                type="date"
                                value={formData.startDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">End Date *</label>
                            <input
                                type="date"
                                value={formData.endDate}
                                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white focus:outline-none focus:border-pink-500"
                            />
                        </div>
                    </div>

                    {/* Chapter Selection */}
                    {selectedFile && selectedFile.chapters.length > 0 && (
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">
                                Select Chapters to Cover * ({formData.chaptersTocover.length} selected)
                            </label>
                            <div className="bg-slate-800 rounded-xl border border-white/10 max-h-64 overflow-y-auto">
                                {selectedFile.chapters.map((chapter) => (
                                    <div
                                        key={chapter.id}
                                        onClick={() => toggleChapter(chapter.chapterNumber)}
                                        className={`flex items-center gap-3 p-4 cursor-pointer border-b border-white/5 last:border-0 hover:bg-white/5 transition-colors ${
                                            formData.chaptersTocover.includes(chapter.chapterNumber)
                                                ? "bg-pink-500/10"
                                                : ""
                                        }`}
                                    >
                                        <div
                                            className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                formData.chaptersTocover.includes(chapter.chapterNumber)
                                                    ? "border-pink-500 bg-pink-500"
                                                    : "border-slate-500"
                                            }`}
                                        >
                                            {formData.chaptersTocover.includes(chapter.chapterNumber) && (
                                                <CheckCircle className="w-3 h-3 text-white" />
                                            )}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-medium">
                                                Chapter {chapter.chapterNumber}: {chapter.title}
                                            </p>
                                            <p className="text-slate-400 text-sm">
                                                {chapter.topics.length} topics
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Notes */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Additional Notes (Optional)</label>
                        <textarea
                            placeholder="Any specific requirements or preferences..."
                            value={formData.notes}
                            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                            rows={3}
                            className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500 resize-none"
                        />
                    </div>

                    {/* Submit Button */}
                    <button
                        onClick={handleSubmit}
                        disabled={isGenerating || !formData.name || !formData.fileId || formData.chaptersTocover.length === 0}
                        className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isGenerating ? (
                            <>
                                <RefreshCw className="w-5 h-5 animate-spin" />
                                Generating AI Plan...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate AI Teaching Plan
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

// ============ VIEW PLAN TAB ============
function ViewPlanTab({ planId }: { planId: string }) {
    const [expandedDay, setExpandedDay] = useState<number | null>(null);
    const [aiQuestion, setAiQuestion] = useState("");
    const [aiSuggestion, setAiSuggestion] = useState<{ dayNumber: number; suggestion: string } | null>(null);

    const { data: plan, isLoading, refetch } = api.planner.getPlan.useQuery({ planId });
    const markDayCompleted = api.planner.markDayCompleted.useMutation({
        onSuccess: () => refetch(),
    });
    const getAISuggestions = api.planner.getAISuggestions.useMutation();
    const regeneratePlan = api.planner.generateAIPlan.useMutation({
        onSuccess: () => refetch(),
    });

    const handleAskAI = async (dayNumber: number) => {
        if (!aiQuestion.trim()) return;

        try {
            const result = await getAISuggestions.mutateAsync({
                planId,
                dayNumber,
                question: aiQuestion,
            });
            setAiSuggestion({ dayNumber, suggestion: result.suggestion });
            setAiQuestion("");
        } catch (error) {
            console.error("Failed to get AI suggestion:", error);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-pink-500 animate-spin" />
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="text-center py-12">
                <XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" />
                <p className="text-slate-400">Plan not found</p>
            </div>
        );
    }

    const completedDays = plan.dailyPlans.filter((d) => d.isCompleted).length;
    const progressPercentage = plan.dailyPlans.length > 0 ? Math.round((completedDays / plan.dailyPlans.length) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Plan Header */}
            <div className="bg-slate-900 rounded-2xl border border-white/10 p-6">
                <div className="flex items-start justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                        <p className="text-slate-400">
                            {plan.file.name}
                            {plan.class && ` • ${plan.class.name}`}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            if (confirm("Regenerate the AI plan? This will replace all daily plans.")) {
                                regeneratePlan.mutate({ planId });
                            }
                        }}
                        disabled={regeneratePlan.isPending}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700"
                    >
                        <RefreshCw className={`w-4 h-4 ${regeneratePlan.isPending ? "animate-spin" : ""}`} />
                        Regenerate Plan
                    </button>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                    <div className="flex items-center justify-between text-sm mb-2">
                        <span className="text-slate-400">Progress</span>
                        <span className="text-white font-medium">
                            {completedDays} / {plan.dailyPlans.length} days ({progressPercentage}%)
                        </span>
                    </div>
                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-pink-500 to-violet-500 rounded-full transition-all"
                            style={{ width: `${progressPercentage}%` }}
                        />
                    </div>
                </div>

                {/* Plan Info */}
                <div className="grid grid-cols-4 gap-4 mt-6">
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <Calendar className="w-5 h-5 mx-auto text-pink-500 mb-2" />
                        <p className="text-slate-400 text-xs">Duration</p>
                        <p className="text-white font-medium">{plan.totalDays} days</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <BookOpen className="w-5 h-5 mx-auto text-violet-500 mb-2" />
                        <p className="text-slate-400 text-xs">Chapters</p>
                        <p className="text-white font-medium">{plan.chaptersTocover.length}</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <Target className="w-5 h-5 mx-auto text-green-500 mb-2" />
                        <p className="text-slate-400 text-xs">Completed</p>
                        <p className="text-white font-medium">{completedDays} days</p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-4 text-center">
                        <Clock className="w-5 h-5 mx-auto text-blue-500 mb-2" />
                        <p className="text-slate-400 text-xs">Remaining</p>
                        <p className="text-white font-medium">{plan.dailyPlans.length - completedDays} days</p>
                    </div>
                </div>
            </div>

            {/* Daily Plans */}
            <div className="space-y-4">
                <h3 className="text-xl font-bold text-white">Daily Schedule</h3>
                {plan.dailyPlans.length === 0 ? (
                    <div className="text-center py-12 bg-slate-900 rounded-2xl border border-white/10">
                        <Sparkles className="w-12 h-12 mx-auto text-slate-600 mb-4" />
                        <p className="text-slate-400">No daily plans generated yet</p>
                        <button
                            onClick={() => regeneratePlan.mutate({ planId })}
                            disabled={regeneratePlan.isPending}
                            className="mt-4 px-6 py-3 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90"
                        >
                            Generate AI Plan
                        </button>
                    </div>
                ) : (
                    plan.dailyPlans.map((day) => (
                        <div
                            key={day.id}
                            className={`bg-slate-900 rounded-2xl border transition-all ${
                                day.isCompleted ? "border-green-500/30" : "border-white/10"
                            }`}
                        >
                            {/* Day Header */}
                            <div
                                onClick={() => setExpandedDay(expandedDay === day.dayNumber ? null : day.dayNumber)}
                                className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5"
                            >
                                <div className="flex items-center gap-4">
                                    <div
                                        className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                            day.isCompleted
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-slate-800 text-slate-400"
                                        }`}
                                    >
                                        {day.isCompleted ? (
                                            <CheckCircle2 className="w-5 h-5" />
                                        ) : (
                                            <span className="font-bold">{day.dayNumber}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-white font-medium">
                                            Day {day.dayNumber} - Chapter {day.chapterNumber}
                                        </p>
                                        <p className="text-slate-400 text-sm">
                                            {day.date && new Date(day.date).toLocaleDateString("en-US", { 
                                                weekday: "long", 
                                                month: "short", 
                                                day: "numeric" 
                                            })}
                                            {" • "}
                                            {day.estimatedTime} mins
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            markDayCompleted.mutate({
                                                dailyPlanId: day.id,
                                                isCompleted: !day.isCompleted,
                                            });
                                        }}
                                        className={`px-3 py-1 rounded-lg text-sm ${
                                            day.isCompleted
                                                ? "bg-green-500/20 text-green-400"
                                                : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                                        }`}
                                    >
                                        {day.isCompleted ? "Completed" : "Mark Complete"}
                                    </button>
                                    {expandedDay === day.dayNumber ? (
                                        <ChevronDown className="w-5 h-5 text-slate-400" />
                                    ) : (
                                        <ChevronRight className="w-5 h-5 text-slate-400" />
                                    )}
                                </div>
                            </div>

                            {/* Expanded Content */}
                            {expandedDay === day.dayNumber && (
                                <div className="border-t border-white/5 p-6 space-y-6">
                                    {/* Topics */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                            <BookOpen className="w-4 h-4" />
                                            Topics to Cover
                                        </h4>
                                        <div className="flex flex-wrap gap-2">
                                            {day.topicsTocover.map((topic, i) => (
                                                <span
                                                    key={i}
                                                    className="px-3 py-1 bg-pink-500/20 text-pink-400 rounded-full text-sm"
                                                >
                                                    {topic}
                                                </span>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Objectives */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                            <Target className="w-4 h-4" />
                                            Learning Objectives
                                        </h4>
                                        <ul className="space-y-2">
                                            {day.objectives.map((obj, i) => (
                                                <li key={i} className="flex items-start gap-2 text-slate-300">
                                                    <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                    {obj}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Activities */}
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                            <Lightbulb className="w-4 h-4" />
                                            Suggested Activities
                                        </h4>
                                        <ul className="space-y-2">
                                            {day.activities.map((activity, i) => (
                                                <li key={i} className="flex items-start gap-2 text-slate-300">
                                                    <span className="text-violet-400">{i + 1}.</span>
                                                    {activity}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    {/* Teaching Tips */}
                                    {day.teacherNotes && (
                                        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
                                            <h4 className="text-sm font-medium text-violet-400 mb-2 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Teaching Tips
                                            </h4>
                                            <p className="text-slate-300 text-sm">{day.teacherNotes}</p>
                                        </div>
                                    )}

                                    {/* AI Suggestion Display */}
                                    {aiSuggestion && aiSuggestion.dayNumber === day.dayNumber && (
                                        <div className="bg-pink-500/10 border border-pink-500/20 rounded-xl p-4">
                                            <h4 className="text-sm font-medium text-pink-400 mb-2 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                AI Suggestion
                                            </h4>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                                {aiSuggestion.suggestion}
                                            </p>
                                        </div>
                                    )}

                                    {/* Ask AI */}
                                    <div className="bg-slate-800/50 rounded-xl p-4">
                                        <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                            <MessageSquare className="w-4 h-4" />
                                            Ask AI for Help
                                        </h4>
                                        <div className="flex gap-2">
                                            <input
                                                type="text"
                                                placeholder="e.g., How should I explain this concept? What examples can I use?"
                                                value={aiQuestion}
                                                onChange={(e) => setAiQuestion(e.target.value)}
                                                onKeyDown={(e) => e.key === "Enter" && handleAskAI(day.dayNumber)}
                                                className="flex-1 px-4 py-2 bg-slate-900 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                                            />
                                            <button
                                                onClick={() => handleAskAI(day.dayNumber)}
                                                disabled={!aiQuestion.trim() || getAISuggestions.isPending}
                                                className="px-4 py-2 bg-gradient-to-r from-pink-600 to-violet-600 text-white rounded-xl hover:opacity-90 disabled:opacity-50"
                                            >
                                                {getAISuggestions.isPending ? (
                                                    <RefreshCw className="w-5 h-5 animate-spin" />
                                                ) : (
                                                    <Send className="w-5 h-5" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
