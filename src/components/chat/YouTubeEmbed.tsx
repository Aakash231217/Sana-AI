"use client";

import { useState } from "react";
import { Play, X, Eye, EyeOff, Youtube } from "lucide-react";

interface YouTubeEmbedProps {
    videoId: string;
    title: string;
}

const YouTubeEmbed = ({ videoId, title }: YouTubeEmbedProps) => {
    const [showVideo, setShowVideo] = useState(false);

    const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`;

    return (
        <div className="my-3 rounded-xl overflow-hidden border border-white/10 bg-slate-900/50 backdrop-blur-sm">
            {/* Header with toggle */}
            <div className="flex items-center justify-between px-3 py-2 bg-red-500/10 border-b border-white/10">
                <div className="flex items-center gap-2">
                    <Youtube className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-medium text-red-400">Suggested Video</span>
                </div>
                <button
                    onClick={() => setShowVideo(!showVideo)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md bg-red-600 hover:bg-red-500 text-white transition-colors"
                >
                    {showVideo ? (
                        <>
                            <EyeOff className="h-3 w-3" />
                            Hide
                        </>
                    ) : (
                        <>
                            <Eye className="h-3 w-3" />
                            Show
                        </>
                    )}
                </button>
            </div>

            {!showVideo ? (
                // Collapsed view with thumbnail preview
                <div className="p-3">
                    <div className="flex gap-3 items-center">
                        {/* Thumbnail */}
                        <div 
                            className="relative flex-shrink-0 w-24 h-14 rounded-lg overflow-hidden bg-slate-800 cursor-pointer group"
                            onClick={() => setShowVideo(true)}
                        >
                            <img
                                src={thumbnailUrl}
                                alt={title}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/60 transition-colors">
                                <div className="w-7 h-7 rounded-full bg-red-600 flex items-center justify-center">
                                    <Play className="h-3 w-3 text-white fill-white ml-0.5" />
                                </div>
                            </div>
                        </div>

                        {/* Title */}
                        <h4 className="text-sm font-medium text-slate-200 line-clamp-2 leading-snug flex-1">
                            {title}
                        </h4>
                    </div>
                </div>
            ) : (
                // Expanded view with embedded video playing in chat
                <div className="p-3">
                    <h4 className="text-sm font-medium text-slate-200 mb-2 line-clamp-1">
                        {title}
                    </h4>
                    <div className="relative w-full pt-[56.25%] rounded-lg overflow-hidden bg-black">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
                            title={title}
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            className="absolute inset-0 w-full h-full"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default YouTubeEmbed;
