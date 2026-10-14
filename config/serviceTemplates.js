/**
 * Standard UK Automotive Garage Service Catalog & Default Templates
 */

const STANDARD_SERVICE_CATEGORIES = [
  'MOT',
  'Servicing',
  'Repairs',
  'Tyre replacement',
  'Diagnostics',
  'Brakes',
  'Exhaust',
  'Air Conditioning',
  'Batteries & Electrical',
  'Custom'
];

const STANDARD_SERVICE_TEMPLATES = [
  {
    name: 'MOT Test (Class 4)',
    category: 'MOT',
    price: 45.00,
    duration: 45,
    description: 'Official DVSA Class 4 MOT Test for cars, light vans, and taxis (up to 8 passenger seats).',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'MOT Test (Class 7)',
    category: 'MOT',
    price: 54.85,
    duration: 60,
    description: 'Official DVSA Class 7 MOT Test for commercial vehicles between 3,000kg and 3,500kg gross weight.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true
  },
  {
    name: 'Interim Service',
    category: 'Servicing',
    price: 85.00,
    duration: 60,
    description: 'Recommended every 6 months or 6,000 miles. Includes engine oil & filter change, 25-point visual safety check, and fluid level top-ups.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Full Service',
    category: 'Servicing',
    price: 155.00,
    duration: 120,
    description: 'Comprehensive 50+ point inspection, engine oil & filter replacement, air filter, spark plugs / fuel filter check, brake fluid check, and suspension check.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Major Service',
    category: 'Servicing',
    price: 220.00,
    duration: 180,
    description: 'Ultimate 70+ point vehicle overhaul. Full replacement of engine oil, oil filter, air filter, pollen/cabin filter, fuel filter, spark plugs, and brake fluid change.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true
  },
  {
    name: 'Engine Diagnostic & Fault Scan',
    category: 'Diagnostics',
    price: 50.00,
    duration: 45,
    description: 'Full computerized OBD2 scan of engine management system, ABS, airbag, and transmission fault codes with live technician report.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Front Brake Pads & Discs Replacement',
    category: 'Brakes',
    price: 130.00,
    duration: 60,
    description: 'Supply and precision fitting of high-quality OEM front brake pads and discs, with brake caliper check and road test.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Rear Brake Pads & Discs Replacement',
    category: 'Brakes',
    price: 120.00,
    duration: 60,
    description: 'Fitting of rear brake pads and discs, handbrake adjustment, and hydraulic system safety check.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Tyre Replacement & Wheel Balancing',
    category: 'Tyre replacement',
    price: 65.00,
    duration: 45,
    description: 'Supply & fitment of premium / budget tyre, wheel balancing, new valve, and eco-friendly old tyre disposal.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: '4-Wheel Laser Alignment (Tracking)',
    category: 'Tyre replacement',
    price: 45.00,
    duration: 40,
    description: 'Computerized laser alignment check and adjustment to restore precise steering handling and prevent premature tyre wear.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Exhaust System Inspection & Repair',
    category: 'Exhaust',
    price: 75.00,
    duration: 60,
    description: 'Comprehensive exhaust integrity check, catalytic converter & silencer inspection, mounting bracket replacement, and emissions check.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Air Conditioning Regas & Service (R134a)',
    category: 'Air Conditioning',
    price: 60.00,
    duration: 45,
    description: 'Full evacuation of old refrigerant, system vacuum leak check, lubrication, and recharge with fresh R134a refrigerant gas.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'General Mechanical Repair & Inspection',
    category: 'Repairs',
    price: 65.00,
    duration: 60,
    description: 'Hourly mechanic diagnostic & repair labor for suspension, steering, cooling, or drivetrain issues.',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true
  }
];

module.exports = {
  STANDARD_SERVICE_CATEGORIES,
  STANDARD_SERVICE_TEMPLATES
};
