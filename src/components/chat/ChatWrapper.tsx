"use client";

import { trpc } from "@/app/_trpc/client";
import { ChatContextProvider } from "./ChatContext";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import { Loader2, XCircle } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/Button";

interface ChatWrapperProps {
    fileId: string;
}

export const ChatWrapper = ({ fileId }: ChatWrapperProps) => {
    const { data, isLoading } = trpc.file.getFileUploadStatus.useQuery(
        {
            fileId,
        },
        {
            refetchInterval: (query) =>
                query.state.data?.status === "SUCCESS" || query.state.data?.status === "FAILED"
                    ? false
                    : 500,
        }
    );

    if (isLoading)
        return (
            <div className="relative min-h-full bg-slate-900 flex divide-y divide-zinc-700 flex-col justify-between gap-2">
                <div className="flex-1 flex justify-center items-center flex-col mb-28">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                        <h3 className="font-semibold text-xl text-white">Loading...</h3>
                        <p className="text-zinc-500 text-sm">
                            We&apos;re preparing your PDF.
                        </p>
                    </div>
                </div>
            </div>
        );

    if (data?.status === "PROCESSING")
        return (
            <div className="relative min-h-full bg-slate-900 flex divide-y divide-zinc-700 flex-col justify-between gap-2">
                <div className="flex-1 flex justify-center items-center flex-col mb-28">
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 text-blue-500 animate-spin" />
                        <h3 className="font-semibold text-xl text-white">Processing PDF...</h3>
                        <p className="text-zinc-500 text-sm">
                            This won&apos;t take long.
                        </p>
                    </div>
                </div>
            </div>
        );

    if (data?.status === "FAILED")
        return (
            <div className="relative min-h-full bg-slate-900 flex divide-y divide-zinc-700 flex-col justify-between gap-2">
                <div className="flex-1 flex justify-center items-center flex-col mb-28">
                    <div className="flex flex-col items-center gap-2">
                        <XCircle className="h-8 w-8 text-red-500" />
                        <h3 className="font-semibold text-xl text-white">Too many pages in PDF</h3>
                        <p className="text-zinc-500 text-sm">
                            Please <span className="font-medium">upgrade your plan</span> to upload larger PDFs.
                        </p>
                        <Link
                            href="/dashboard"
                            className={buttonVariants({
                                variant: "secondary",
                                className: "mt-4",
                            })}
                        >
                            Back
                        </Link>
                    </div>
                </div>
            </div>
        );

    return (
        <ChatContextProvider fileId={fileId}>
            <div className="relative h-[calc(100vh-8rem)] w-full flex flex-col items-center">
                {/* Minimal Header */}
                <div className="absolute top-0 left-0 w-full p-4 flex justify-between items-center z-10 pointer-events-none">
                    <div className="flex items-center gap-2 pointer-events-auto bg-black/20 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/5">
                        <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs text-white/80 font-medium">Sana-AI Voice Active</span>
                    </div>
                </div>

                {/* Main Content Area - Transparent / Glass */}
                <div className="w-full max-w-4xl h-full flex flex-col relative z-0">
                    <div className="flex-1 overflow-hidden">
                        <Messages fileId={fileId} />
                    </div>

                    <div className="w-full p-4">
                        <ChatInput />
                    </div>
                </div>
            </div>
        </ChatContextProvider>
    );
};
