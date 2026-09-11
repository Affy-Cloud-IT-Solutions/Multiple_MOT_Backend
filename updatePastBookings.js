const mongoose = require('mongoose');
const Alert = require('./models/Alert');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/multi-mot-database';

async function updatePastBookings() {
  await mongoose.connect(MONGO_URI);
  console.log('Connected to DB...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const pastAlerts = await Alert.find({
    type: 'BOOKED',
    date: { $lt: today },
    status: { $in: ['Approved', 'Pending'] }
  });

  console.log(`Found ${pastAlerts.length} past BOOKED alerts before ${today.toISOString()}`);
  for (const a of pastAlerts) {
    console.log(`- Updating: ${a.registrationNumber} (Date: ${a.date ? a.date.toISOString().split('T')[0] : 'N/A'}) to Completed`);
    a.status = 'Completed';
    await a.save();
  }

  console.log('All past bookings successfully marked as Completed!');
  await mongoose.disconnect();
}

updatePastBookings().catch(console.error);
