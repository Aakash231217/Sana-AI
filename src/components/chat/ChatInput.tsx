
"use client";

import { Send, Mic, MicOff } from "lucide-react";
import { Textarea } from "../ui/Textarea";
import { useContext, useRef, useEffect } from "react";
import { ChatContext } from "./ChatContext";
import { useSpeechRecognition } from "@/hooks/use-speech-recognition";
import { cn } from "@/lib/utils";

interface ChatInputProps {
    isDisabled?: boolean;
}

const ChatInput = ({ isDisabled }: ChatInputProps) => {
    const {
        addMessage,
        handleInputChange,
        isLoading,
        message,
        setInput
    } = useContext(ChatContext);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    const { isListening, startListening, stopListening, transcript } = useSpeechRecognition({
        onEnd: () => {
            // Optional: Auto-send on silence? For now let's just let user review.
        }
    });

    // Update input with voice transcript
    useEffect(() => {
        if (transcript) {
            setInput(transcript);
        }
    }, [transcript, setInput]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            addMessage();
            textareaRef.current?.focus();
        }
    }

    const toggleListening = () => {
        if (isListening) {
            stopListening();
        } else {
            startListening();
        }
    };

    return (
        <div className="w-full relative">
            <div className="relative flex items-end gap-2 bg-slate-900/50 backdrop-blur-xl border border-white/10 p-2 rounded-[2rem] shadow-2xl transition-all duration-300 focus-within:ring-1 focus-within:ring-brand-primary/50">

                {/* Voice Pulse Effect */}
                {isListening && (
                    <div className="absolute inset-0 rounded-[2rem] border-2 border-brand-primary/50 animate-pulse pointer-events-none" />
                )}

                <button
                    type="button"
                    onClick={toggleListening}
                    className={cn(
                        "rounded-full w-10 h-10 flex flex-shrink-0 items-center justify-center transition-all duration-300 border border-white/10 shadow-lg outline-none focus:ring-2 focus:ring-brand-primary/50",
                        isListening ? "bg-red-500 hover:bg-red-600 text-white animate-pulse shadow-red-500/20" : "bg-slate-800 hover:bg-brand-primary text-white"
                    )}
                    aria-label="Toggle voice input"
                >
                    {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                <Textarea
                    rows={1}
                    ref={textareaRef}
                    autoFocus
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    value={message}
                    placeholder={isListening ? "Listening..." : "Ask anything..."}
                    className="min-h-[44px] max-h-[200px] py-3 px-4 resize-none bg-slate-950/50 border border-white/10 rounded-3xl focus-visible:ring-1 focus-visible:ring-brand-primary/50 text-white placeholder:text-slate-400 scrollbar-none flex-1 shadow-inner"
                />

                <button
                    disabled={isLoading || isDisabled || !message.trim()}
                    className={cn(
                        "rounded-full w-10 h-10 flex flex-shrink-0 items-center justify-center transition-all duration-300 border border-white/10 shadow-lg outline-none focus:ring-2 focus:ring-brand-primary/50 disabled:opacity-50 disabled:cursor-not-allowed",
                        message.trim() ? "bg-brand-primary hover:bg-brand-accent text-white shadow-brand-primary/20" : "bg-slate-800 text-slate-400"
                    )}
                    aria-label="send message"
                    onClick={() => {
                        addMessage();
                        textareaRef.current?.focus();
                    }}
                >
                    <Send className="h-5 w-5" />
                </button>
            </div>

            {/* Listening Indicator Text */}
            {isListening && (
                <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-brand-primary animate-bounce font-medium">
                    Listening...
                </div>
            )}
        </div>
    );
};

export default ChatInput;

