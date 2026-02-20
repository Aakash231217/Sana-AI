"use client";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { TimeProvider } from "@/utils/assessment/TimeProvider";
import { MathUtils } from "@/utils/assessment/FFTUtils";

/**
 * G5 — Switch Smart
 * Purpose: Cognitive flexibility
 * Specs: 120 trials, 1.0s cycle, blocks of 20, 5 rule switches
 */

interface SwitchSmartProps {
    onComplete: (
        trials: any[],
        metrics: { switchCostMs: number; accuracy: number }
    ) => void;
    config: {
        trials: number;
        cycleMs: number;
        blocks: number;       // e.g. 6
        trialsPerBlock: number; // e.g. 20
        switches: number;     // e.g. 5
    };
}

type Rule = "COLOR" | "SHAPE";
type StimulusColor = "BLUE" | "RED";
type StimulusShape = "CIRCLE" | "SQUARE";

interface Stimulus {
    color: StimulusColor;
    shape: StimulusShape;
}

export default function SwitchSmart({ onComplete, config }: SwitchSmartProps) {
    const [hasStarted, setHasStarted] = useState(false);
    const [trialIndex, setTrialIndex] = useState(0);
    const [currentRule, setCurrentRule] = useState<Rule>("COLOR");
    const [currentStimulus, setCurrentStimulus] = useState<Stimulus | null>(null);

    const trialData = useRef<any[]>([]);
    const currentTrialStartMs = useRef<number>(0);
    const isSwitchTrial = useRef<boolean>(false);
    const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const endTask = useCallback(() => {
        setCurrentStimulus(null);

        // Calculate Switch Cost
        const switchTrials = trialData.current.filter(t => t.flags?.isSwitch);
        const nonSwitchTrials = trialData.current.filter(t => !t.flags?.isSwitch);

        const switchRts = switchTrials.map(t => t.rtMs).filter(Boolean) as number[];
        const nonSwitchRts = nonSwitchTrials.map(t => t.rtMs).filter(Boolean) as number[];

        const meanSwitchRt = MathUtils.getMean(switchRts);
        const meanNonSwitchRt = MathUtils.getMean(nonSwitchRts);

        const switchCostMs = meanSwitchRt - meanNonSwitchRt;

        const correctTrials = trialData.current.filter(t => t.correct).length;
        const accuracy = correctTrials / (config.trials || 1);

        onComplete(trialData.current, { switchCostMs, accuracy });
    }, [onComplete, config]);

    const runTrialCycle = useCallback(
        (index: number, activeRule: Rule) => {
            if (index >= config.trials) {
                endTask();
                return;
            }

            setTrialIndex(index);

            // Check for rule switch logic
            let newRule = activeRule;
            const isSwitch = index > 0 && index % config.trialsPerBlock === 0;
            if (isSwitch) {
                newRule = activeRule === "COLOR" ? "SHAPE" : "COLOR";
                setCurrentRule(newRule);
            }
            isSwitchTrial.current = isSwitch;

            // Generate random stimulus
            const stims = [
                { color: "BLUE", shape: "CIRCLE" },
                { color: "BLUE", shape: "SQUARE" },
                { color: "RED", shape: "CIRCLE" },
                { color: "RED", shape: "SQUARE" },
            ] as Stimulus[];
            const stim = stims[Math.floor(Math.random() * stims.length)];

            setCurrentStimulus(stim);
            currentTrialStartMs.current = TimeProvider.now();

            // Start cycle timeout
            cycleTimeoutRef.current = setTimeout(() => {
                // If timeout hits, they missed the trial
                if (!trialData.current[index]) {
                    trialData.current[index] = {
                        gameId: "G5_SwitchSmart",
                        trialIndex: index,
                        trialStartMs: currentTrialStartMs.current,
                        stimulusType: `${stim.color}_${stim.shape}`,
                        rtMs: null,
                        correct: false, // Omission is incorrect
                        flags: { rule: newRule, isSwitch },
                    };
                }
                setCurrentStimulus(null);

                // Slight gap before next naturally 
                setTimeout(() => runTrialCycle(index + 1, newRule), 200);

            }, config.cycleMs - 200); // cycle minus gap
        },
        [config, endTask]
    );

    const handleResponse = useCallback((choice: "LEFT" | "RIGHT") => {
        if (!currentStimulus) return;
        if (trialData.current[trialIndex]) return; // Already answered

        const rt = TimeProvider.elapsedSince(currentTrialStartMs.current);

        // Evaluate correctness based on rule mapping
        // COLOR RULE: BLUE -> Left, RED -> Right
        // SHAPE RULE: CIRCLE -> Left, SQUARE -> Right
        let isCorrect = false;
        if (currentRule === "COLOR") {
            isCorrect = (choice === "LEFT" && currentStimulus.color === "BLUE") ||
                (choice === "RIGHT" && currentStimulus.color === "RED");
        } else {
            isCorrect = (choice === "LEFT" && currentStimulus.shape === "CIRCLE") ||
                (choice === "RIGHT" && currentStimulus.shape === "SQUARE");
        }

        trialData.current[trialIndex] = {
            gameId: "G5_SwitchSmart",
            trialIndex,
            trialStartMs: currentTrialStartMs.current,
            stimulusType: `${currentStimulus.color}_${currentStimulus.shape}`,
            rtMs: rt,
            responseCode: choice,
            correct: isCorrect,
            flags: { rule: currentRule, isSwitch: isSwitchTrial.current },
        };

        // Give visual feedback and advance immediately to keep rhythm
        setCurrentStimulus(null);
        if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
        setTimeout(() => runTrialCycle(trialIndex + 1, currentRule), 200);

    }, [currentStimulus, currentRule, trialIndex, runTrialCycle]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === "ArrowLeft") handleResponse("LEFT");
            if (e.code === "ArrowRight") handleResponse("RIGHT");
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [handleResponse]);

    useEffect(() => {
        return () => {
            if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
        };
    }, []);

    if (!hasStarted) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] p-6 text-center">
                <h2 className="text-2xl font-bold mb-4">Switch Smart</h2>
                <div className="mb-6 text-gray-600 max-w-md space-y-4">
                    <p>The rule will change at the top of the screen between <strong>COLOR</strong> and <strong>SHAPE</strong>.</p>
                    <div className="grid grid-cols-2 gap-4 text-sm bg-gray-100 p-4 rounded text-left">
                        <div>
                            <strong>If COLOR Rule:</strong><br />
                            Blue = Left Arrow / Tap Left<br />
                            Red = Right Arrow / Tap Right
                        </div>
                        <div>
                            <strong>If SHAPE Rule:</strong><br />
                            Circle = Left Arrow / Tap Left<br />
                            Square = Right Arrow / Tap Right
                        </div>
                    </div>
                </div>
                <button
                    onClick={() => {
                        setHasStarted(true);
                        runTrialCycle(0, "COLOR");
                    }}
                    className="px-8 py-3 bg-black text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
                >
                    Start Task
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col items-center justify-center w-full min-h-[500px] border border-gray-200 rounded-xl bg-gray-50 select-none relative">
            <div className="w-full flex justify-between px-6 py-4 absolute top-0 text-sm text-gray-400">
                <span className={`font-bold uppercase tracking-widest ${currentRule === 'COLOR' ? 'text-indigo-600' : 'text-purple-600'}`}>
                    Wait for rule...
                </span>
                <span>{Math.min(trialIndex + 1, config.trials)} / {config.trials}</span>
            </div>

            <div className={`absolute top-16 text-2xl font-black uppercase tracking-[0.2em] transition-colors
        ${currentRule === 'COLOR' ? 'text-indigo-600' : 'text-purple-600'}
      `}>
                {currentRule} RULE
            </div>

            {/* Mobile tap zones */}
            <div
                className="absolute left-0 top-0 bottom-0 w-1/2 z-10 opacity-0 cursor-pointer"
                onPointerDown={() => handleResponse("LEFT")}
            />
            <div
                className="absolute right-0 top-0 bottom-0 w-1/2 z-10 opacity-0 cursor-pointer"
                onPointerDown={() => handleResponse("RIGHT")}
            />

            <div className="z-0">
                {currentStimulus ? (
                    currentStimulus.shape === "CIRCLE" ? (
                        <div className={`w-36 h-36 rounded-full ${currentStimulus.color === "BLUE" ? "bg-blue-500" : "bg-red-500"}`} />
                    ) : (
                        <div className={`w-36 h-36 rounded-lg ${currentStimulus.color === "BLUE" ? "bg-blue-500" : "bg-red-500"}`} />
                    )
                ) : (
                    <div className="w-36 h-36 border-4 border-dashed border-gray-200 rounded-lg" />
                )}
            </div>

            <div className="absolute bottom-8 w-full flex justify-between px-16 text-gray-400 font-medium">
                <div>{"<"} LEFT </div>
                <div> RIGHT {">"}</div>
            </div>
        </div>
    );
}
