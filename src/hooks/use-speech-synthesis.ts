import { useState, useCallback, useEffect, useRef } from 'react';

export const useSpeechSynthesis = () => {
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
    const resumeIntervalRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            const updateVoices = () => {
                const availableVoices = window.speechSynthesis.getVoices();
                if (availableVoices.length > 0) {
                    setVoices(availableVoices);
                }
            };

            // Initial load
            updateVoices();
            
            // Chrome loads voices asynchronously
            window.speechSynthesis.onvoiceschanged = updateVoices;
            
            // Fallback: try again after a short delay (for browsers that don't fire onvoiceschanged)
            const timeout = setTimeout(updateVoices, 100);
            
            return () => {
                clearTimeout(timeout);
                if (resumeIntervalRef.current) {
                    clearInterval(resumeIntervalRef.current);
                }
            };
        }
    }, []);

    const speak = useCallback((text: string, lang = "en") => {
        if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
            console.warn('[SpeechSynthesis] Speech synthesis not supported in this browser');
            return;
        }

        // Don't speak empty text
        if (!text || text.trim().length === 0) {
            console.warn('[SpeechSynthesis] No text to speak');
            return;
        }

        // Cancel any ongoing speech and clear resume interval
        window.speechSynthesis.cancel();
        if (resumeIntervalRef.current) {
            clearInterval(resumeIntervalRef.current);
            resumeIntervalRef.current = null;
        }

        const utterance = new SpeechSynthesisUtterance(text);

        // Explicitly set the language on the utterance
        // using 'kn-IN' provides better hints to the browser engine than just 'kn'
        const targetLang = lang === 'kn' ? 'kn-IN' : lang;
        utterance.lang = targetLang;

        // Get fresh voices if needed
        const currentVoices = voices.length > 0 ? voices : window.speechSynthesis.getVoices();
        
        // Filter voices based on requested language
        let preferredVoice: SpeechSynthesisVoice | undefined;

        if (targetLang === "kn-IN") {
            preferredVoice = currentVoices.find(
                (v) => v.lang === "kn-IN" || v.name.toLowerCase().includes("kannada")
            );
        } else {
            // Prefer a nice English voice
            preferredVoice = currentVoices.find(
                (v) => (v.name.includes("Google US English") || v.name.includes("Samantha")) && v.lang.startsWith("en")
            ) || currentVoices.find((v) => v.lang.startsWith("en"));
        }

        if (preferredVoice) {
            utterance.voice = preferredVoice;
        } else {
            console.warn(`[SpeechSynthesis] No specific voice found for ${targetLang}. Relying on system default.`);
        }

        // Adjust rate/pitch for a more natural feel
        utterance.rate = 1.0;
        utterance.pitch = 1.0;

        utterance.onstart = () => {
            setIsSpeaking(true);
            
            // Chrome bug workaround: Chrome pauses speech after ~15 seconds
            // We need to call resume() periodically to keep it going
            resumeIntervalRef.current = setInterval(() => {
                if (window.speechSynthesis.speaking && !window.speechSynthesis.paused) {
                    window.speechSynthesis.pause();
                    window.speechSynthesis.resume();
                }
            }, 10000); // Every 10 seconds
        };
        
        utterance.onend = () => {
            setIsSpeaking(false);
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
                resumeIntervalRef.current = null;
            }
        };
        
        utterance.onerror = (e) => {
            // 'interrupted' and 'canceled' are not real errors - they happen when cancel() is called
            if (e.error !== 'interrupted' && e.error !== 'canceled') {
                console.error("[SpeechSynthesis] Error:", e.error, e);
            }
            setIsSpeaking(false);
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
                resumeIntervalRef.current = null;
            }
        };

        // Small delay before speaking to ensure everything is ready
        setTimeout(() => {
            window.speechSynthesis.speak(utterance);
        }, 50);
    }, [voices]);

    const cancel = useCallback(() => {
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            if (resumeIntervalRef.current) {
                clearInterval(resumeIntervalRef.current);
                resumeIntervalRef.current = null;
            }
        }
    }, []);

    // Check if speech synthesis is supported
    const hasSupport = typeof window !== 'undefined' && 'speechSynthesis' in window;

    return {
        isSpeaking,
        speak,
        cancel,
        hasSupport,
        voices // Expose voices for debugging if needed
    };
};
