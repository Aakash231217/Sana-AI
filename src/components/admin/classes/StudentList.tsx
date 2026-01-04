"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/Button";
import { Loader2, Plus, UserPlus, FileSpreadsheet } from "lucide-react";
import { StudentImport } from "./StudentImport";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-hot-toast";

interface StudentListProps {
    classId: string;
    className: string;
}

export const StudentList: React.FC<StudentListProps> = ({ classId }) => {
    const [showImport, setShowImport] = useState(false);
    const [showAdd, setShowAdd] = useState(false);

    // Manual Add State
    const [newName, setNewName] = useState("");
    const [newRoll, setNewRoll] = useState("");
    const [newAdm, setNewAdm] = useState("");
    const [newEmail, setNewEmail] = useState("");
    const [newMobile, setNewMobile] = useState("");

    const utils = api.useUtils();
    const { data: students, isLoading } = api.admin.getStudentsByClass.useQuery({ classId });

    const createStudentMutation = api.admin.createStudent.useMutation({
        onSuccess: () => {
            toast.success("Student added successfully");
            setShowAdd(false);
            setNewName("");
            setNewRoll("");
            setNewAdm("");
            setNewEmail("");
            setNewMobile("");
            utils.admin.getStudentsByClass.invalidate({ classId });
            utils.admin.getClasses.invalidate(); // Update counts
        },
        onError: (err) => toast.error(err.message),
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        createStudentMutation.mutate({
            name: newName,
            classId,
            rollNumber: newRoll || undefined,
            admissionNumber: newAdm || undefined,
            email: newEmail || undefined,
            mobile: newMobile || undefined,
        });
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-3">
                <Button variant="outline" onClick={() => setShowAdd(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Student
                </Button>
                <Button onClick={() => setShowImport(!showImport)} variant={showImport ? "outline" : "primary"}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" />
                    {showImport ? "Hide Import" : "Import from Excel"}
                </Button>
            </div>

            {showImport && (
                <div className="bg-slate-900/50 p-6 rounded-xl border border-slate-700 animate-in slide-in-from-top-4">
                    <StudentImport classId={classId} />
                </div>
            )}

            {isLoading ? (
                <div className="flex justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
                </div>
            ) : (
                <div className="overflow-hidden rounded-xl border border-slate-700 bg-slate-900/50">
                    <table className="w-full text-left text-sm text-slate-300">
                        <thead className="bg-slate-800 text-slate-100 uppercase">
                            <tr>
                                <th className="px-6 py-4">Roll No</th>
                                <th className="px-6 py-4">Name</th>
                                <th className="px-6 py-4">Admission No</th>
                                <th className="px-6 py-4">Marks Recorded</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {students?.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500 italic">
                                        No students in this class yet. Add one or import from Excel.
                                    </td>
                                </tr>
                            ) : (
                                students?.map((student) => (
                                    <tr key={student.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 font-medium text-white">{student.rollNumber || "-"}</td>
                                        <td className="px-6 py-4 font-medium">{student.name}</td>
                                        <td className="px-6 py-4 text-slate-400">{student.admissionNumber || "-"}</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-1 rounded text-xs ${student.marks.length > 0 ? "bg-green-500/10 text-green-400" : "bg-slate-700 text-slate-400"}`}>
                                                {student.marks.length} Subjects
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Manual Add Dialog */}
            <Dialog.Root open={showAdd} onOpenChange={setShowAdd}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] p-6 rounded-xl bg-slate-900 border border-slate-700 w-full max-w-md z-50">
                        <Dialog.Title className="text-xl font-bold text-white mb-4">Add Student</Dialog.Title>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                    required
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1">Roll Number</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={newRoll}
                                        onChange={e => setNewRoll(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-400 block mb-1">Admission No</label>
                                    <input
                                        type="text"
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                        value={newAdm}
                                        onChange={e => setNewAdm(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                    value={newEmail}
                                    onChange={e => setNewEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Mobile Number</label>
                                <input
                                    type="tel"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                    value={newMobile}
                                    onChange={e => setNewMobile(e.target.value)}
                                    placeholder="Optional"
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={() => setShowAdd(false)}>Cancel</Button>
                                <Button type="submit" disabled={createStudentMutation.isPending}>
                                    {createStudentMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Add Student
                                </Button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};
