"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TimeProvider } from "@/utils/assessment/TimeProvider";
import { MathUtils } from "@/utils/assessment/FFTUtils";

/**
 * G4 — Steady Speed
 * Purpose: Processing consistency
 * Specs: 100 trials, response-driven, 300ms gap
 */

interface SteadySpeedProps {
    onComplete: (
        trials: any[],
        metrics: { cv: number; meanRt: number }
    ) => void;
    config: {
        trials: number;
        gapMs: number;
        maxWaitMs: number;
    };
}

export default function SteadySpeed({ onComplete, config }: SteadySpeedProps) {
    const [hasStarted, setHasStarted] = useState(false);
    const [trialIndex, setTrialIndex] = useState(0);
    const [isStimulusVisible, setIsStimulusVisible] = useState(false);

    const trialData = useRef<any[]>([]);
    const currentTrialStartMs = useRef<number>(0);
    const hasRespondedThisTrial = useRef<boolean>(false);
    const stateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const endTask = useCallback(() => {
        setIsStimulusVisible(false);

        // Calculate CV and Mean RT strictly from valid responses
        const validRts = trialData.current
            .map(t => t.rtMs)
            .filter((rt): rt is number => rt !== null);

        const meanRt = MathUtils.getMean(validRts);

        // Standard Deviation calculation for CV
        let cv = 0;
        if (validRts.length > 1 && meanRt > 0) {
            const squaredDiffs = validRts.map(rt => Math.pow(rt - meanRt, 2));
            const variance = MathUtils.getMean(squaredDiffs);
            const stdDev = Math.sqrt(variance);
            cv = stdDev / meanRt; // Coefficient of Variation
        }

        onComplete(trialData.current, { meanRt, cv });
    }, [onComplete]);

    const showNextStimulus = useCallback((index: number) => {
        if (index >= config.trials) {
            endTask();
            return;
        }

        setTrialIndex(index);
        hasRespondedThisTrial.current = false;

        // 300ms fixed gap before stimulus appears
        stateTimeoutRef.current = setTimeout(() => {
            setIsStimulusVisible(true);
            currentTrialStartMs.current = TimeProvider.now();

            // If they don't respond within maxWaitMs, force next trial as a miss
            stateTimeoutRef.current = setTimeout(() => {
                if (!hasRespondedThisTrial.current) {
                    trialData.current[index] = {
                        gameId: "G4_SteadySpeed",
                        trialIndex: index,
                        trialStartMs: currentTrialStartMs.current,
                        stimulusType: "SIMPLE_RT",
                        rtMs: null,
                        correct: false,
                    };
                    setIsStimulusVisible(false);
                    showNextStimulus(index + 1);
                }
            }, config.maxWaitMs);

        }, config.gapMs);
    }, [config, endTask]);

    const handleResponse = useCallback(() => {
        if (!isStimulusVisible || hasRespondedThisTrial.current) return;

        const rt = TimeProvider.elapsedSince(currentTrialStartMs.current);
        hasRespondedThisTrial.current = true;

        if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
        setIsStimulusVisible(false);

        trialData.current[trialIndex] = {
            gameId: "G4_SteadySpeed",
            trialIndex,
            trialStartMs: currentTrialStartMs.current,
            stimulusType: "SIMPLE_RT",
            rtMs: rt,
            correct: true,
        };

        // Immediately schedule next trial since it's response-driven
        showNextStimulus(trialIndex + 1);
    }, [isStimulusVisible, trialIndex, showNextStimulus]);

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

    useEffect(() => {
        return () => {
            if (stateTimeoutRef.current) clearTimeout(stateTimeoutRef.current);
        };
    }, []);

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Steady Speed</h2>
                <p className="mb-6 text-gray-600 max-w-md">
                    Press SPACE or TAP exactly when the STAR appears.<br />
                    Keep a steady, consistent rhythm.
                </p>
                <button
                    onClick={() => {
                        setHasStarted(true);
                        showNextStimulus(0);
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
                <span>Steady Speed</span>
                <span>{Math.min(trialIndex + 1, config.trials)} / {config.trials}</span>
            </div>

            {isStimulusVisible ? (
                <div className="text-yellow-400 animate-in zoom-in duration-75">
                    <svg className="w-40 h-40 fill-current drop-shadow-md" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                </div>
            ) : (
                <div className="w-40 h-40 flex items-center justify-center opacity-0"></div>
            )}
        </div>
    );
}
