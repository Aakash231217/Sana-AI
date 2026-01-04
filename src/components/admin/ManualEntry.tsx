"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Loader2, Save, X } from "lucide-react";
import { toast } from "react-hot-toast";

interface ManualEntryProps {
    classId: string;
    examId: string;
}

export const ManualEntry: React.FC<ManualEntryProps> = ({ classId, examId }) => {
    const { data: students, isLoading, refetch } = api.admin.getStudentsByClass.useQuery(
        { classId },
        {
            refetchOnWindowFocus: false,
        }
    );

    const utils = api.useUtils();
    const updateMarkMutation = api.admin.updateStudentMark.useMutation({
        onSuccess: () => {
            toast.success("Mark updated");
            utils.admin.getStudentsByClass.invalidate({ classId });
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const [selectedSubject, setSelectedSubject] = useState("Maths");
    const [isCustomSubject, setIsCustomSubject] = useState(false);

    // Common subjects (could be fetched from config)
    const commonSubjects = ["Maths", "Science", "English", "Social Science", "Hindi", "Computer"];

    if (isLoading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                <div className="flex-1">
                    <label className="text-sm text-slate-400 block mb-1">Target Subject</label>
                    <div className="flex gap-2">
                        {!isCustomSubject ? (
                            <select
                                className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none flex-1"
                                value={selectedSubject}
                                onChange={(e) => {
                                    if (e.target.value === "custom") {
                                        setIsCustomSubject(true);
                                        setSelectedSubject("");
                                    } else {
                                        setSelectedSubject(e.target.value);
                                    }
                                }}
                            >
                                {commonSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                <option value="custom">+ Custom Subject</option>
                            </select>
                        ) : (
                            <div className="flex gap-2 flex-1">
                                <input
                                    type="text"
                                    className="bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none flex-1"
                                    placeholder="Enter Subject Name"
                                    value={selectedSubject}
                                    onChange={(e) => setSelectedSubject(e.target.value)}
                                    autoFocus
                                />
                                <Button className="px-3" variant="outline" onClick={() => setIsCustomSubject(false)}>Cancel</Button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-800 text-slate-400 border-b border-slate-700 text-sm uppercase">
                            <th className="p-4 w-24">Roll No</th>
                            <th className="p-4">Name</th>
                            <th className="p-4">Marks for {selectedSubject || "..."}</th>
                        </tr>
                    </thead>
                    <tbody className="text-slate-200 divide-y divide-slate-700/50">
                        {students?.map((student: {
                            id: string;
                            name: string;
                            rollNumber: string | null;
                            marks: {
                                subjectName: string;
                                marks: number;
                                maxMarks: number;
                                examId: string | null;
                            }[]
                        }) => {
                            // Helper to get mark for a subject AND exam
                            const currentMarkEntry = student.marks.find(
                                (m) => m.subjectName === selectedSubject && m.examId === examId
                            );

                            return (
                                <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                                    <td className="p-4 font-mono text-slate-400">{student.rollNumber || "-"}</td>
                                    <td className="p-4 font-medium">{student.name}</td>
                                    <td className="p-4">
                                        <MarkCell
                                            studentId={student.id}
                                            subject={selectedSubject}
                                            mark={currentMarkEntry?.marks}
                                            maxMarks={currentMarkEntry?.maxMarks}
                                            onSave={(score, max) =>
                                                updateMarkMutation.mutate({
                                                    studentRecordId: student.id,
                                                    subjectName: selectedSubject,
                                                    examId: examId,
                                                    marks: score,
                                                    maxMarks: max,
                                                })
                                            }
                                        />
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// Inline component for editing a single mark cell
const MarkCell = ({
    studentId,
    subject,
    mark,
    maxMarks,
    onSave,
}: {
    studentId: string;
    subject: string;
    mark?: number;
    maxMarks?: number;
    onSave: (score: number, max: number) => void;
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [value, setValue] = useState(mark?.toString() || "");

    const handleSave = () => {
        const num = parseFloat(value);
        if (!isNaN(num)) {
            onSave(num, maxMarks || 100);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <div className="flex items-center gap-2">
                <input
                    type="number"
                    className="w-16 bg-slate-900 border border-slate-600 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-brand-primary outline-none"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") handleSave();
                        if (e.key === "Escape") setIsEditing(false);
                    }}
                    autoFocus
                />
                <button onClick={handleSave} className="text-green-400 hover:text-green-300">
                    <Save size={16} />
                </button>
                <button onClick={() => setIsEditing(false)} className="text-red-400 hover:text-red-300">
                    <X size={16} />
                </button>
            </div>
        );
    }

    return (
        <div
            onClick={() => setIsEditing(true)}
            className="cursor-pointer hover:bg-slate-800 rounded px-2 py-1 min-w-[3rem] text-center transition-colors"
        >
            {mark !== undefined ? (
                <span className={mark < 35 ? "text-red-400" : "text-green-400"}>{mark}</span>
            ) : (
                <span className="text-slate-600">-</span>
            )}
        </div>
    );
};
