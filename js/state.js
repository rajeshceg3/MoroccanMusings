/**
 * @typedef {Object} AppState
 * @property {string|null} intention - Selected intention
 * @property {string|null} region - Derived region
 * @property {string|null} time - Selected time
 * @property {'splash'|'astrolabe'|'riad'|'tapestry'} activeScreen - Current screen
 * @property {Object|null} activeLocation - Current location data
 * @property {boolean} isWeaving - Lock for weaving animation
 * @property {number[]} selectedThreads - Indices of selected threads
 * @property {boolean} isHorizonActive - Horizon visualization toggle
 * @property {boolean} isMapActive - Map/Overwatch toggle
 * @property {boolean} isSynapseActive - Neural Graph toggle
 * @property {boolean} isCitadelActive - Citadel Mode toggle
 */

/** @type {AppState} */
export const state = {
    intention: null,
    region: null,
    time: null,
    activeScreen: 'splash',
    activeLocation: null,
    isWeaving: false,
    selectedThreads: [], // Array of indices
    isHorizonActive: false,
    isMapActive: false,
    isSynapseActive: false,
    isCitadelActive: false
};
