"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TimeProvider } from "@/utils/assessment/TimeProvider";

/**
 * G2 — Stop & Go
 * Purpose: Impulse control & instability
 * Specs: 100 trials, 1.0s cycle (500ms stimulus + 500ms gap), 70 GO, 30 NOGO
 */

interface StopAndGoProps {
    onComplete: (
        trials: any[],
        metrics: { commissionRate: number }
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

export default function StopAndGo({ onComplete, config }: StopAndGoProps) {
    const [hasStarted, setHasStarted] = useState(false);
    const [trialIndex, setTrialIndex] = useState(0);
    const [currentStimulus, setCurrentStimulus] = useState<TrialType | null>(
        null
    );
    const [trialSequence, setTrialSequence] = useState<TrialType[]>([]);

    const trialData = useRef<any[]>([]);
    const currentTrialStartMs = useRef<number>(0);
    const hasRespondedThisTrial = useRef<boolean>(false);
    const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        const seq = Array(config.goCount)
            .fill("GO")
            .concat(Array(config.noGoCount).fill("NOGO"));
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

        trialData.current[trialIndex] = {
            gameId: "G2_StopAndGo",
            trialIndex,
            trialStartMs: currentTrialStartMs.current,
            stimulusType: currentStimulus,
            rtMs: rt,
            correct: currentStimulus === "GO",
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

        const nogoTrials = completedTrials.filter((t) => t.stimulusType === "NOGO");
        const commissions = nogoTrials.filter((t) => !!t.rtMs).length;
        const commissionRate = commissions / (config.noGoCount || 1);

        onComplete(completedTrials, { commissionRate });
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

            trialData.current[index] = {
                gameId: "G2_StopAndGo",
                trialIndex: index,
                trialStartMs: currentTrialStartMs.current,
                stimulusType: stim,
                rtMs: null,
                correct: stim === "NOGO",
            };

            cycleTimeoutRef.current = setTimeout(() => {
                setCurrentStimulus(null);
                cycleTimeoutRef.current = setTimeout(() => {
                    runTrialCycle(index + 1);
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
                <h2 className="text-2xl font-bold mb-4">Stop & Go</h2>
                <p className="mb-6 text-gray-600 max-w-md">
                    Press SPACE or TAP when the <strong className="text-green-500">CAR is GREEN</strong>.<br />
                    Do <strong className="text-red-500 underline">NOT</strong> press when it turns <strong className="text-red-500">RED</strong>.
                    <br /><br />
                    It will move fast. Keep your hands ready.
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
            onPointerDown={() => handleResponse()}
        >
            <div className="w-full flex justify-between px-6 py-4 absolute top-0 text-sm text-gray-400">
                <span>Stop & Go</span>
                <span>{Math.min(trialIndex + 1, config.trials)} / {config.trials}</span>
            </div>

            {currentStimulus === "GO" && (
                <div className="w-40 h-24 rounded-lg bg-green-500 animate-in fade-in duration-75 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    GO
                </div>
            )}

            {currentStimulus === "NOGO" && (
                <div className="w-40 h-24 rounded-lg bg-red-500 animate-in fade-in duration-75 flex items-center justify-center text-white font-bold text-xl shadow-lg">
                    STOP
                </div>
            )}
        </div>
    );
}
