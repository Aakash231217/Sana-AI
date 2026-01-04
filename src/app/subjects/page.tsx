"use client";

import { useState } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { UploadDropzone } from "@/utils/uploadthing";
import { api } from "@/trpc/react";
import { Book, Loader2, Plus, Trash2, Folder } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { DeleteFileButton } from "@/components/DeleteFileButton";

export default function SubjectsPage() {
    const [isCreatingSubject, setIsCreatingSubject] = useState(false);
    const [newSubjectName, setNewSubjectName] = useState("");
    const router = useRouter();

    const utils = api.useUtils();

    const { data: files, isLoading } = api.file.getUserFiles.useQuery({});

    // We'll use a simple upload here for now, directly to root
    // Ideally this page would manage Subjects -> Subfolders -> Files
    // But for the "MVP" as per plan, we just want a way to upload books.

    return (
        <ProtectedRoute>
            <main className="min-h-screen bg-brand-dark pt-24 px-6">
                <Navbar />
                <div className="max-w-6xl mx-auto">
                    <div className="flex justify-between items-center mb-8">
                        <h1 className="text-4xl font-bold text-white">Subject Books</h1>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Upload Section */}
                        <div className="lg:col-span-1">
                            <div className="bg-slate-900 rounded-2xl p-6 border border-white/10 sticky top-24">
                                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                                    <Plus className="text-brand-primary" /> Upload New Book
                                </h2>

                                <UploadDropzone
                                    endpoint="freePlanUploader"
                                    onClientUploadComplete={(res) => {
                                        console.log("Files: ", res);
                                        utils.file.getUserFiles.invalidate();
                                        // alert("Upload Completed");
                                    }}
                                    onUploadError={(error: Error) => {
                                        alert(`ERROR! ${error.message}`);
                                    }}
                                    onBeforeUploadBegin={(files) => {
                                        return files.map((file) => {
                                            const extension = file.name.split('.').pop();
                                            const nameWithoutExtension = file.name.split('.').slice(0, -1).join('.');
                                            const sanitizedName = nameWithoutExtension.replace(/[^a-zA-Z0-9-_]/g, "_");
                                            const newName = `${sanitizedName}.${extension}`;
                                            console.log(`Renaming ${file.name} -> ${newName}`);
                                            return new File([file], newName, { type: file.type });
                                        });
                                    }}
                                    config={{ mode: "auto" }}
                                    className="ut-label:text-brand-primary ut-button:bg-brand-primary ut-button:ut-readying:bg-brand-primary/50"
                                />

                                <p className="text-slate-400 text-sm mt-4">
                                    Supported formats: PDF (Max 128MB).
                                    <br />
                                    AI will analyze the content for chat.
                                </p>
                            </div>
                        </div>

                        {/* Books List logic */}
                        <div className="lg:col-span-2">
                            <h2 className="text-xl font-bold text-white mb-6">Your Library</h2>

                            {isLoading ? (
                                <div className="flex justify-center py-12">
                                    <Loader2 className="w-8 h-8 text-brand-primary animate-spin" />
                                </div>
                            ) : files?.length === 0 ? (
                                <div className="text-slate-400 text-center py-12 border border-dashed border-white/10 rounded-2xl">
                                    No books found. Upload one to get started.
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {files?.map((file) => (
                                        <div key={file.id} className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex justify-between items-center hover:bg-slate-900 transition-colors group">
                                            <Link href={`/book/${file.id}`} className="flex-1 flex items-center gap-4">
                                                <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                                                    <Book size={20} />
                                                </div>
                                                <div>
                                                    <h3 className="font-medium text-white group-hover:text-brand-primary transition-colors">{file.name}</h3>
                                                    <p className="text-xs text-slate-400">
                                                        {new Date(file.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                            </Link>

                                            <div className="flex items-center gap-2">
                                                <DeleteFileButton fileId={file.id} onDelete={() => utils.file.getUserFiles.invalidate()} />
                                                <Link href={`/book/${file.id}`} className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-sm rounded-lg transition-colors">
                                                    Chat
                                                </Link>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </ProtectedRoute>
    );
}
