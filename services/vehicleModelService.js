const UK_VEHICLE_MODELS = require('../data/ukVehicleModels.json');

// NHTSA vPIC is a US database: it has no data for many UK makes (DACIA, SKODA, VAUXHALL, CUPRA...)
// and matches make names by substring (SEAT -> "SEATTLE TINY HOMES"). UK makes are therefore served
// from the curated catalogue above and vPIC is only used, with an exact make match, for anything else.
const NHTSA_MODELS_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/getmodelsformake/';
const NHTSA_TIMEOUT_MS = 8000;
const NHTSA_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours

const nhtsaCache = new Map(); // make -> { models, fetchedAt }

class ModelLookupError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ModelLookupError';
  }
}

const normalizeMake = (make) => (typeof make === 'string' ? make.trim().toUpperCase() : '');

async function fetchNhtsaModels(make, fetchImpl) {
  const cached = nhtsaCache.get(make);
  if (cached && Date.now() - cached.fetchedAt < NHTSA_CACHE_DURATION) return cached.models;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), NHTSA_TIMEOUT_MS);
  let data;
  try {
    const response = await fetchImpl(`${NHTSA_MODELS_URL}${encodeURIComponent(make)}?format=json`, {
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    data = await response.json();
  } catch (err) {
    throw new ModelLookupError(`Failed to fetch models from NHTSA API: ${err.message}`);
  } finally {
    clearTimeout(timeoutId);
  }

  if (!data || !Array.isArray(data.Results)) {
    throw new ModelLookupError('Unexpected response from NHTSA API.');
  }

  const models = [...new Set(
    data.Results
      .filter(r => normalizeMake(r.Make_Name) === make)
      .map(r => (r.Model_Name ? r.Model_Name.trim().toUpperCase() : ''))
      .filter(Boolean)
  )].sort();

  nhtsaCache.set(make, { models, fetchedAt: Date.now() });
  return models;
}

/**
 * Returns every known model for a make: { models, source }.
 * Throws ModelLookupError when the model list could not be retrieved - callers must not
 * treat that as "this make has no models".
 */
async function getModelsForMake(make, { fetchImpl = fetch } = {}) {
  const key = normalizeMake(make);
  if (!key) return { models: [], source: 'none' };
  if (UK_VEHICLE_MODELS[key]) {
    return { models: [...UK_VEHICLE_MODELS[key]], source: 'uk-catalogue' };
  }
  return { models: await fetchNhtsaModels(key, fetchImpl), source: 'nhtsa' };
}

/**
 * Decides whether a vehicle may be saved with the given model.
 * A blank model is only accepted when the make genuinely has no models in the data source;
 * if availability can't be determined, the request is rejected rather than guessed.
 * Returns { ok: true, modelNotListed } or { ok: false, status, error }.
 */
async function checkModelRequirement(make, model, options) {
  if (typeof model === 'string' && model.trim()) return { ok: true, modelNotListed: false };

  let result;
  try {
    result = await getModelsForMake(make, options);
  } catch (err) {
    return {
      ok: false,
      status: 503,
      error: 'We could not confirm the available models for this make right now. Please try again.'
    };
  }
  if (result.models.length > 0) {
    return { ok: false, status: 400, error: 'Please select a vehicle model.' };
  }
  return { ok: true, modelNotListed: true };
}

const clearModelCache = () => nhtsaCache.clear();

module.exports = {
  getModelsForMake,
  checkModelRequirement,
  ModelLookupError,
  clearModelCache,
  UK_VEHICLE_MODELS
};
