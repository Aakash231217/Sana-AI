"use client";

import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { Loader2, MessageSquare } from "lucide-react";
import Skeleton from "react-loading-skeleton";
import Message from "./Message";
import { useContext, useEffect, useRef } from "react";
import { ChatContext } from "./ChatContext";
import { useIntersection } from "@mantine/hooks";

interface MessagesProps {
    fileId: string;
}

const Messages = ({ fileId }: MessagesProps) => {
    const { isLoading: isAiThinking } = useContext(ChatContext);

    const { data, isLoading, fetchNextPage } =
        trpc.file.getFileMessages.useInfiniteQuery(
            {
                fileId,
                limit: INFINITE_QUERY_LIMIT,
            },
            {
                getNextPageParam: (lastPage) => lastPage?.nextCursor,
                // placeholderData: (previousData) => previousData, // keptPreviousData equivalent
            }
        );

    const messages = data?.pages.flatMap((page) => page.messages);

    const loadingMessage = {
        createdAt: new Date(),
        id: "loading-message",
        isUserMessage: false,
        text: (
            <span className="flex h-full items-center justify-center">
                <Loader2 className="h-4 w-4 animate-spin" />
            </span>
        ) as unknown as string,
    };

    const combinedMessages = [
        ...(isAiThinking ? [loadingMessage] : []),
        ...(messages ?? []),
    ];

    const lastMessageRef = useRef<HTMLDivElement>(null);

    const { ref, entry } = useIntersection({
        root: lastMessageRef.current,
        threshold: 1,
    });

    useEffect(() => {
        if (entry?.isIntersecting) {
            fetchNextPage();
        }
    }, [entry, fetchNextPage]);

    return (
        <div className="flex h-full flex-1 flex-col-reverse gap-4 p-6 overflow-y-auto scroll-smooth custom-scrollbar">
            {combinedMessages && combinedMessages.length > 0 ? (
                combinedMessages.map((message, i) => {
                    const isNextMessageSamePerson =
                        combinedMessages[i - 1]?.isUserMessage ===
                        combinedMessages[i]?.isUserMessage;

                    if (i === combinedMessages.length - 1) {
                        return (
                            <Message
                                ref={ref}
                                message={message}
                                isNextMessageSamePerson={isNextMessageSamePerson}
                                key={message.id}
                            />
                        );
                    } else {
                        return (
                            <Message
                                message={message}
                                isNextMessageSamePerson={isNextMessageSamePerson}
                                key={message.id}
                            />
                        );
                    }
                })
            ) : isLoading ? (
                <div className="w-full flex flex-col gap-2">
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                    <Skeleton className="h-16" />
                </div>
            ) : (
                <div className="flex-1 flex flex-col items-center justify-center gap-2">
                    <MessageSquare className="h-8 w-8 text-blue-500" />
                    <h3 className="font-semibold text-xl text-white">You&apos;re all set!</h3>
                    <p className="text-zinc-500 text-sm">
                        Ask your first question to get started.
                    </p>
                </div>
            )}
        </div>
    );
};

export default Messages;
