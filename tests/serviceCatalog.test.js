const test = require('node:test');
const assert = require('node:assert/strict');
const { buildServiceCatalog, findMatchingCategory } = require('../utils/serviceCatalog');

const categories = [
  { _id: 'c1', name: 'MOT', icon: 'shield-check' },
  { _id: 'c2', name: 'Servicing' },
  { _id: 'c3', name: 'Tyres' },
  { _id: 'c4', name: 'Valeting' }
];

test('services are grouped under the Super Admin categories only', () => {
  const groups = buildServiceCatalog(categories, [
    { name: 'MOT Test (Class 4)', category: 'MOT', price: 45, duration: 45 },
    { name: 'Full Service', category: 'Servicing', price: 155, duration: 120 },
    { name: 'Tyre Replacement & Wheel Balancing', category: 'Tyre replacement', price: 30, duration: 30 },
    { name: 'Front Brake Pads', category: 'Brakes', price: 70 },
    { name: 'full service', category: 'Servicing', price: 1 },
    { name: 'Old Service', category: 'MOT', isActive: false }
  ]);

  assert.deepEqual(groups.map(g => g.name), ['MOT', 'Servicing', 'Tyres', 'Valeting']);
  assert.deepEqual(groups[0].services.map(s => s.name), ['MOT Test (Class 4)']);
  assert.equal(groups[1].services.length, 1, 'duplicate names are listed once');
  // Saved under the Super Admin's category name
  assert.equal(groups[2].services[0].category, 'Tyres');
  // No category for brakes, so it is not offered; a new category starts empty
  assert.ok(groups.every(g => g.services.every(s => s.name !== 'Front Brake Pads')));
  assert.deepEqual(groups[3].services, []);
});

test('findMatchingCategory matches exact names first, then the same leading word', () => {
  assert.equal(findMatchingCategory(categories, 'mot').name, 'MOT');
  assert.equal(findMatchingCategory(categories, 'Tyre replacement').name, 'Tyres');
  assert.equal(findMatchingCategory(categories, 'Brakes'), null);
  assert.equal(findMatchingCategory(categories, ''), null);
});
