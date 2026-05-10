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
    GraduationCap,
    BookMarked,
    HelpCircle,
    ListChecks,
    Globe2,
    Award,
    Wand2,
    Printer,
} from "lucide-react";

type TabType = "plans" | "create" | "view";

// ============ PRINT / PDF HELPERS ============
// Use the browser's native print dialog (which gives "Save as PDF") to avoid
// shipping a heavy PDF library. We render a clean, print-only HTML document
// in a hidden iframe and trigger window.print().
type PrintLessonInput = {
    planName: string;
    grade?: string | null;
    subject?: string | null;
    board?: string | null;
    teachingStyle: string;
    day: any;
};

function escHtml(s: unknown): string {
    if (s === null || s === undefined) return "";
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function ulHtml(items: string[] | undefined, ordered = false): string {
    if (!items || items.length === 0) return "";
    const tag = ordered ? "ol" : "ul";
    return `<${tag}>${items.map((i) => `<li>${escHtml(i)}</li>`).join("")}</${tag}>`;
}

function lessonSectionHtml(planMeta: Omit<PrintLessonInput, "day">, day: any): string {
    const examples = Array.isArray(day.workedExamples) ? day.workedExamples : [];
    const examplesHtml = examples.length
        ? `<div class="block">
            <h3>Worked Examples</h3>
            ${examples
                .map(
                    (ex: any, i: number) => `
                <div class="example">
                    <div class="example-title">Example ${i + 1}</div>
                    ${ex.problem ? `<div><strong>Q:</strong> ${escHtml(ex.problem)}</div>` : ""}
                    ${ex.solution ? `<div><strong>A:</strong> ${escHtml(ex.solution)}</div>` : ""}
                    ${ex.reasoning ? `<div class="reasoning"><em>Reasoning:</em> ${escHtml(ex.reasoning)}</div>` : ""}
                </div>`
                )
                .join("")}
            </div>`
        : "";

    const styleLabel =
        planMeta.teachingStyle === "SIMPLE"
            ? "Simple Style"
            : planMeta.teachingStyle === "DEEP"
                ? "Deep Concept Style"
                : "Balanced Style";

    return `
    <section class="lesson">
        <header class="lesson-head">
            <div class="title-row">
                <div>
                    <div class="plan-name">${escHtml(planMeta.planName)}</div>
                    <h1>Day ${escHtml(day.dayNumber)} &middot; Lesson Plan</h1>
                </div>
                <div class="meta">
                    ${planMeta.grade ? `<span>${escHtml(planMeta.grade)}</span>` : ""}
                    ${planMeta.subject ? `<span>${escHtml(planMeta.subject)}</span>` : ""}
                    ${planMeta.board ? `<span>${escHtml(planMeta.board)}</span>` : ""}
                    <span class="style">${escHtml(styleLabel)}</span>
                </div>
            </div>
            <div class="topics">
                ${(day.topicsTocover || [])
                    .map((t: string) => `<span class="chip">${escHtml(t)}</span>`)
                    .join("")}
            </div>
        </header>

        ${day.prerequisites && day.prerequisites.length
            ? `<div class="block"><h3>Prerequisite Knowledge</h3>${ulHtml(day.prerequisites)}</div>`
            : ""}

        ${day.objectives && day.objectives.length
            ? `<div class="block"><h3>Learning Objectives</h3>${ulHtml(day.objectives)}</div>`
            : ""}

        ${day.explanation
            ? `<div class="block"><h3>Explanation</h3><p>${escHtml(day.explanation).replace(/\n/g, "<br/>")}</p></div>`
            : ""}

        ${day.conceptInsight
            ? `<div class="block insight"><h3>Concept Insight (Why it works)</h3><p>${escHtml(day.conceptInsight)}</p></div>`
            : ""}

        ${examplesHtml}

        ${day.activities && day.activities.length
            ? `<div class="block"><h3>Suggested Activities</h3>${ulHtml(day.activities, true)}</div>`
            : ""}

        ${day.practiceQuestions && day.practiceQuestions.length
            ? `<div class="block"><h3>Practice Questions</h3>${ulHtml(day.practiceQuestions, true)}</div>`
            : ""}

        ${day.quickTest && day.quickTest.length
            ? `<div class="block test"><h3>Quick Test</h3>${ulHtml(day.quickTest, true)}</div>`
            : ""}

        ${day.realLifeApplication && day.realLifeApplication.length
            ? `<div class="block"><h3>Real-Life Application</h3>${ulHtml(day.realLifeApplication)}</div>`
            : ""}

        ${day.finalOutcome
            ? `<div class="block outcome"><h3>Final Outcome</h3><p>${escHtml(day.finalOutcome)}</p></div>`
            : ""}

        ${day.teacherNotes
            ? `<div class="block tip"><h3>Teaching Tip</h3><p>${escHtml(day.teacherNotes)}</p></div>`
            : ""}
    </section>`;
}

function printLessonPlan(input: PrintLessonInput) {
    printDocument(
        `Lesson Plan – Day ${input.day.dayNumber}`,
        lessonSectionHtml(
            {
                planName: input.planName,
                grade: input.grade,
                subject: input.subject,
                board: input.board,
                teachingStyle: input.teachingStyle,
            },
            input.day
        )
    );
}

function printWholePlan(input: { plan: any }) {
    const plan = input.plan;
    const sections = (plan.dailyPlans || [])
        .map((d: any) =>
            lessonSectionHtml(
                {
                    planName: plan.name,
                    grade: plan.gradeLevel,
                    subject: plan.subject,
                    board: plan.board,
                    teachingStyle: plan.teachingStyle,
                },
                d
            )
        )
        .join("\n");
    printDocument(`Lesson Plan Pack – ${plan.name}`, sections);
}

function printDocument(title: string, bodyHtml: string) {
    if (typeof window === "undefined") return;
    const html = `<!doctype html>
<html><head><meta charset="utf-8"/><title>${escHtml(title)}</title>
<style>
    @page { size: A4; margin: 18mm 16mm; }
    * { box-sizing: border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color: #111; margin: 0; line-height: 1.45; font-size: 12pt; }
    h1 { font-size: 18pt; margin: 0 0 4px 0; color: #5b21b6; }
    h3 { font-size: 12pt; margin: 14px 0 6px 0; color: #1e293b; border-bottom: 1px solid #e2e8f0; padding-bottom: 3px; }
    .lesson { padding-bottom: 8px; }
    .lesson + .lesson { page-break-before: always; }
    .lesson-head { border-bottom: 2px solid #db2777; padding-bottom: 8px; margin-bottom: 10px; }
    .plan-name { color: #64748b; font-size: 10pt; text-transform: uppercase; letter-spacing: 0.05em; }
    .title-row { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
    .meta { display: flex; gap: 6px; flex-wrap: wrap; }
    .meta span { background: #f1f5f9; color: #334155; padding: 2px 8px; border-radius: 999px; font-size: 9pt; }
    .meta span.style { background: #ede9fe; color: #5b21b6; }
    .topics { margin-top: 8px; display: flex; gap: 6px; flex-wrap: wrap; }
    .chip { background: #fce7f3; color: #be185d; padding: 2px 10px; border-radius: 999px; font-size: 10pt; }
    .block { margin: 10px 0; page-break-inside: avoid; }
    .block ul, .block ol { margin: 6px 0 6px 20px; padding: 0; }
    .block li { margin: 3px 0; }
    .insight { background: #fdf2f8; border-left: 4px solid #db2777; padding: 8px 12px; }
    .test { background: #ecfdf5; border-left: 4px solid #10b981; padding: 8px 12px; }
    .outcome { background: #f0fdf4; border-left: 4px solid #22c55e; padding: 8px 12px; }
    .tip { background: #f5f3ff; border-left: 4px solid #7c3aed; padding: 8px 12px; }
    .example { border: 1px solid #e2e8f0; border-radius: 8px; padding: 8px 10px; margin: 6px 0; }
    .example-title { color: #7c3aed; font-weight: 600; font-size: 10pt; margin-bottom: 4px; }
    .example .reasoning { color: #475569; font-size: 10pt; margin-top: 4px; }
    p { margin: 4px 0; }
</style>
</head><body>${bodyHtml}</body></html>`;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
    const cleanup = () => {
        setTimeout(() => {
            if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1000);
    };
    iframe.onload = () => {
        try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
        } finally {
            cleanup();
        }
    };
}

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
type TeachingStyle = "SIMPLE" | "DEEP" | "BALANCED";

const STYLE_OPTIONS: {
    id: TeachingStyle;
    title: string;
    tagline: string;
    description: string;
}[] = [
    {
        id: "SIMPLE",
        title: "Simple School Style",
        tagline: "Fast learning",
        description:
            "Short, clear, step-by-step. Great when the child needs quick understanding and procedural fluency.",
    },
    {
        id: "DEEP",
        title: "Deep Concept Style",
        tagline: "True understanding",
        description:
            "Builds the WHY using analogies and reasoning. Best for strong foundations and conceptual depth.",
    },
    {
        id: "BALANCED",
        title: "Balanced Style",
        tagline: "Recommended",
        description:
            "Clarity + concept + real-life. The everyday classroom mix — clarity of school plus the depth of insight.",
    },
];

function CreatePlanTab({ onPlanCreated }: { onPlanCreated: (id: string) => void }) {
    const [formData, setFormData] = useState({
        name: "",
        fileId: "",
        classId: "",
        startDate: "",
        endDate: "",
        chaptersTocover: [] as number[],
        notes: "",
        teachingStyle: "BALANCED" as TeachingStyle,
        gradeLevel: "",
        subject: "",
        board: "",
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
                teachingStyle: formData.teachingStyle,
                gradeLevel: formData.gradeLevel || undefined,
                subject: formData.subject || undefined,
                board: formData.board || undefined,
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

                    {/* Teaching Style Picker */}
                    <div>
                        <label className="block text-sm text-slate-400 mb-2">Teaching Style *</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {STYLE_OPTIONS.map((opt) => {
                                const active = formData.teachingStyle === opt.id;
                                return (
                                    <button
                                        type="button"
                                        key={opt.id}
                                        onClick={() =>
                                            setFormData((prev) => ({ ...prev, teachingStyle: opt.id }))
                                        }
                                        className={`text-left p-4 rounded-xl border transition-all ${
                                            active
                                                ? "border-pink-500 bg-pink-500/10"
                                                : "border-white/10 bg-slate-800 hover:bg-slate-700"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-white font-semibold">{opt.title}</span>
                                            {opt.id === "BALANCED" && (
                                                <span className="text-[10px] uppercase tracking-wide bg-violet-500/20 text-violet-300 px-2 py-0.5 rounded-full">
                                                    Recommended
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-pink-400 text-xs mb-2">{opt.tagline}</p>
                                        <p className="text-slate-400 text-xs leading-relaxed">
                                            {opt.description}
                                        </p>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Grade / Subject / Board */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Grade / Class</label>
                            <input
                                type="text"
                                placeholder="e.g., Class 4"
                                value={formData.gradeLevel}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, gradeLevel: e.target.value }))
                                }
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Subject</label>
                            <input
                                type="text"
                                placeholder="e.g., Mathematics"
                                value={formData.subject}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, subject: e.target.value }))
                                }
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-slate-400 mb-2">Board / Curriculum</label>
                            <input
                                type="text"
                                placeholder="e.g., ICSE / CBSE"
                                value={formData.board}
                                onChange={(e) =>
                                    setFormData((prev) => ({ ...prev, board: e.target.value }))
                                }
                                className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-pink-500"
                            />
                        </div>
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
    const regenerateDailyPlan = api.planner.regenerateDailyPlan.useMutation({
        onSuccess: () => refetch(),
    });
    const updatePlanMetadata = api.planner.updatePlanMetadata.useMutation({
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
                <div className="flex items-start justify-between mb-4 gap-4 flex-wrap">
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">{plan.name}</h2>
                        <p className="text-slate-400">
                            {plan.file.name}
                            {plan.class && ` • ${plan.class.name}`}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-3">
                            {plan.gradeLevel && (
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full flex items-center gap-1">
                                    <GraduationCap className="w-3 h-3" /> {plan.gradeLevel}
                                </span>
                            )}
                            {plan.subject && (
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full flex items-center gap-1">
                                    <BookMarked className="w-3 h-3" /> {plan.subject}
                                </span>
                            )}
                            {plan.board && (
                                <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded-full">
                                    {plan.board}
                                </span>
                            )}
                            <span className="text-xs bg-violet-500/20 text-violet-300 px-2 py-1 rounded-full flex items-center gap-1">
                                <Wand2 className="w-3 h-3" />
                                {plan.teachingStyle === "SIMPLE" && "Simple Style"}
                                {plan.teachingStyle === "DEEP" && "Deep Concept Style"}
                                {plan.teachingStyle === "BALANCED" && "Balanced Style"}
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <select
                            value={plan.teachingStyle}
                            onChange={(e) => {
                                const newStyle = e.target.value as "SIMPLE" | "DEEP" | "BALANCED";
                                updatePlanMetadata.mutate({ planId, teachingStyle: newStyle });
                            }}
                            disabled={updatePlanMetadata.isPending}
                            className="px-3 py-2 bg-slate-800 border border-white/10 rounded-xl text-white text-sm focus:outline-none focus:border-pink-500"
                        >
                            <option value="SIMPLE">Simple Style</option>
                            <option value="DEEP">Deep Concept Style</option>
                            <option value="BALANCED">Balanced Style</option>
                        </select>
                        <button
                            onClick={() => printWholePlan({ plan })}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700"
                            title="Print or save the whole plan as PDF"
                        >
                            <Printer className="w-4 h-4" />
                            Print / PDF
                        </button>
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
                                    {/* Per-day style + print controls */}
                                    <div className="flex flex-wrap items-center gap-2 justify-between">
                                        <div className="flex items-center gap-2 text-xs text-slate-400">
                                            <Wand2 className="w-3 h-3 text-violet-400" />
                                            Regenerate this lesson in a different style:
                                        </div>
                                        <div className="flex flex-wrap gap-2 items-center">
                                            {(["SIMPLE", "DEEP", "BALANCED"] as const).map((s) => (
                                                <button
                                                    key={s}
                                                    onClick={() =>
                                                        regenerateDailyPlan.mutate({
                                                            dailyPlanId: day.id,
                                                            styleOverride: s,
                                                        })
                                                    }
                                                    disabled={regenerateDailyPlan.isPending}
                                                    className="text-xs px-3 py-1 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-50"
                                                >
                                                    {regenerateDailyPlan.isPending &&
                                                    regenerateDailyPlan.variables?.dailyPlanId === day.id &&
                                                    regenerateDailyPlan.variables?.styleOverride === s
                                                        ? "Generating..."
                                                        : s === "SIMPLE"
                                                            ? "Simple"
                                                            : s === "DEEP"
                                                                ? "Deep"
                                                                : "Balanced"}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() =>
                                                    printLessonPlan({
                                                        planName: plan.name,
                                                        grade: plan.gradeLevel,
                                                        subject: plan.subject,
                                                        board: plan.board,
                                                        teachingStyle: plan.teachingStyle,
                                                        day,
                                                    })
                                                }
                                                className="text-xs px-3 py-1 rounded-full bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 flex items-center gap-1"
                                                title="Print or save this lesson as PDF"
                                            >
                                                <Printer className="w-3 h-3" />
                                                Print / PDF
                                            </button>
                                        </div>
                                    </div>

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

                                    {/* Prerequisites */}
                                    {day.prerequisites && day.prerequisites.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                                <ListChecks className="w-4 h-4" />
                                                Prerequisite Knowledge
                                            </h4>
                                            <ul className="space-y-2">
                                                {day.prerequisites.map((p, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                                                        <span className="text-pink-400">•</span>
                                                        {p}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

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

                                    {/* Explanation */}
                                    {day.explanation && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                                <FileText className="w-4 h-4" />
                                                Explanation
                                            </h4>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                {day.explanation}
                                            </p>
                                        </div>
                                    )}

                                    {/* Concept Insight */}
                                    {day.conceptInsight && (
                                        <div className="bg-pink-500/5 border border-pink-500/20 rounded-xl p-4">
                                            <h4 className="text-sm font-medium text-pink-400 mb-2 flex items-center gap-2">
                                                <Lightbulb className="w-4 h-4" />
                                                Concept Insight (Why it works)
                                            </h4>
                                            <p className="text-slate-300 text-sm whitespace-pre-wrap">
                                                {day.conceptInsight}
                                            </p>
                                        </div>
                                    )}

                                    {/* Worked Examples */}
                                    {Array.isArray(day.workedExamples) && day.workedExamples.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                                <Sparkles className="w-4 h-4" />
                                                Worked Examples
                                            </h4>
                                            <div className="space-y-3">
                                                {(day.workedExamples as Array<{
                                                    problem?: string;
                                                    solution?: string;
                                                    reasoning?: string;
                                                }>).map((ex, i) => (
                                                    <div
                                                        key={i}
                                                        className="bg-slate-800/60 rounded-xl p-4 border border-white/5"
                                                    >
                                                        <p className="text-violet-300 text-xs font-semibold mb-1">
                                                            Example {i + 1}
                                                        </p>
                                                        {ex.problem && (
                                                            <p className="text-white text-sm mb-2">
                                                                <span className="text-slate-400">Q: </span>
                                                                {ex.problem}
                                                            </p>
                                                        )}
                                                        {ex.solution && (
                                                            <p className="text-slate-300 text-sm mb-2">
                                                                <span className="text-green-400">A: </span>
                                                                {ex.solution}
                                                            </p>
                                                        )}
                                                        {ex.reasoning && (
                                                            <p className="text-slate-400 text-xs italic">
                                                                Reasoning: {ex.reasoning}
                                                            </p>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

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

                                    {/* Practice Questions */}
                                    {day.practiceQuestions && day.practiceQuestions.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                                <HelpCircle className="w-4 h-4" />
                                                Practice Questions
                                            </h4>
                                            <ol className="space-y-2 list-decimal list-inside">
                                                {day.practiceQuestions.map((q, i) => (
                                                    <li key={i} className="text-slate-300 text-sm">
                                                        {q}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {/* Quick Test */}
                                    {day.quickTest && day.quickTest.length > 0 && (
                                        <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
                                            <h4 className="text-sm font-medium text-emerald-400 mb-3 flex items-center gap-2">
                                                <Award className="w-4 h-4" />
                                                Quick Test
                                            </h4>
                                            <ol className="space-y-2 list-decimal list-inside">
                                                {day.quickTest.map((q, i) => (
                                                    <li key={i} className="text-slate-300 text-sm">
                                                        {q}
                                                    </li>
                                                ))}
                                            </ol>
                                        </div>
                                    )}

                                    {/* Real-Life Application */}
                                    {day.realLifeApplication && day.realLifeApplication.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-slate-400 mb-3 flex items-center gap-2">
                                                <Globe2 className="w-4 h-4" />
                                                Real-Life Application
                                            </h4>
                                            <ul className="space-y-2">
                                                {day.realLifeApplication.map((r, i) => (
                                                    <li key={i} className="flex items-start gap-2 text-slate-300 text-sm">
                                                        <span className="text-blue-400">•</span>
                                                        {r}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    {/* Final Outcome */}
                                    {day.finalOutcome && (
                                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                                            <h4 className="text-sm font-medium text-green-400 mb-2 flex items-center gap-2">
                                                <CheckCircle2 className="w-4 h-4" />
                                                Final Outcome
                                            </h4>
                                            <p className="text-slate-300 text-sm">{day.finalOutcome}</p>
                                        </div>
                                    )}

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
