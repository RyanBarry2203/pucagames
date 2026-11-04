// Shared with the modules around the 3D hero without loading three.js: journey.js animates `fly`, and the flat
// fallback layers (sky.js, fog.js) stop drawing once `active` says the 3D world has taken over.
export const world = { fly: 0, active: false };
