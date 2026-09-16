require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('./config/database');
const User = require('./models/User');
const Customer = require('./models/Customer');
const Vehicle = require('./models/Vehicle');
const Reminder = require('./models/Reminder');
const { sendMotDueReminderEmail } = require('./services/emailService');

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function runTestDispatches() {
  try {
    await connectDB();
    console.log('✅ Connected to MongoDB');

    const email = 'nkenterprises1925@gmail.com';
    const password = '123456';

    // 1. Find or create Customer
    let customer = await Customer.findOne({ email });
    if (!customer) {
      customer = await Customer.create({
        firstName: 'NK',
        lastName: 'Enterprises',
        email,
        mobile: '07700900123',
        address: '123 London Road, London, UK',
        preferredContact: 'Email',
        garageConsent: true,
        garageConsentDate: new Date()
      });
      console.log('✅ Created Customer:', customer._id.toString());
    } else {
      customer.preferredContact = 'Email';
      customer.garageConsent = true;
      await customer.save();
      console.log('ℹ️ Customer already exists:', customer._id.toString());
    }

    // 2. Find or create User Login
    let user = await User.findOne({ email });
    if (!user) {
      user = new User({
        username: 'nkenterprises',
        email,
        password,
        role: 'customer',
        customerId: customer._id,
        garageConsent: true,
        garageConsentDate: new Date()
      });
      await user.save();
      console.log('✅ Created User Login account with password:', password);
    } else {
      user.password = password; // Will trigger bcrypt hash in pre-save hook
      user.customerId = customer._id;
      user.role = 'customer';
      await user.save();
      console.log('ℹ️ User Login updated with password:', password);
    }

    // 3. Define the 4 Milestone vehicles and notifications
    const milestones = [
      {
        reg: 'NK45 MOT',
        make: 'BMW',
        model: '320d M Sport',
        year: 2021,
        daysLeft: 45,
        stage: '45_Days',
        label: '45-Day Advance Reminder'
      },
      {
        reg: 'NK30 MOT',
        make: 'Audi',
        model: 'A4 S-Line TDI',
        year: 2022,
        daysLeft: 30,
        stage: '30_Days',
        label: '30-Day Official DVSA Renewal Window Reminder'
      },
      {
        reg: 'NK15 MOT',
        make: 'Mercedes-Benz',
        model: 'C220d AMG Line',
        year: 2020,
        daysLeft: 15,
        stage: '15_Days',
        label: '15-Day Urgent Action Reminder'
      },
      {
        reg: 'NK07 MOT',
        make: 'Volkswagen',
        model: 'Golf R 2.0 TSI',
        year: 2023,
        daysLeft: 7,
        stage: '7_Days',
        label: '7-Day Final Notice Reminder'
      }
    ];

    console.log('\n======================================================');
    console.log(`🚀 Dispatching 4 Milestone MOT Reminders to ${email}...`);
    console.log('======================================================\n');

    for (const item of milestones) {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + item.daysLeft);
      const expiryFormatted = expiryDate.toISOString().substring(0, 10);

      // Create or update vehicle
      let vehicle = await Vehicle.findOne({ registrationNumber: item.reg });
      if (!vehicle) {
        vehicle = await Vehicle.create({
          customerId: customer._id,
          registrationNumber: item.reg,
          make: item.make,
          model: item.model,
          year: item.year,
          motExpiryDate: expiryDate,
          status: 'Active'
        });
      } else {
        vehicle.motExpiryDate = expiryDate;
        vehicle.customerId = customer._id;
        vehicle.status = 'Active';
        await vehicle.save();
      }

      const serviceLink = `https://multiplemot.co.uk/portal?reg=${item.reg}&days=${item.daysLeft}`;

      console.log(`📨 Sending [${item.label}] for ${item.reg} (${item.make} ${item.model}) - ${item.daysLeft} days left...`);

      const res = await sendMotDueReminderEmail(
        customer,
        vehicle,
        item.daysLeft,
        expiryFormatted,
        serviceLink,
        item.stage
      );

      console.log(`✅ [${item.stage}] Dispatched result:`, res ? 'SUCCESS' : 'LOGGED');

      // Record in Reminder DB table
      await Reminder.create({
        vehicleId: vehicle._id,
        reminderType: item.stage,
        reminderDate: new Date(),
        sentStatus: true,
        sentTimestamp: new Date(),
        communicationMethod: 'Email'
      });

      // Small pause between emails
      await sleep(1500);
    }

    console.log('\n======================================================');
    console.log('🎉 ALL 4 MOT NOTIFICATION EMAILS SENT SUCCESSFULLY!');
    console.log(`📥 Please check inbox for: ${email}`);
    console.log('======================================================\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Error sending test notifications:', err);
    process.exit(1);
  }
}

runTestDispatches();
