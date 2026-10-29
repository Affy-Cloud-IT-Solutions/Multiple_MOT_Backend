const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getModelsForMake,
  checkModelRequirement,
  ModelLookupError,
  clearModelCache,
  UK_VEHICLE_MODELS
} = require('../services/vehicleModelService');
const Vehicle = require('../models/Vehicle');

const jsonResponse = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });
const failingFetch = async () => {
  throw new Error('network down');
};

test.beforeEach(() => clearModelCache());

test('UK makes missing from NHTSA (DACIA, SKODA, VAUXHALL, CUPRA) return models from the UK catalogue', async () => {
  for (const make of ['DACIA', 'SKODA', 'VAUXHALL', 'CUPRA']) {
    const result = await getModelsForMake(make, { fetchImpl: failingFetch });
    assert.equal(result.source, 'uk-catalogue');
    assert.ok(result.models.length > 0, `${make} should have models`);
  }
  const dacia = await getModelsForMake(' dacia ', { fetchImpl: failingFetch });
  assert.ok(dacia.models.includes('SANDERO'));
  assert.ok(dacia.models.includes('DUSTER'));
});

test('every catalogue make has a non-empty, de-duplicated, upper-case model list', () => {
  for (const [make, models] of Object.entries(UK_VEHICLE_MODELS)) {
    assert.ok(models.length > 0, make);
    assert.equal(new Set(models).size, models.length, `${make} has duplicates`);
    models.forEach(m => assert.equal(m, m.toUpperCase(), `${make}: ${m}`));
  }
});

test('non-catalogue makes use NHTSA with an exact make match (no substring junk)', async () => {
  const fetchImpl = jsonResponse({
    Results: [
      { Make_Name: 'RIVIAN', Model_Name: 'R1T' },
      { Make_Name: 'Rivian', Model_Name: 'R1S ' },
      { Make_Name: 'RIVIAN', Model_Name: 'R1T' },
      { Make_Name: 'RIVIAN TRAILERS LLC', Model_Name: 'JUNK' }
    ]
  });
  const result = await getModelsForMake('Rivian', { fetchImpl });
  assert.deepEqual(result, { models: ['R1S', 'R1T'], source: 'nhtsa' });
});

test('a make with genuinely no models returns an empty list (not an error)', async () => {
  const result = await getModelsForMake('OBSCURE MAKE', { fetchImpl: jsonResponse({ Count: 0, Results: [] }) });
  assert.deepEqual(result.models, []);
});

test('NHTSA failures and unexpected responses throw instead of looking like "no models"', async () => {
  await assert.rejects(getModelsForMake('RIVIAN', { fetchImpl: failingFetch }), ModelLookupError);
  await assert.rejects(getModelsForMake('RIVIAN', { fetchImpl: jsonResponse({}, false, 500) }), ModelLookupError);
  await assert.rejects(getModelsForMake('RIVIAN', { fetchImpl: jsonResponse({ message: 'oops' }) }), ModelLookupError);
});

test('checkModelRequirement: a selected model is always accepted', async () => {
  assert.deepEqual(await checkModelRequirement('DACIA', 'SANDERO', { fetchImpl: failingFetch }), {
    ok: true,
    modelNotListed: false
  });
});

test('checkModelRequirement: blank model is rejected when the make has models', async () => {
  const result = await checkModelRequirement('DACIA', '  ', { fetchImpl: failingFetch });
  assert.deepEqual(result, { ok: false, status: 400, error: 'Please select a vehicle model.' });
});

test('checkModelRequirement: blank model is accepted when the make genuinely has no models', async () => {
  const result = await checkModelRequirement('OBSCURE MAKE', '', { fetchImpl: jsonResponse({ Results: [] }) });
  assert.deepEqual(result, { ok: true, modelNotListed: true });
});

test('checkModelRequirement: blank model is rejected (503) when models could not be loaded', async () => {
  const result = await checkModelRequirement('OBSCURE MAKE', '', { fetchImpl: failingFetch });
  assert.equal(result.ok, false);
  assert.equal(result.status, 503);
});

test('Vehicle schema: model required unless modelNotListed is set', () => {
  const base = {
    customerId: '64b7f0f0f0f0f0f0f0f0f0f0',
    registrationNumber: 'AB12CDE',
    make: 'DACIA',
    motExpiryDate: new Date('2027-01-01')
  };
  const missing = new Vehicle({ ...base }).validateSync();
  assert.ok(missing && missing.errors.model, 'model should be required by default');

  const allowed = new Vehicle({ ...base, modelNotListed: true }).validateSync();
  assert.ok(!allowed || !allowed.errors.model, 'model should be optional when modelNotListed');

  const withModel = new Vehicle({ ...base, model: 'SANDERO' }).validateSync();
  assert.ok(!withModel || !withModel.errors.model);
});
