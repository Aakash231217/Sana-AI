"use client";

import { cn } from "@/lib/utils";
import { ExtendedMessage } from "@/types/message";
import { Bot, User, Volume2, StopCircle, Languages } from "lucide-react";
import ReactMarkdown from "react-markdown";
import React, { forwardRef } from "react"; // Added React
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis";
import { api } from "@/trpc/react";

interface MessageProps {
    message: ExtendedMessage;
    isNextMessageSamePerson: boolean;
}

const Message = forwardRef<HTMLDivElement, MessageProps>(
    ({ message, isNextMessageSamePerson }, ref) => {
        const { speak, isSpeaking, cancel } = useSpeechSynthesis();
        const [translatedText, setTranslatedText] = React.useState<string | null>(null);
        const [isTranslating, setIsTranslating] = React.useState(false);
        const [showTranslated, setShowTranslated] = React.useState(false);

        const { mutate: translate } = api.file.translateMessage.useMutation({
            onSuccess: (data) => {
                setTranslatedText(data.translatedText);
                setShowTranslated(true);
                setIsTranslating(false);
            },
            onError: () => {
                setIsTranslating(false);
                alert("Translation failed");
            }
        });

        const handleTranslate = () => {
            if (translatedText) {
                setShowTranslated(!showTranslated);
                return;
            }

            setIsTranslating(true);
            translate({ text: typeof message.text === "string" ? message.text : "", targetLang: "kn" });
        };

        const onSpeak = () => {
            if (isSpeaking) {
                cancel();
            } else {
                const textToSpeak = (showTranslated && translatedText) ? translatedText : (typeof message.text === "string" ? message.text : "");

                // Determine language:
                // 1. If explicitly viewing translated Kannada: 'kn-IN'
                // 2. If original text contains Kannada characters: 'kn-IN'
                // 3. Default: 'en'
                const isKannada = /[\u0C80-\u0CFF]/.test(textToSpeak);
                const lang = (showTranslated && translatedText) || isKannada ? "kn-IN" : "en";

                speak(textToSpeak, lang);
            }
        };

        return (
            <div
                ref={ref}
                className={cn("flex items-end gap-2 mb-1", {
                    "flex-row-reverse": message.isUserMessage,
                })}
            >
                {/* Avatar */}
                <div
                    className={cn(
                        "relative flex h-8 w-8 aspect-square items-center justify-center rounded-full flex-shrink-0 shadow-sm",
                        {
                            "bg-slate-700 border border-slate-600": message.isUserMessage,
                            "bg-brand-primary border border-brand-primary": !message.isUserMessage,
                            invisible: isNextMessageSamePerson,
                        }
                    )}
                >
                    {message.isUserMessage ? (
                        <User className="fill-white text-white h-4 w-4" />
                    ) : (
                        <Bot className="fill-white text-white h-4 w-4" />
                    )}
                </div>

                <div
                    className={cn(
                        "flex flex-col space-y-1 max-w-[85%]",
                        {
                            "items-end": message.isUserMessage,
                            "items-start": !message.isUserMessage,
                        }
                    )}
                >
                    <div
                        className={cn(
                            "px-4 py-2.5 shadow-sm relative group transition-all duration-300",
                            {
                                "bg-slate-800 text-slate-200 rounded-[1.25rem] rounded-tr-sm": message.isUserMessage,
                                "bg-white/5 backdrop-blur-sm border border-white/10 text-slate-100 rounded-[1.25rem] rounded-tl-sm": !message.isUserMessage,
                                "rounded-tr-[1.25rem]": isNextMessageSamePerson && message.isUserMessage,
                                "rounded-tl-[1.25rem]": isNextMessageSamePerson && !message.isUserMessage,
                            }
                        )}
                    >
                        {typeof message.text === "string" ? (
                            <div className={cn("prose prose-sm prose-invert prose-p:leading-relaxed prose-pre:bg-black/30 prose-pre:border prose-pre:border-white/10", {
                                "text-slate-200": message.isUserMessage,
                                "text-slate-100": !message.isUserMessage,
                            })}>
                                <ReactMarkdown>
                                    {(showTranslated && translatedText) ? translatedText : message.text}
                                </ReactMarkdown>
                            </div>
                        ) : (
                            message.text
                        )}

                        {/* Actions: Speak & Translate - Only for bot messages */}
                        {!message.isUserMessage && message.id !== "loading-message" && (
                            <div className="absolute -right-20 top-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={onSpeak}
                                    className="p-2 rounded-full bg-slate-800/50 hover:bg-brand-primary text-slate-200 hover:text-white transition-all shadow-sm"
                                    aria-label="Read aloud"
                                    title="Read Aloud"
                                >
                                    {isSpeaking ? <StopCircle size={16} /> : <Volume2 size={16} />}
                                </button>

                                <button
                                    onClick={handleTranslate}
                                    className={cn("p-2 rounded-full bg-slate-800/50 hover:bg-brand-primary text-slate-200 hover:text-white transition-all shadow-sm", {
                                        "text-brand-primary bg-brand-primary/10": showTranslated
                                    })}
                                    aria-label="Translate to Kannada"
                                    title="Translate to Kannada"
                                >
                                    {isTranslating ? (
                                        <Languages className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <div className="flex items-center justify-center w-4 h-4 text-[10px] font-bold">
                                            {showTranslated ? "En" : "Kn"}
                                        </div>
                                    )}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }
);

Message.displayName = "Message";

export default Message;
