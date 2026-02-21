
// Tactical Shim for Node.js Test Environment
// Polyfills browser globals required for UI/Engine testing

import { webcrypto } from 'node:crypto';

// Strict polyfill for Node 18 (and others)
if (!globalThis.crypto) {
    globalThis.crypto = webcrypto;
}
if (!global.crypto) {
    global.crypto = webcrypto;
}

if (!global.window) {
    global.window = {
        crypto: global.crypto,
        dispatchEvent: (event) => {},
        addEventListener: () => {},
        removeEventListener: () => {},
        location: { hostname: 'localhost' },
        innerWidth: 1024,
        innerHeight: 768,
    };
}

if (!global.document) {
    global.document = {
        createElement: (tag) => ({
            classList: { add: ()=>{}, remove: ()=>{} },
            setAttribute: ()=>{},
            appendChild: ()=>{},
            style: {},
            addEventListener: ()=>{},
            replaceChildren: ()=>{},
            textContent: '',
            innerHTML: '',
            tagName: tag.toUpperCase()
        }),
        createTextNode: (text) => ({ textContent: text }), // Added
        getElementById: () => null,
        body: {
            appendChild: ()=>{},
            classList: { add: ()=>{}, remove: ()=>{} }
        },
        dispatchEvent: () => {},
        querySelector: () => null,
        querySelectorAll: () => [],
    };
}

// Always force CustomEvent polyfill to ensure consistent behavior across Node versions
global.CustomEvent = class CustomEvent {
    constructor(type, options = {}) {
        this.type = type;
        this.detail = options.detail;
    }
};

if (!global.localStorage) {
    let store = {};
    global.localStorage = {
        getItem: (key) => store[key] || null,
        setItem: (key, value) => { store[key] = value.toString(); },
        removeItem: (key) => { delete store[key]; },
        clear: () => { store = {}; }
    };
}
