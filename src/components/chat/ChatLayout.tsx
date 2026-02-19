"use client";

import { useContext, useState, useEffect } from "react";
import { ChatContext } from "./ChatContext";
import Messages from "./Messages";
import ChatInput from "./ChatInput";
import { Mascot3D } from "@/components/learning/Mascot3D";
import { Sparkles, Lightbulb, MessageCircle, Zap } from "lucide-react";

interface ChatLayoutProps {
    fileId: string;
}

// Fun greetings and tips for students
const greetings = [
    "Hey there, Scholar! 👋",
    "Ready to learn? 🚀",
    "Let's ace this! 💪",
    "Knowledge awaits! 📚",
];

const tips = [
    "💡 Tip: Ask me to explain concepts in simple words!",
    "🎯 Try: 'Give me a quiz on this topic'",
    "📹 Ask: 'Show me a video about this'",
    "🔍 Pro tip: Ask 'Why is this important?'",
];

export const ChatLayout = ({ fileId }: ChatLayoutProps) => {
    const { isLoading, isSpeaking } = useContext(ChatContext);
    const [greeting, setGreeting] = useState(greetings[0]);
    const [tip, setTip] = useState(tips[0]);
    const [showGreeting, setShowGreeting] = useState(true);
    const [clickCount, setClickCount] = useState(0);
    const [showSparkle, setShowSparkle] = useState(false);

    // Rotate greetings
    useEffect(() => {
        const timer = setTimeout(() => setShowGreeting(false), 5000);
        return () => clearTimeout(timer);
    }, []);

    // Rotate tips every 10s
    useEffect(() => {
        const interval = setInterval(() => {
            setTip(tips[Math.floor(Math.random() * tips.length)]);
        }, 10000);
        return () => clearInterval(interval);
    }, []);

    const handleMascotClick = () => {
        setClickCount(c => c + 1);
        setShowSparkle(true);
        setTimeout(() => setShowSparkle(false), 500);

        // Show a new greeting on click
        setGreeting(greetings[Math.floor(Math.random() * greetings.length)]);
        setShowGreeting(true);
        setTimeout(() => setShowGreeting(false), 3000);
    };

    return (
        <div className="relative h-[calc(100vh-8rem)] w-full flex items-center justify-center p-4 gap-6">

            {/* LEFT SIDE: Mascot Area - Bigger & More Interactive */}
            <div className="hidden xl:flex flex-col items-center justify-center h-full w-[500px] flex-shrink-0 relative self-center">

                {/* Ambient Glow Behind Mascot */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-[400px] h-[400px] bg-brand-primary/20 blur-[100px] rounded-full animate-pulse" />
                </div>

                {/* Greeting Bubble - Appears Above Mascot */}
                {showGreeting && (
                    <div className="absolute top-[10%] left-1/2 -translate-x-1/2 z-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white/10 backdrop-blur-xl border border-white/20 px-5 py-3 rounded-2xl rounded-bl-none shadow-xl">
                            <p className="text-white font-medium text-lg">{greeting}</p>
                        </div>
                    </div>
                )}

                {/* Mascot Container - Larger! */}
                <div className="relative w-[700px] h-[700px] z-10 -mt-24">
                    <div
                        className="w-full h-full transform hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onClick={handleMascotClick}
                    >
                        <Mascot3D
                            state={isSpeaking ? 'speaking' : (isLoading ? 'thinking' : 'idle')}
                            onClick={handleMascotClick}
                            className="drop-shadow-2xl w-full h-full"
                        />
                    </div>

                    {/* Click Sparkle Effect */}
                    {showSparkle && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
                            <Zap className="w-20 h-20 text-yellow-400 animate-ping" />
                        </div>
                    )}

                    {/* Click Counter Badge */}
                    {clickCount > 0 && (
                        <div className="absolute -top-2 -right-2 bg-gradient-to-r from-brand-primary to-brand-accent px-3 py-1 rounded-full text-white text-xs font-bold shadow-lg animate-in zoom-in">
                            {clickCount} clicks! ⚡
                        </div>
                    )}
                </div>

                {/* Status Area Below Mascot */}
                <div className="mt-2 text-center z-10 space-y-2">
                    {isSpeaking && (
                        <div className="bg-gradient-to-r from-brand-primary/20 to-brand-accent/20 backdrop-blur-md border border-brand-primary/30 px-5 py-2.5 rounded-full text-white font-medium animate-pulse shadow-lg inline-flex items-center gap-2">
                            <MessageCircle size={16} className="animate-bounce" />
                            Speaking...
                        </div>
                    )}
                    {isLoading && !isSpeaking && (
                        <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-md border border-blue-400/30 px-5 py-2.5 rounded-full text-white font-medium animate-pulse shadow-lg inline-flex items-center gap-2">
                            <Sparkles size={16} className="animate-spin" />
                            Thinking deeply...
                        </div>
                    )}

                    {/* Rotating Tips - Always visible when idle */}
                    {!isLoading && !isSpeaking && (
                        <div className="animate-in fade-in duration-500">
                            <div className="bg-white/5 backdrop-blur-md border border-white/10 px-4 py-2 rounded-xl text-slate-300 text-sm max-w-[300px] mx-auto">
                                <Lightbulb size={14} className="inline mr-2 text-yellow-400" />
                                {tip}
                            </div>
                            <p className="text-slate-500 text-xs mt-2">Click the robot for a surprise! 🎉</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: Chat Window */}
            <div className="relative flex-1 max-w-4xl h-full bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col">

                {/* Background Decor */}
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-brand-primary/20 blur-[120px] rounded-full pointer-events-none -z-10" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-brand-accent/10 blur-[100px] rounded-full pointer-events-none -z-10" />

                {/* Header */}
                <div className="flex items-center justify-between px-8 py-5 border-b border-white/5 bg-white/5 backdrop-blur-md z-20">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brand-primary to-brand-accent flex items-center justify-center shadow-lg shadow-brand-primary/25">
                            <span className="text-xl">✨</span>
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white tracking-tight">Resource Assistant</h2>
                            <div className="flex items-center gap-2">
                                <span className="flex w-2 h-2 rounded-full bg-green-500 animate-pulse shadow-green-500/50" />
                                <p className="text-xs text-slate-400 font-medium">Sana-AI Online</p>
                            </div>
                        </div>
                    </div>
                    {/* Gamification Badge */}
                    <div className="bg-slate-950/50 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                        <Sparkles size={12} className="text-yellow-400" />
                        <span className="text-xs font-bold text-white/90">Level 1 Scholar</span>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 overflow-hidden relative z-10">
                    <Messages fileId={fileId} />
                </div>

                {/* Footer Input Area */}
                <div className="p-6 bg-gradient-to-t from-slate-900/80 to-transparent z-20 relative">
                    <ChatInput />
                </div>

            </div>
        </div>
    );
};
