export const locations = {
    "serenity.coast.dawn": {
        title: "Essaouira Ramparts",
        subtitle: "The Wind City of Africa",
        image: "assets/images/essaouira.svg",
        narrative: "As the first light kisses the ancient stone, the Skala de la Ville awakens. Here, the salt of the Atlantic spray mingles with the centuries-old scent of thuya wood. The cry of gulls is the only music, a timeless score for the slow dance of fishing boats on the horizon.",
        coordinates: { x: 25, y: 55 },
        sensory: {
            sight: { desc: "The cool, oceanic blue of the fishing boats against the warm, sandstone ramparts.", color: "#4a7c82" },
            sound: { desc: "The piercing calls of seagulls and the rhythmic crash of waves against stone.", audio: "assets/audio/essaouira.mp3" },
            scent: { desc: "Salt in the air, the dry aroma of historic wood, a hint of diesel from the port." },
            touch: { desc: "The rough, gritty texture of the fortress walls, cool under the morning sun." }
        },
        foundation: "Open from sunrise. Access is free. The best light for photography is within the first two hours after dawn. Wear layers; the wind is a constant companion."
    },
    "vibrancy.medina.midday": {
        title: "Fes el-Bali Souk",
        subtitle: "The Labyrinth of Time",
        image: "assets/images/fes.svg",
        narrative: "To enter the Fes medina at noon is to step out of time. Light filters through reed-covered alleys, illuminating a million moments at once. The air is thick with the scent of spices, the clang of the coppersmith's hammer, and the murmur of a thousand conversations. It is not a place you see, but a place you feel in your bones.",
        coordinates: { x: 60, y: 30 },
        sensory: {
            sight: { desc: "The deep, earthy ochre of piled spices and dyed leather.", color: "#c67605" },
            sound: { desc: "The rhythmic tapping of metalworkers, the call of vendors, the hum of the crowd.", audio: "assets/audio/fes.mp3" },
            scent: { desc: "Cumin and saffron, cedarwood, mint tea, the pungent smell of the tanneries." },
            touch: { desc: "The smooth coolness of a brass tray, the soft pile of a carpet, the jostle of the crowd." }
        },
        foundation: "The medina is always open, but most shops operate from 10 AM to 7 PM. It is wise to hire a guide for your first visit. Getting lost is part of the experience, but finding your way out is the goal."
    },
    "awe.sahara.dusk": {
        title: "Erg Chebbi Dunes",
        subtitle: "The Sea of Sand",
        image: "assets/images/sahara.svg",
        narrative: "As the sun bleeds across the horizon, the Sahara performs its final, silent act of the day. The dunes, sculpted by wind and time, turn from gold to rose to deep violet. The world is reduced to two elements: the infinite sand beneath you and the infinite stars beginning to prick the sky above. Here, silence has a sound.",
        coordinates: { x: 75, y: 75 },
        sensory: {
            sight: { desc: "The impossible gradient of the sunset, from fiery orange to the deepest indigo.", color: "#b85b47" },
            sound: { desc: "The profound silence, broken only by the whisper of wind across sand.", audio: "assets/audio/sahara.mp3" },
            scent: { desc: "The clean, dry scent of sand, the faint warmth of the cooling earth." },
            touch: { desc: "The fine, soft grains of sand slipping through your fingers, still warm from the day's heat." }
        },
        foundation: "Access is typically via 4x4 or camel trek from Merzouga. A guided overnight stay in a desert camp is the definitive experience. The temperature drops sharply after sunset."
    },
};
