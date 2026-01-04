"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { ManualEntry } from "./ManualEntry";
import { ExcelUpload } from "./ExcelUpload";
import { ChevronDown, GraduationCap, Table, Upload, Plus, Loader2 } from "lucide-react";
import * as Select from "@radix-ui/react-select";
import * as Dialog from "@radix-ui/react-dialog";
import { clsx } from 'clsx';
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";

export const MarksManagement: React.FC = () => {
    // ... (state hooks same)
    const [selectedClassId, setSelectedClassId] = useState<string>("");
    const [selectedExamId, setSelectedExamId] = useState<string>("");
    const [mode, setMode] = useState<"manual" | "upload">("manual");
    const [showCreateExam, setShowCreateExam] = useState(false);
    const [newExamName, setNewExamName] = useState("");

    const { data: classes, isLoading: classesLoading } = api.admin.getClasses.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const { data: exams, refetch: refetchExams } = api.admin.getExams.useQuery(undefined, {
        refetchOnWindowFocus: false,
    });

    const createExamMutation = api.admin.createExam.useMutation({
        onSuccess: (data: { id: string }) => {
            toast.success("Exam created successfully");
            setShowCreateExam(false);
            setNewExamName("");
            refetchExams();
            setSelectedExamId(data.id);
        },
        onError: (err: { message: string }) => toast.error(err.message),
    });

    const selectedClass = classes?.find((c: { id: string }) => c.id === selectedClassId);

    const handleCreateExam = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newExamName.trim()) return;
        createExamMutation.mutate({
            name: newExamName.trim()
        });
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8">
            {/* ... (Header same) ... */}
            <GlassCard className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-2">Marks Management</h1>
                    <p className="text-slate-400">
                        Manage student academic records manually or via bulk upload.
                    </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full md:w-auto">
                    <div className="w-full sm:w-64">
                        <label className="block text-sm text-slate-400 mb-1 ml-1">Select Class</label>
                        {classesLoading ? (
                            <div className="h-10 w-full bg-slate-800 rounded animate-pulse" />
                        ) : (
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-primary outline-none appearance-none cursor-pointer"
                                value={selectedClassId}
                                onChange={(e) => {
                                    setSelectedClassId(e.target.value);
                                    setSelectedExamId("");
                                }}
                            >
                                <option value="" disabled>-- Choose a Class --</option>
                                {classes?.map((c: { id: string, name: string, section?: string | null }) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name} {c.section && `(${c.section})`}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>

                    <div className="w-full sm:w-64">
                        <label className="block text-sm text-slate-400 mb-1 ml-1">Select Exam</label>
                        <div className="flex gap-2">
                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-brand-primary outline-none appearance-none cursor-pointer"
                                value={selectedExamId}
                                onChange={(e) => setSelectedExamId(e.target.value)}
                            >
                                <option value="" disabled>-- Choose Exam --</option>
                                {exams?.map((e: { id: string, name: string }) => (
                                    <option key={e.id} value={e.id}>{e.name}</option>
                                ))}
                            </select>
                            <Button className="px-3" variant="outline" onClick={() => setShowCreateExam(true)}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            </GlassCard>

            {/* Main Content Area */}
            {selectedClassId && selectedExamId ? (
                <div className="space-y-6">
                    {/* Mode Switcher */}
                    <div className="flex justify-center">
                        <div className="bg-slate-900/50 p-1 rounded-full border border-slate-800 flex gap-1">
                            <button
                                onClick={() => setMode("manual")}
                                className={clsx(
                                    "px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                    mode === "manual"
                                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <Table className="w-4 h-4" />
                                Manual Entry
                            </button>
                            <button
                                onClick={() => setMode("upload")}
                                className={clsx(
                                    "px-6 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2",
                                    mode === "upload"
                                        ? "bg-brand-primary text-white shadow-lg shadow-brand-primary/25"
                                        : "text-slate-400 hover:text-white hover:bg-slate-800"
                                )}
                            >
                                <Upload className="w-4 h-4" />
                                Excel Upload
                            </button>
                        </div>
                    </div>

                    <GlassCard className="min-h-[500px]">
                        {mode === "manual" ? (
                            <motion.div
                                key="manual"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="mb-6 flex items-center justify-between">
                                    <h2 className="text-xl font-semibold text-white">
                                        Student List - {selectedClass?.name}
                                    </h2>
                                </div>
                                <ManualEntry classId={selectedClassId} examId={selectedExamId} />
                            </motion.div>
                        ) : (
                            <motion.div
                                key="upload"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                transition={{ duration: 0.2 }}
                            >
                                <div className="mb-6">
                                    <h2 className="text-xl font-semibold text-white">Bulk Upload Marks</h2>
                                    <p className="text-slate-400 text-sm mt-1">
                                        Upload an Excel sheet containing Roll Numbers and Subject Marks.
                                    </p>
                                </div>
                                <ExcelUpload classId={selectedClassId} examId={selectedExamId} />
                            </motion.div>
                        )}
                    </GlassCard>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center py-20 text-slate-500">
                    <GraduationCap className="w-16 h-16 mb-4 opacity-50" />
                    <h3 className="text-xl font-medium text-slate-300">Select Class & Exam</h3>
                    <p>Choose a class and an exam to manage marks.</p>
                </div>
            )}

            {/* Create Exam Dialog */}
            <Dialog.Root open={showCreateExam} onOpenChange={setShowCreateExam}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] p-6 rounded-xl bg-slate-900 border border-slate-700 w-full max-w-md z-50">
                        <Dialog.Title className="text-xl font-bold text-white mb-4">Create New Exam</Dialog.Title>
                        <form onSubmit={handleCreateExam} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Exam Name</label>
                                <input
                                    type="text"
                                    placeholder="e.g., Midterm 2024"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                    value={newExamName}
                                    onChange={e => setNewExamName(e.target.value)}
                                    autoFocus
                                />
                            </div>
                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={() => setShowCreateExam(false)}>Cancel</Button>
                                <Button type="submit" disabled={createExamMutation.isPending}>
                                    {createExamMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create Exam
                                </Button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};
