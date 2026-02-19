import React from 'react';
import { motion } from 'framer-motion';

interface MascotProps {
    state: 'idle' | 'thinking' | 'speaking';
    className?: string;
}

export const MascotCharacter: React.FC<MascotProps> = ({ state, className = '' }) => {
    return (
        <div className={`relative w-48 h-48 flex items-center justify-center ${className}`}>
            {/* Floating Animation Wrapper */}
            <motion.div
                animate={{
                    y: [0, -12, 0],
                    rotate: [0, 1, -1, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                className="relative z-10"
            >
                <svg viewBox="0 0 200 200" className="w-40 h-40 drop-shadow-2xl filter blur-[0.5px]">
                    <defs>
                        <linearGradient id="bodyGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="#1e293b" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <linearGradient id="faceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                            <stop offset="0%" stopColor="#334155" />
                            <stop offset="100%" stopColor="#0f172a" />
                        </linearGradient>
                        <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6" />
                        </linearGradient>
                        <radialGradient id="eyeGlow">
                            <stop offset="0%" stopColor="#60a5fa" />
                            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
                        </radialGradient>
                    </defs>

                    {/* Antenna */}
                    <motion.g
                        animate={{ rotate: state === 'thinking' ? [0, 8, -8, 0] : 0 }}
                        transition={{ duration: 0.6, repeat: Infinity, ease: "easeInOut" }}
                        className="origin-bottom"
                    >
                        <path d="M100 25 L100 60" stroke="url(#glowGradient)" strokeWidth="3" strokeLinecap="round" />
                        <motion.circle
                            cx="100" cy="25" r="5"
                            fill={state === 'thinking' ? '#f472b6' : '#60a5fa'}
                            className="shadow-glow"
                            animate={{ scale: state === 'thinking' ? [1, 1.2, 1] : 1 }}
                            transition={{ duration: 0.5, repeat: Infinity }}
                        />
                    </motion.g>

                    {/* Head Body */}
                    <rect x="50" y="60" width="100" height="90" rx="28" fill="url(#bodyGradient)" stroke="#3b82f6" strokeWidth="2" strokeOpacity="0.5" />

                    {/* Inner Face Screen (Glassmorphism) */}
                    <rect x="58" y="70" width="84" height="65" rx="18" fill="#020617" stroke="white" strokeWidth="1" strokeOpacity="0.1" />
                    <rect x="58" y="70" width="84" height="65" rx="18" fill="url(#faceGradient)" opacity="0.8" />

                    {/* Screen Reflection/Gloss */}
                    <path d="M65 75 Q100 95 135 75" stroke="white" strokeWidth="1" strokeOpacity="0.1" fill="none" />

                    {/* Eyes Container */}
                    <g transform="translate(0, 8)">
                        {/* Left Eye */}
                        <motion.g
                            animate={{
                                scaleY: state === 'thinking' ? [1, 0.1, 1] : 1,
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                        >
                            <circle cx="80" cy="95" r="9" fill="#2563eb" opacity="0.3" /> {/* Outer glow */}
                            <circle cx="80" cy="95" r="6" fill={state === 'thinking' ? '#f472b6' : '#60a5fa'} />
                            <circle cx="82" cy="93" r="2" fill="white" opacity="0.9" />
                        </motion.g>

                        {/* Right Eye */}
                        <motion.g
                            animate={{
                                scaleY: state === 'thinking' ? [1, 0.1, 1] : 1,
                            }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                        >
                            <circle cx="120" cy="95" r="9" fill="#2563eb" opacity="0.3" /> {/* Outer glow */}
                            <circle cx="120" cy="95" r="6" fill={state === 'thinking' ? '#f472b6' : '#60a5fa'} />
                            <circle cx="122" cy="93" r="2" fill="white" opacity="0.9" />
                        </motion.g>
                    </g>

                    {/* Mouth Expression */}
                    <motion.path
                        d={state === 'thinking'
                            ? "M85 120 Q100 120 115 120" // Straight line
                            : state === 'speaking'
                                ? "M85 120 Q100 130 115 120" // Opening mouth
                                : "M85 120 Q100 128 115 120" // Gentle smile
                        }
                        fill="none"
                        stroke={state === 'thinking' ? '#f472b6' : '#60a5fa'}
                        strokeWidth="3"
                        strokeLinecap="round"
                        animate={state === 'speaking' ? { d: ["M85 120 Q100 130 115 120", "M85 120 Q100 115 115 120", "M85 120 Q100 130 115 120"] } : {}}
                        transition={{ duration: 0.3, repeat: Infinity }}
                    />

                    {/* Cheeks */}
                    <circle cx="70" cy="110" r="4" fill="#f472b6" opacity="0.2" filter="blur(2px)" />
                    <circle cx="130" cy="110" r="4" fill="#f472b6" opacity="0.2" filter="blur(2px)" />
                </svg>
            </motion.div>

            {/* Dynamic Shadow */}
            <motion.div
                animate={{ scale: [1, 0.8, 1], opacity: [0.5, 0.3, 0.5] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-6 w-28 h-6 bg-black/40 rounded-[100%] blur-lg"
            />
        </div>
    );
};
