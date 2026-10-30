const test = require('node:test');
const assert = require('node:assert/strict');
const dvsaService = require('../services/dvsaService');
const { lookupDVLA } = require('../controllers/vehicleController');

const originalLookup = dvsaService.getVehicleMotHistory;
test.after(() => {
  dvsaService.getVehicleMotHistory = originalLookup;
});

async function callLookup(vrn, dvsaRecord) {
  dvsaService.getVehicleMotHistory = async () => dvsaRecord;
  let statusCode = 200;
  let body = null;
  const res = {
    status(code) { statusCode = code; return this; },
    json(payload) { body = payload; return this; }
  };
  await lookupDVLA({ params: { vrn } }, res);
  return { statusCode, body };
}

test('a car under 3 years old returns its first MOT due date and real details, nothing guessed', async () => {
  // Exact DVSA response shape for a new vehicle (DP25LAA)
  const { statusCode, body } = await callLookup('DP25LAA', {
    registration: 'DP25LAA',
    make: 'HYUNDAI',
    model: 'KONA ADVANCE EV',
    fuelType: 'Electric',
    primaryColour: 'Blue',
    registrationDate: '2025-05-31',
    manufactureDate: '2025-05-31',
    manufactureYear: '2025',
    motTestDueDate: '2028-05-30',
    hasOutstandingRecall: 'Unknown'
  });

  assert.equal(statusCode, 200);
  const v = body.vehicle;
  assert.equal(v.year, 2025);
  assert.equal(v.fuelType, 'Electric');
  assert.equal(v.color, 'Blue');
  assert.equal(v.engineSize, '');
  assert.equal(v.registrationDate, '2025-05-31');
  assert.equal(v.motTestDueDate, '2028-05-30');
  assert.equal(v.motStatus, 'Not Yet Due');
  assert.equal(v.motExpiryDate, '2028-05-30');
  assert.deepEqual(v.motTests, []);
});

test('a car with tests uses its latest test, and missing fields stay empty', async () => {
  const { body } = await callLookup('AB12CDE', {
    registration: 'AB12CDE',
    make: 'FORD',
    model: 'FOCUS',
    firstUsedDate: '2012.03.01',
    motTests: [{ testResult: 'PASSED', expiryDate: '2027-03-01', completedDate: '2026-02-20', motTestNumber: '123', odometerValue: '50000', odometerUnit: 'MI' }]
  });

  const v = body.vehicle;
  assert.equal(v.year, 2012);
  assert.equal(v.motStatus, 'Valid');
  assert.equal(v.motExpiryDate, '2027-03-01');
  assert.equal(v.motTestDueDate, '');
  assert.equal(v.color, '');
  assert.equal(v.fuelType, '');
  assert.equal(v.engineSize, '');
});
