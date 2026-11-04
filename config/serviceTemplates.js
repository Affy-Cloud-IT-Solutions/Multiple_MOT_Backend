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
    description: 'DVSA Class 4 annual vehicle MOT test',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'MOT Test (Class 7)',
    category: 'MOT',
    price: 54.85,
    duration: 60,
    description: 'DVSA Class 7 commercial vehicle MOT test',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true
  },
  {
    name: 'Interim Service',
    category: 'Servicing',
    price: 85.00,
    duration: 60,
    description: 'Oil & filter change with safety check',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Full Service',
    category: 'Servicing',
    price: 155.00,
    duration: 120,
    description: 'Comprehensive 50+ point annual car service',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Major Service',
    category: 'Servicing',
    price: 220.00,
    duration: 180,
    description: 'Complete 24-month overhaul & fluid check',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true
  },
  {
    name: 'Engine Diagnostic & Fault Scan',
    category: 'Diagnostics',
    price: 50.00,
    duration: 45,
    description: 'OBD2 ECU fault code scan & report',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Front Brake Pads & Discs Replacement',
    category: 'Brakes',
    price: 130.00,
    duration: 60,
    description: 'Front brake pads & discs replacement',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Rear Brake Pads & Discs Replacement',
    category: 'Brakes',
    price: 120.00,
    duration: 60,
    description: 'Rear brake pads & discs replacement',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Tyre Replacement & Wheel Balancing',
    category: 'Tyre replacement',
    price: 65.00,
    duration: 45,
    description: 'Tyre fitting, balancing & new valve',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: '4-Wheel Laser Alignment (Tracking)',
    category: 'Tyre replacement',
    price: 45.00,
    duration: 40,
    description: 'Laser wheel alignment & tracking',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Exhaust System Inspection & Repair',
    category: 'Exhaust',
    price: 75.00,
    duration: 60,
    description: 'Exhaust, catalytic converter & pipe check',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'Air Conditioning Regas & Service (R134a)',
    category: 'Air Conditioning',
    price: 60.00,
    duration: 45,
    description: 'Air con regas & system leak test',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    isActive: true
  },
  {
    name: 'General Mechanical Repair & Inspection',
    category: 'Repairs',
    price: 65.00,
    duration: 60,
    description: 'Mechanical diagnostics & repair labor',
    availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    isActive: true
  }
];

module.exports = {
  STANDARD_SERVICE_CATEGORIES,
  STANDARD_SERVICE_TEMPLATES
};
