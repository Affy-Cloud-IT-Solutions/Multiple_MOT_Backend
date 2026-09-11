const mongoose = require('mongoose');
const Garage = require('./models/Garage');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/multi-mot-database';

async function updateGarageLocations() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB at', MONGO_URI);

  const updates = [
    {
      name: 'Apex MOT & Service Centre',
      address: '10 Industrial Estate, London Road, London, SE1 7PB',
      city: 'London',
      postcode: 'SE1 7PB',
      latitude: 51.5014,
      longitude: -0.0910,
      status: 'Approved'
    },
    {
      name: 'Prestige Auto Care',
      address: '88 Station Road, Manchester, M1 2WD',
      city: 'Manchester',
      postcode: 'M1 2WD',
      latitude: 53.4808,
      longitude: -2.2426,
      status: 'Approved'
    },
    {
      name: 'Cornerstone Garage',
      address: '4 The Mews, Great Charles St, Birmingham, B3 2KL',
      city: 'Birmingham',
      postcode: 'B3 2KL',
      latitude: 52.4862,
      longitude: -1.8904,
      status: 'Approved'
    },
    {
      name: 'Camden & North London MOT Bay',
      address: '14 Chalk Farm Road, Camden, London, NW1 8NH',
      city: 'London',
      postcode: 'NW1 8NH',
      latitude: 51.5414,
      longitude: -0.1444,
      rating: 4.9,
      status: 'Approved'
    },
    {
      name: 'Yorkshire Master Auto & MOT',
      address: '5 Wellington St, Leeds, LS1 4DY',
      city: 'Leeds',
      postcode: 'LS1 4DY',
      latitude: 53.7968,
      longitude: -1.5489,
      rating: 4.8,
      status: 'Approved'
    },
    {
      name: 'Prime Auto Repair',
      address: '15 High Street, London, SE1 7PB',
      city: 'London',
      postcode: 'SE1 7PB',
      latitude: 51.4980,
      longitude: -0.0880,
      status: 'Approved'
    },
    {
      name: 'Apex Motor Works',
      address: '22 King\'s Road, Chelsea, London, SW3 4TZ',
      city: 'London',
      postcode: 'SW3 4TZ',
      latitude: 51.4880,
      longitude: -0.1650,
      status: 'Approved'
    }
  ];

  for (const item of updates) {
    const res = await Garage.updateMany(
      { name: item.name },
      { 
        $set: {
          address: item.address,
          city: item.city,
          postcode: item.postcode,
          latitude: item.latitude,
          longitude: item.longitude,
          status: item.status,
          ...(item.rating ? { rating: item.rating } : {})
        }
      }
    );
    console.log(`Updated ${item.name}: matched ${res.matchedCount}, modified ${res.modifiedCount}`);
  }

  // Ensure Camden and Yorkshire exist if not matched
  const camden = await Garage.findOne({ name: 'Camden & North London MOT Bay' });
  if (!camden) {
    await Garage.create({
      name: 'Camden & North London MOT Bay',
      address: '14 Chalk Farm Road, Camden, London, NW1 8NH',
      city: 'London',
      postcode: 'NW1 8NH',
      latitude: 51.5414,
      longitude: -0.1444,
      rating: 4.9,
      status: 'Approved',
      openingTime: '08:00',
      closingTime: '18:30',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      services: [{ name: 'MOT', price: 44, duration: 40, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], isActive: true }]
    });
    console.log('Created Camden & North London MOT Bay');
  }

  const leeds = await Garage.findOne({ name: 'Yorkshire Master Auto & MOT' });
  if (!leeds) {
    await Garage.create({
      name: 'Yorkshire Master Auto & MOT',
      address: '5 Wellington St, Leeds, LS1 4DY',
      city: 'Leeds',
      postcode: 'LS1 4DY',
      latitude: 53.7968,
      longitude: -1.5489,
      rating: 4.8,
      status: 'Approved',
      openingTime: '08:30',
      closingTime: '17:30',
      workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      services: [{ name: 'MOT', price: 42, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true }]
    });
    console.log('Created Yorkshire Master Auto & MOT');
  }

  console.log('All garage locations synced successfully!');
  await mongoose.disconnect();
}

updateGarageLocations().catch(console.error);
