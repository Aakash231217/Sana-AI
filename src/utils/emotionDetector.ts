/**
 * Emotion types supported by the 3D mascot
 */
export type MascotEmotion =
    | 'idle'
    | 'thinking'
    | 'speaking'
    | 'happy'
    | 'excited'
    | 'confused'
    | 'encouraging'
    | 'celebrating'
    | 'listening';

/**
 * Keyword patterns for detecting emotions from AI responses
 */
const EMOTION_PATTERNS: Record<MascotEmotion, RegExp[]> = {
    celebrating: [
        /congratulations?/i,
        /well done/i,
        /excellent/i,
        /perfect/i,
        /amazing/i,
        /fantastic/i,
        /great job/i,
        /you did it/i,
        /correct!/i,
        /🎉|🎊|🏆|⭐/,
    ],
    excited: [
        /exciting/i,
        /awesome/i,
        /incredible/i,
        /wow/i,
        /brilliant/i,
        /🚀|💥|✨|🔥/,
    ],
    encouraging: [
        /you can do/i,
        /don't give up/i,
        /keep trying/i,
        /you're close/i,
        /almost there/i,
        /good effort/i,
        /nice try/i,
        /let's try again/i,
        /💪|👍|🌟/,
    ],
    confused: [
        /i'm not sure/i,
        /could you clarify/i,
        /what do you mean/i,
        /can you explain/i,
        /i don't understand/i,
        /\?{2,}/,
    ],
    happy: [
        /happy to help/i,
        /glad/i,
        /pleasure/i,
        /wonderful/i,
        /great question/i,
        /😊|😄|🙂|💫/,
    ],
    listening: [],
    idle: [],
    thinking: [],
    speaking: [],
};

/**
 * Priority order for emotion detection (first match wins)
 */
const EMOTION_PRIORITY: MascotEmotion[] = [
    'celebrating',
    'excited',
    'encouraging',
    'confused',
    'happy',
];

/**
 * Detects the appropriate emotion from AI response text
 * @param text - The AI response text to analyze
 * @returns The detected emotion, defaults to 'happy' for general responses
 */
export function detectEmotion(text: string): MascotEmotion {
    if (!text || text.trim().length === 0) {
        return 'idle';
    }

    // Check each emotion pattern in priority order
    for (const emotion of EMOTION_PRIORITY) {
        const patterns = EMOTION_PATTERNS[emotion];
        for (const pattern of patterns) {
            if (pattern.test(text)) {
                return emotion;
            }
        }
    }

    // Default to happy for general positive responses
    return 'happy';
}

/**
 * Returns a random emotion for click interactions
 */
export function getRandomClickEmotion(): MascotEmotion {
    const clickEmotions: MascotEmotion[] = ['happy', 'excited', 'celebrating'];
    return clickEmotions[Math.floor(Math.random() * clickEmotions.length)];
}
