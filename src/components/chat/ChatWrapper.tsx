"use client";

import { trpc } from "@/app/_trpc/client";
import { ChatContextProvider } from "./ChatContext";
import { ChatLayout } from "./ChatLayout";
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
            <ChatLayout fileId={fileId} />
        </ChatContextProvider>
    );
};
