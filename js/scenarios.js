export const scenarios = {
    "DAEDALUS-01": {
        id: "DAEDALUS-01",
        title: "OPERATION: BROKEN ARROW",
        description: "CRITICAL SYSTEM FAILURE DETECTED. The narrative matrix has destabilized due to a surge of discordant 'Legacy' threads. Restore balance to the system.",
        difficulty: "HARD",
        initialThreads: [
            { intention: 'legacy', region: 'atlas', time: 'night', title: 'Fractured Memory', content: 'The old ways crumble under the weight of time.' },
            { intention: 'legacy', region: 'atlas', time: 'night', title: 'Forgotten Oath', content: 'Words spoken in darkness fade.' },
            { intention: 'legacy', region: 'atlas', time: 'night', title: 'Broken Stone', content: 'The foundation cracks.' },
            { intention: 'legacy', region: 'atlas', time: 'night', title: 'Silent Keep', content: 'No one watches the walls.' },
            { intention: 'serenity', region: 'coast', time: 'dawn', title: 'Faint Hope', content: 'A whisper of calm.' }
        ],
        objectives: [
            { type: 'BALANCE', target: 50, comparator: '>=' },
            { type: 'DEFCON', target: 4, comparator: '>=' } // Higher is better (Peace=5)
        ],
        constraints: {
            timeLimit: 120 // 2 minutes
        }
    },
    "DAEDALUS-02": {
        id: "DAEDALUS-02",
        title: "OPERATION: SILENT NIGHT",
        description: "Stealth Training. Weave a pattern of Serenity without triggering Sentinel alerts. Maintain low thread count.",
        difficulty: "MEDIUM",
        initialThreads: [
            { intention: 'awe', region: 'sahara', time: 'dusk', title: 'Distant Thunder', content: 'A storm approaches.' }
        ],
        objectives: [
            { type: 'THREAD_COUNT', target: 5, comparator: '>=' },
            { type: 'DEFCON', target: 5, comparator: '==' }
        ],
        constraints: {
            timeLimit: 60
        }
    },
    "DAEDALUS-03": {
        id: "DAEDALUS-03",
        title: "OPERATION: RED DAWN",
        description: "Interception Drill. Hostile anomalies detected. Deploy Vanguard units to intercept threats before they destabilize the region.",
        difficulty: "EXTREME",
        initialThreads: [
            { intention: 'vibrancy', region: 'medina', time: 'midday', title: 'Market Noise', content: 'Chaos in the streets.' },
            { intention: 'vibrancy', region: 'medina', time: 'midday', title: 'Riot', content: 'Unrest grows.' },
            { intention: 'vibrancy', region: 'medina', time: 'midday', title: 'Surge', content: 'The crowd moves.' }
        ],
        objectives: [
            { type: 'THREAT_COUNT', target: 0, comparator: '==' }
        ],
        constraints: {
            timeLimit: 90
        }
    }
};
