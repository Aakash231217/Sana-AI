import { ReactNode, createContext, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { trpc } from "@/app/_trpc/client";
import { INFINITE_QUERY_LIMIT } from "@/config/infinite-query";
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";

type StreamResponse = {
    addMessage: () => void;
    message: string;
    handleInputChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    isLoading: boolean;
    setInput: (message: string) => void;
    isSpeaking: boolean; // Global speaking state
    speakingId: string | null;
    speakMessage: (text: string, id: string, lang?: string) => void;
    stopSpeaking: () => void;
};

export const ChatContext = createContext<StreamResponse>({
    addMessage: () => { },
    message: "",
    handleInputChange: () => { },
    isLoading: false,
    setInput: () => { },
    isSpeaking: false,
    speakingId: null,
    speakMessage: () => { },
    stopSpeaking: () => { },
});

interface Props {
    fileId: string;
    children: ReactNode;
}

export const ChatContextProvider = ({ fileId, children }: Props) => {
    const [message, setMessage] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    // Global Speech Synthesis
    const { speak, cancel, isSpeaking } = useSpeechSynthesis();
    const [speakingId, setSpeakingId] = useState<string | null>(null);

    // Wrapper to track WHICH message is speaking
    const speakMessage = (text: string, id: string, lang = "en") => {
        setSpeakingId(id);
        speak(text, lang);
    };

    const stopSpeaking = () => {
        cancel();
        setSpeakingId(null);
    };

    // Auto-clear ID if speaking stops naturally (hook state sync)
    // Note: useSpeechSynthesis's isSpeaking might flip to false on end.
    // We need to sync speakingId to null when isSpeaking becomes false.
    // However, isSpeaking comes from the hook.
    // Let's use an effect.
    useState(() => {
        // This is tricky inside a render logic vs effect. 
        // Just relying on the hook's isSpeaking is safer for the "mascot",
        // but for the "Stop button" on a specific message, we need speakingId.
        // If isSpeaking becomes false, speakingId should practically be null.
    });

    // Better: Effect
    // If the hook says we aren't speaking, clear ID.
    if (!isSpeaking && speakingId) {
        setSpeakingId(null);
    }

    const utils = trpc.useUtils();

    const backupMessage = useRef("");

    const { mutate: sendMessage } = useMutation({
        mutationFn: async ({ message }: { message: string }) => {
            const response = await fetch("/api/message", {
                method: "POST",
                body: JSON.stringify({
                    fileId,
                    message,
                }),
            });

            if (!response.ok) {
                throw new Error("Failed to send message");
            }

            return response.body;
        },
        onMutate: async ({ message }) => {
            backupMessage.current = message;
            setMessage("");

            // Optimistic update
            await utils.file.getFileMessages.cancel();
            const previousMessages = utils.file.getFileMessages.getInfiniteData();

            utils.file.getFileMessages.setInfiniteData(
                { fileId, limit: INFINITE_QUERY_LIMIT },
                (old) => {
                    if (!old) {
                        return {
                            pages: [],
                            pageParams: [],
                        };
                    }

                    let newPages = [...old.pages];
                    let latestPage = newPages[0]!;

                    latestPage.messages = [
                        {
                            createdAt: new Date(),
                            id: crypto.randomUUID(),
                            text: message,
                            isUserMessage: true,
                        },
                        ...latestPage.messages,
                    ];

                    newPages[0] = latestPage;

                    return {
                        ...old,
                        pages: newPages,
                    };
                }
            );

            setIsLoading(true);
            return {
                previousMessages:
                    previousMessages?.pages.flatMap((page) => page.messages) ?? [],
            };
        },
        onSuccess: async (stream) => {
            setIsLoading(false);

            if (!stream) {
                return alert("There was a problem sending this message");
            }

            const reader = stream.getReader();
            const decoder = new TextDecoder();
            let done = false;

            // accumulate response
            let accResponse = "";

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value);

                accResponse += chunkValue;

                // streaming update
                utils.file.getFileMessages.setInfiniteData(
                    { fileId, limit: INFINITE_QUERY_LIMIT },
                    (old) => {
                        if (!old) return { pages: [], pageParams: [] };

                        let isAiResponseCreated = old.pages.some((page) =>
                            page.messages.some((message) => message.id === "ai-response")
                        );

                        let updatedPages = old.pages.map((page) => {
                            if (page === old.pages[0]) {
                                let updatedMessages;

                                if (!isAiResponseCreated) {
                                    updatedMessages = [
                                        {
                                            createdAt: new Date(),
                                            id: "ai-response",
                                            text: accResponse,
                                            isUserMessage: false,
                                        },
                                        ...page.messages,
                                    ];
                                } else {
                                    updatedMessages = page.messages.map((message) => {
                                        if (message.id === "ai-response") {
                                            return {
                                                ...message,
                                                text: accResponse,
                                            };
                                        }
                                        return message;
                                    });
                                }

                                return {
                                    ...page,
                                    messages: updatedMessages,
                                };
                            }

                            return page;
                        });

                        return {
                            ...old,
                            pages: updatedPages,
                        };
                    }
                );
            }
        },
        onError: (_, __, context) => {
            setMessage(backupMessage.current);
            utils.file.getFileMessages.setData(
                { fileId },
                { messages: context?.previousMessages ?? [], nextCursor: undefined }
            );
        },
        onSettled: async () => {
            setIsLoading(false);
            await utils.file.getFileMessages.invalidate({ fileId });
        },
    });

    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setMessage(e.target.value);
    };

    const addMessage = () => sendMessage({ message });

    return (
        <ChatContext.Provider
            value={{
                addMessage,
                message,
                handleInputChange,
                isLoading,
                setInput: setMessage,
                isSpeaking,
                speakingId: isSpeaking ? speakingId : null, // Ensure sync
                speakMessage,
                stopSpeaking
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
