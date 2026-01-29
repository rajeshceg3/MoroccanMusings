import { locations } from '../js/data.js';

console.log('Verifying js/data.js integrity...');

const intentions = ['serenity', 'vibrancy', 'awe', 'legacy'];
const times = ['dawn', 'midday', 'dusk', 'night'];
const regions = {
    serenity: 'coast',
    vibrancy: 'medina',
    awe: 'sahara',
    legacy: 'kasbah'
};

let errors = 0;
let count = 0;

intentions.forEach(intention => {
    times.forEach(time => {
        const key = `${intention}.${regions[intention]}.${time}`;
        if (!locations[key]) {
            console.error(`MISSING KEY: ${key}`);
            errors++;
        } else {
            const loc = locations[key];
            if (!loc.title) { console.error(`Missing title for ${key}`); errors++; }
            if (!loc.narrative) { console.error(`Missing narrative for ${key}`); errors++; }
            if (!loc.sensory) { console.error(`Missing sensory for ${key}`); errors++; }
            count++;
        }
    });
});

if (errors === 0) {
    console.log(`SUCCESS: All ${count} entries verified.`);
    process.exit(0);
} else {
    console.error(`FAILURE: Found ${errors} errors.`);
    process.exit(1);
}
