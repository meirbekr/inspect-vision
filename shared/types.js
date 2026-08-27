/**
 * @typedef {Object} BoundingBox
 * @property {number} x
 * @property {number} y
 * @property {number} width
 * @property {number} height
 */

/**
 * @typedef {Object} Defect
 * @property {string} type - "scratch", "dent", "crack", etc.
 * @property {number} confidence - 0.0 to 1.0
 * @property {BoundingBox} boundingBox
 */

/**
 * @typedef {Object} InspectionResult
 * @property {string} inspectionId
 * @property {string} timestamp
 * @property {string} imageUrl
 * @property {Defect[]} defects
 * @property {number} totalDefects
 * @property {string} status - "passed" or "failed"
 * @property {number} severityScore
 */

export {}; // Make it a module
