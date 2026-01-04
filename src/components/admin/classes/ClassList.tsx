"use client";

import React, { useState } from "react";
import { api } from "@/trpc/react";
import { GlassCard } from "@/components/ui/GlassCard";
import { Button } from "@/components/ui/Button";
import { Users, Plus, Loader2 } from "lucide-react";
import { toast } from "react-hot-toast";
import * as Dialog from "@radix-ui/react-dialog";

interface ClassListProps {
    onSelectClass: (id: string, name: string) => void;
}

export const ClassList: React.FC<ClassListProps> = ({ onSelectClass }) => {
    const [iscreateOpen, setIsCreateOpen] = useState(false);
    const [newClassName, setNewClassName] = useState("");
    const [newClassSection, setNewClassSection] = useState("");

    const utils = api.useUtils();
    const { data: classes, isLoading } = api.admin.getClasses.useQuery();

    const createClassMutation = api.admin.createClass.useMutation({
        onSuccess: () => {
            toast.success("Class created successfully!");
            setIsCreateOpen(false);
            setNewClassName("");
            setNewClassSection("");
            utils.admin.getClasses.invalidate();
        },
        onError: (err) => {
            toast.error(err.message);
        },
    });

    const handleCreate = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newClassName) return;
        createClassMutation.mutate({
            name: newClassName,
            section: newClassSection || undefined,
        });
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-20">
                <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
            </div>
        );
    }

    return (
        <>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-white">All Classes</h2>
                    <p className="text-slate-400">Manage your classes and students</p>
                </div>
                <Button onClick={() => setIsCreateOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Class
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {classes?.map((c) => (
                    <GlassCard
                        key={c.id}
                        className="p-6 cursor-pointer hover:bg-slate-800/50 transition-colors group"
                        onClick={() => onSelectClass(c.id, c.name)}
                    >
                        <div className="flex justify-between items-start">
                            <div>
                                <h3 className="text-xl font-bold text-white group-hover:text-brand-primary transition-colors">
                                    {c.name}
                                </h3>
                                {c.section && (
                                    <span className="text-xs text-slate-500 bg-slate-800 px-2 py-1 rounded mt-1 inline-block">
                                        Section {c.section}
                                    </span>
                                )}
                            </div>
                            <div className="p-3 rounded-full bg-slate-800/80 text-brand-secondary">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between items-center text-sm">
                            <span className="text-slate-400">Total Students</span>
                            <span className="text-white font-medium">{c.studentCount}</span>
                        </div>
                    </GlassCard>
                ))}
            </div>

            {/* Create Class Dialog */}
            <Dialog.Root open={iscreateOpen} onOpenChange={setIsCreateOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" />
                    <Dialog.Content className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] p-6 rounded-xl bg-slate-900 border border-slate-700 w-full max-w-md z-50">
                        <Dialog.Title className="text-xl font-bold text-white mb-4">Create New Class</Dialog.Title>

                        <form onSubmit={handleCreate} className="space-y-4">
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Class Name <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                    placeholder="e.g. Class 10-A"
                                    value={newClassName}
                                    onChange={(e) => setNewClassName(e.target.value)}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-sm text-slate-400 block mb-1">Section (Optional)</label>
                                <input
                                    type="text"
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-white focus:ring-1 focus:ring-brand-primary outline-none"
                                    placeholder="e.g. A"
                                    value={newClassSection}
                                    onChange={(e) => setNewClassSection(e.target.value)}
                                />
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                <Button type="submit" disabled={createClassMutation.isPending}>
                                    {createClassMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                    Create
                                </Button>
                            </div>
                        </form>
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </>
    );
};
