const INITIAL_USERS = [
  {
    id: "u1",
    email: "admin@garage.com",
    password: "admin", // Simple plaintext passwords for easy testing
    role: "admin",
    name: "Alex Mercer"
  },
  {
    id: "u2",
    email: "john.doe@example.com",
    password: "john",
    role: "customer",
    name: "John Doe",
    customerId: "c1"
  },
  {
    id: "u3",
    email: "sarah.j@example.com",
    password: "sarah",
    role: "customer",
    name: "Sarah Jenkins",
    customerId: "c2"
  }
];

const INITIAL_CUSTOMERS = [
  {
    id: "c1",
    firstName: "John",
    lastName: "Doe",
    email: "john.doe@example.com",
    mobile: "07700 900077",
    preferredContact: "SMS",
    address: "123 High Street, London",
    createdDate: "2025-01-10"
  },
  {
    id: "c2",
    firstName: "Sarah",
    lastName: "Sarah Jenkins",
    email: "sarah.j@example.com",
    mobile: "07700 900144",
    preferredContact: "Email",
    address: "45 Station Road, Manchester",
    createdDate: "2025-02-15"
  },
  {
    id: "c3",
    firstName: "David",
    lastName: "Smith",
    email: "david.smith@example.com",
    mobile: "07700 900255",
    preferredContact: "WhatsApp",
    address: "88 Park Lane, Birmingham",
    createdDate: "2025-03-20"
  }
];

const INITIAL_VEHICLES = [
  {
    id: "v1",
    customerId: "c1",
    registrationNumber: "AB18 CDE",
    make: "FORD",
    model: "FOCUS TDCI",
    year: "2018",
    motExpiryDate: "2026-08-25", // ~34 days remaining
    lastServiceDate: "2025-08-20",
    status: "Active"
  },
  {
    id: "v2",
    customerId: "c2",
    registrationNumber: "LD65 XYZ",
    make: "VAUXHALL",
    model: "CORSA ECOFLEX",
    year: "2015",
    motExpiryDate: "2026-07-29", // ~7 days remaining
    lastServiceDate: "2025-07-15",
    status: "Active"
  },
  {
    id: "v3",
    customerId: "c3",
    registrationNumber: "MH07 KKK",
    make: "BMW",
    model: "320D M SPORT",
    year: "2019",
    motExpiryDate: "2026-08-10", // ~19 days remaining
    lastServiceDate: "2025-10-05",
    status: "Active"
  }
];

const INITIAL_REMINDERS = [
  {
    id: "r1",
    vehicleId: "v1",
    reminderType: "MOT_Due",
    reminderDate: "2026-07-11",
    sentStatus: "Sent",
    sentTimestamp: "2026-07-11 09:00"
  },
  {
    id: "r2",
    vehicleId: "v2",
    reminderType: "MOT_Due",
    reminderDate: "2026-06-29",
    sentStatus: "Sent",
    sentTimestamp: "2026-06-29 09:00"
  }
];

const INITIAL_ALERTS = [
  {
    id: "a1",
    type: "SOLD",
    customerName: "Sarah Jenkins",
    customerId: "c2",
    registrationNumber: "GY19 PLK",
    makeModel: "AUDI A3",
    date: "2026-07-22 09:30",
    status: "Pending"
  }
];

const INITIAL_AUDITS = [
  {
    id: "au1",
    date: "2026-07-20 09:00",
    activity: "Reminder Sent (MOT Due)",
    details: "MOT Due Reminder sent to John Doe for FORD FOCUS (AB18 CDE) via SMS"
  },
  {
    id: "au2",
    date: "2026-07-21 09:00",
    activity: "Reminder Sent (MOT Due)",
    details: "MOT Due Reminder sent to Sarah Jenkins for VAUXHALL CORSA (LD65 XYZ) via Email"
  }
];

const INITIAL_TEMPLATES = {
  motDue: "Dear [Name], Your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today under the DVSA 30-day early renewal window.",
  t30: "Dear [Name], Just a reminder that your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today."
};

module.exports = {
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_VEHICLES,
  INITIAL_REMINDERS,
  INITIAL_ALERTS,
  INITIAL_AUDITS,
  INITIAL_TEMPLATES
};
