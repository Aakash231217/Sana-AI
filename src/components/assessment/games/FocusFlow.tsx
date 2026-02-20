"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TimeProvider } from "@/utils/assessment/TimeProvider";

/**
 * G1 — Focus Flow
 * Purpose: Sustained attention & lapse detection
 * Specs: 120 trials, 1.0s cycle (600ms stimulus + 400ms gap), 90 GO, 30 NOGO
 */

interface FocusFlowProps {
    onComplete: (
        trials: any[],
        metrics: { missRate: number; commissionRate: number }
    ) => void;
    config: {
        trials: number;
        cycleMs: number;
        stimulusMs: number;
        gapMs: number;
        goCount: number;
        noGoCount: number;
    };
}

type TrialType = "GO" | "NOGO";

export default function FocusFlow({ onComplete, config }: FocusFlowProps) {
    const [hasStarted, setHasStarted] = useState(false);
    const [trialIndex, setTrialIndex] = useState(0);
    const [currentStimulus, setCurrentStimulus] = useState<TrialType | null>(
        null
    );
    const [trialSequence, setTrialSequence] = useState<TrialType[]>([]);

    // Refs for tracking timing inside loops without re-rendering everything
    const trialData = useRef<any[]>([]);
    const currentTrialStartMs = useRef<number>(0);
    const hasRespondedThisTrial = useRef<boolean>(false);
    const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Generate sequence on mount
    useEffect(() => {
        const seq = Array(config.goCount)
            .fill("GO")
            .concat(Array(config.noGoCount).fill("NOGO"));
        // Shuffle
        for (let i = seq.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [seq[i], seq[j]] = [seq[j], seq[i]];
        }
        setTrialSequence(seq);
    }, [config]);

    const handleResponse = useCallback(() => {
        if (!currentStimulus || hasRespondedThisTrial.current) return;

        const rt = TimeProvider.elapsedSince(currentTrialStartMs.current);
        hasRespondedThisTrial.current = true;

        // Log immediately
        trialData.current[trialIndex] = {
            gameId: "G1_FocusFlow",
            trialIndex,
            trialStartMs: currentTrialStartMs.current,
            stimulusType: currentStimulus,
            rtMs: rt,
            correct: currentStimulus === "GO", // GO = correct to hit, NOGO = incorrect (Commission error)
        };
    }, [currentStimulus, trialIndex]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "Space") {
                e.preventDefault();
                handleResponse();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleResponse]);

    const endTask = useCallback(() => {
        setCurrentStimulus(null);
        const completedTrials = trialData.current;

        // Calculate basic metrics to pass up to engine
        const goTrials = completedTrials.filter((t) => t.stimulusType === "GO");
        const nogoTrials = completedTrials.filter((t) => t.stimulusType === "NOGO");

        const misses = goTrials.filter((t) => !t.hasResponded && !t.rtMs).length;
        const commissions = nogoTrials.filter((t) => !!t.rtMs).length;

        const missRate = misses / (config.goCount || 1);
        const commissionRate = commissions / (config.noGoCount || 1);

        onComplete(completedTrials, { missRate, commissionRate });
    }, [onComplete, config]);

    const runTrialCycle = useCallback(
        (index: number) => {
            if (index >= config.trials) {
                endTask();
                return;
            }

            setTrialIndex(index);
            const stim = trialSequence[index];
            setCurrentStimulus(stim);
            currentTrialStartMs.current = TimeProvider.now();
            hasRespondedThisTrial.current = false;

            // Ensure missed trials are logged at the end of the stimulus if no response
            trialData.current[index] = {
                gameId: "G1_FocusFlow",
                trialIndex: index,
                trialStartMs: currentTrialStartMs.current,
                stimulusType: stim,
                rtMs: null,
                correct: stim === "NOGO", // If they don't respond, it's correct strictly for NOGO
            };

            // Show stimulus for stimulusMs, then gap for gapMs
            cycleTimeoutRef.current = setTimeout(() => {
                setCurrentStimulus(null); // Enter gap phase
                cycleTimeoutRef.current = setTimeout(() => {
                    runTrialCycle(index + 1); // Next trial
                }, config.gapMs);
            }, config.stimulusMs);
        },
        [config, trialSequence, endTask]
    );

    useEffect(() => {
        return () => {
            if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
        };
    }, []);

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Focus Flow</h2>
                <p className="mb-6 text-gray-600 max-w-md">
                    Press SPACE or TAP the screen as fast as possible when you see the
                    <strong className="text-blue-600"> BLUE CIRCLE</strong>.
                    Do NOT press anything when you see the
                    <strong className="text-red-500"> RED CROSS</strong>.
                </p>
                <button
                    onClick={() => {
                        setHasStarted(true);
                        runTrialCycle(0);
                    }}
                    className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                    Start Task
                </button>
            </div>
        );
    }

    return (
        <div
            className="flex flex-col items-center justify-center w-full min-h-[500px] border border-gray-200 rounded-xl bg-gray-50 select-none cursor-pointer"
            onPointerDown={() => handleResponse()} // works fully offline and mobile via tap
        >
            <div className="w-full flex justify-between px-6 py-4 absolute top-0 text-sm text-gray-400">
                <span>Focus Flow</span>
                <span>{Math.min(trialIndex + 1, config.trials)} / {config.trials}</span>
            </div>

            {currentStimulus === "GO" && (
                <div className="w-32 h-32 rounded-full bg-blue-500 animate-in fade-in zoom-in duration-75" />
            )}

            {currentStimulus === "NOGO" && (
                <div className="w-32 h-32 flex items-center justify-center">
                    <svg className="w-24 h-24 text-red-500 animate-in fade-in zoom-in duration-75" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </div>
            )}

            {!currentStimulus && (
                <div className="w-32 h-32 flex items-center justify-center text-gray-400 text-3xl font-light">
                    +
                </div>
            )}
        </div>
    );
}
