/**
 * Evaluates cognitive indices and generates non-diagnostic strategies.
 * Output is entirely rule-based and avoids medical terminologies.
 */

export class PrescriptionEngine {
    static generatePlan(indices: {
        ASI: number;
        ICI: number;
        WME: number;
        PCI: number;
        CFI: number;
        priorityDomain: string;
    }): { primaryFocus: string; strategies: string[]; retestDays: number } {
        let strategies: string[] = [];
        const focus = indices.priorityDomain;

        if (focus === "Sustained Attention") {
            strategies = [
                "Break large tasks into 15-minute intervals with required physical movement between.",
                "Use visual timers to make the passage of time concrete during independent work.",
                "Provide immediate, high-frequency feedback during challenging tasks.",
            ];
        } else if (focus === "Impulse Control") {
            strategies = [
                "Implement 'Stop-Think-Act' verbalization before answering in class.",
                "Provide a quiet fidget tool to channel physical restlessness during prolonged listening.",
                "Seat near instruction to reduce visual and auditory distractions.",
            ];
        } else if (focus === "Working Memory") {
            strategies = [
                "Provide multi-step instructions one step at a time, checking for understanding after each.",
                "Use visual checklists for daily routines and complex assignments.",
                "Allow use of a 'memory buddy' or reference card for key formulas and rules.",
            ];
        } else if (focus === "Processing Speed") {
            strategies = [
                "Reduce volume of repetitive work; prioritize mastery over completion speed.",
                "Provide extended time for complex reading or writing tasks.",
                "Allow verbal responses or audio recordings in place of extensive written work.",
            ];
        } else {
            // Cognitive Flexibility
            strategies = [
                "Provide a concrete 5-minute warning before major transitions.",
                "Use 'First/Then' boards to map out changes in schedule.",
                "Explicitly teach multiple ways to solve a problem to build adaptable thinking.",
            ];
        }

        return {
            primaryFocus: focus,
            strategies,
            retestDays: 28, // Standard protocol: 28 days retest
        };
    }
}
