"use client";

import { Navbar } from "@/components/layout/Navbar";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { api } from "@/trpc/react";
import { Loader2, AlertTriangle } from "lucide-react";
import { useParams } from "next/navigation";
import { ChatWrapper } from "@/components/chat/ChatWrapper";

export default function BookChatPage() {
    const { bookId } = useParams();

    // Verify file exists
    const { data: file, isLoading, isError } = api.file.getFileUploadStatus.useQuery(
        { fileId: bookId as string },
        {
            refetchInterval: (query) =>
                query.state.data?.status === "SUCCESS" || query.state.data?.status === "FAILED"
                    ? false
                    : 500,
        }
    );

    if (isLoading) {
        return (
            <ProtectedRoute>
                <main className="min-h-screen bg-brand-dark pt-24 px-6 flex items-center justify-center">
                    <Loader2 className="w-10 h-10 text-brand-primary animate-spin" />
                </main>
            </ProtectedRoute>
        );
    }

    if (isError || !file) {
        return (
            <ProtectedRoute>
                <main className="min-h-screen bg-brand-dark pt-24 px-6 flex flex-col items-center justify-center text-center">
                    <AlertTriangle className="w-10 h-10 text-red-500 mb-4" />
                    <h1 className="text-2xl font-bold text-white mb-2">Book Not Found</h1>
                    <p className="text-slate-400">The book you are trying to access does not exist or has been removed.</p>
                </main>
            </ProtectedRoute>
        );
    }

    return (
        <ProtectedRoute>
            <main className="flex flex-col h-[calc(100vh-theme(spacing.16))] bg-brand-dark">
                <Navbar />
                <div className="flex-1 mt-16 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 h-full">
                    <ChatWrapper fileId={bookId as string} />
                </div>
            </main>
        </ProtectedRoute>
    );
}
