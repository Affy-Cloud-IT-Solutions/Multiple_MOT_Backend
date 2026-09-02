const User = require('../models/User');
const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Reminder = require('../models/Reminder');
const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const Template = require('../models/Template');
const Garage = require('../models/Garage');

async function seedDatabase() {
    try {
        // Check if data already exists to prevent re-seeding
        const userCount = await User.countDocuments();
        if (userCount > 0) {
            console.log('🌱 Database already seeded. Skipping initialization.');
            
            // Ensure super admin exists
            const superAdmin = await User.findOne({ email: 'admin@gmail.com' });
            if (!superAdmin) {
                console.log('🔧 Admin admin@gmail.com missing. Creating admin user...');
                await User.create({
                    username: 'admin',
                    email: 'admin@gmail.com',
                    password: '123456',
                    role: 'admin'
                });
            }
            return;
        }

        console.log('🧹 Clearing existing collections...');
        await Promise.all([
            User.deleteMany({}),
            Customer.deleteMany({}),
            Vehicle.deleteMany({}),
            Reminder.deleteMany({}),
            Alert.deleteMany({}),
            Audit.deleteMany({}),
            Template.deleteMany({}),
            Garage.deleteMany({})
        ]);

        console.log('🏢 Seeding Garages...');
        const garageDocs = await Garage.create([
            {
                name: 'Apex MOT & Service Centre',
                logoUrl: 'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=120&h=120&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=600&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=600&h=400&fit=crop'
                ],
                address: '10 Industrial Estate, London Road, London, SE1 7PB',
                email: 'info@apexmot.co.uk',
                phone: '020 7946 0192',
                openingTime: '08:00',
                closingTime: '18:00',
                description: 'Apex MOT & Service Centre is a certified premier vehicle care facility specializing in MOT testing, comprehensive scheduled servicing, and diagnostics.',
                services: [
                    { name: 'MOT', price: 45, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], isActive: true },
                    { name: 'Full Service', price: 120, duration: 120, availability: ['Monday', 'Wednesday', 'Friday'], isActive: true },
                    { name: 'Interim Service', price: 60, duration: 60, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true }
                ],
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                stations: [
                    { name: 'Station 1 (Bay A)', type: 'Class 4 MOT Bay', slotDuration: 40, status: 'Approved', requestedAt: new Date('2025-08-15'), approvedAt: new Date('2025-08-15'), isActive: true },
                    { name: 'Station 2 (Bay B)', type: 'Class 4/7 MOT Bay', slotDuration: 40, status: 'Approved', requestedAt: new Date('2025-08-15'), approvedAt: new Date('2025-08-15'), isActive: true }
                ],
                slots: ['08:30', '09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45'],
                verificationDocuments: [
                    { name: 'MOT Test Station License', fileUrl: '/uploads/apex_mot_license.pdf', uploadDate: new Date('2025-08-15') },
                    { name: 'Public Liability Insurance', fileUrl: '/uploads/apex_liability_insurance.pdf', uploadDate: new Date('2025-08-15') }
                ],
                verificationDate: new Date('2025-08-15'),
                verificationStatus: 'Verified',
                rating: 4.8,
                distance: 2.3,
                status: 'Approved'
            },
            {
                name: 'Prestige Auto Care',
                logoUrl: 'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=120&h=120&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=600&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=600&h=400&fit=crop'
                ],
                address: '88 Station Road, Manchester, M1 2WD',
                email: 'bookings@prestigeautocare.co.uk',
                phone: '0161 496 0231',
                openingTime: '08:30',
                closingTime: '17:30',
                description: 'Manchester\'s leading German and specialist auto vehicle hub. Dedicated master mechanics and state-of-the-art diagnostic machinery.',
                services: [
                    { name: 'MOT', price: 50, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true },
                    { name: 'Full Service', price: 140, duration: 180, availability: ['Tuesday', 'Thursday'], isActive: true },
                    { name: 'Brake Service', price: 80, duration: 90, availability: ['Monday', 'Wednesday', 'Friday'], isActive: true }
                ],
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                stations: [
                    { name: 'Station 1 (German Specialist Bay)', type: 'Class 4 MOT Bay', slotDuration: 40, status: 'Approved', requestedAt: new Date('2026-02-10'), approvedAt: new Date('2026-02-10'), isActive: true },
                    { name: 'Station 2 (Performance Diagnostics Bay)', type: 'Class 4/7 MOT Bay', slotDuration: 40, status: 'Approved', requestedAt: new Date('2026-02-10'), approvedAt: new Date('2026-02-10'), isActive: true }
                ],
                slots: ['08:30', '09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45'],
                verificationDocuments: [
                    { name: 'DVLA Approval Certificate', fileUrl: '/uploads/prestige_dvla_cert.pdf', uploadDate: new Date('2026-02-10') }
                ],
                verificationDate: new Date('2026-02-10'),
                verificationStatus: 'Verified',
                rating: 4.6,
                distance: 4.7,
                status: 'Approved'
            },
            {
                name: 'Cornerstone Garage',
                logoUrl: 'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=120&h=120&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=600&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=600&h=400&fit=crop',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=600&h=400&fit=crop'
                ],
                address: '4 The Mews, Birmingham, B3 2KL',
                email: 'contact@cornerstone.co.uk',
                phone: '0121 496 0544',
                openingTime: '09:00',
                closingTime: '17:00',
                description: 'Local family-run service garage catering to all makes and models for over 15 years.',
                services: [
                    { name: 'MOT', price: 39, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true }
                ],
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                stations: [
                    { name: 'Main MOT Station', type: 'Class 4 MOT Bay', slotDuration: 45, status: 'Approved', requestedAt: new Date('2026-08-10'), approvedAt: new Date('2026-08-10'), isActive: true }
                ],
                slots: ['08:30', '09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45'],
                verificationDocuments: [
                    { name: 'Government MOT License Registration', fileUrl: '/uploads/cornerstone_mot_lic.pdf', uploadDate: new Date('2026-08-10') }
                ],
                verificationDate: new Date('2026-08-10'),
                verificationStatus: 'Pending',
                rating: 4.2,
                distance: 8.1,
                status: 'Pending'
            }
        ]);

        console.log('👥 Seeding Customers...');
        const customerDocs = await Customer.create([
            {
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@example.com',
                mobile: '07700 900077',
                preferredContact: 'SMS',
                address: '123 High Street, London'
            },
            {
                firstName: 'Sarah',
                lastName: 'Jenkins',
                email: 'sarah.j@example.com',
                mobile: '07700 900144',
                preferredContact: 'Email',
                address: '45 Station Road, Manchester'
            },
            {
                firstName: 'David',
                lastName: 'Smith',
                email: 'david.smith@example.com',
                mobile: '07700 900255',
                preferredContact: 'WhatsApp',
                address: '88 Park Lane, Birmingham'
            }
        ]);

        console.log('👤 Seeding Users...');
        await User.create([
            // Super Admin
            {
                username: 'admin',
                email: 'admin@gmail.com',
                password: '123456',
                role: 'admin'
            },
            // Apex MOT Owner & Staff
            {
                username: 'apex_owner',
                email: 'apex.owner@garage.com',
                password: '123456',
                role: 'garage_admin',
                garageId: garageDocs[0]._id
            },
            {
                username: 'zaidjr107',
                email: 'zaidjr107@gmail.com',
                password: '123456',
                role: 'staff',
                garageId: garageDocs[0]._id
            },
            // Prestige Owner & Staff
            {
                username: 'prestige_owner',
                email: 'prestige.owner@garage.com',
                password: '123456',
                role: 'garage_admin',
                garageId: garageDocs[1]._id
            },
            {
                username: 'zaidjrjr107',
                email: 'zaidjrjr107@gmail.com',
                password: '123456',
                role: 'staff',
                garageId: garageDocs[1]._id
            },
            // Customer Accounts
            {
                username: 'john.doe',
                email: 'john.doe@example.com',
                password: 'john123',
                role: 'customer',
                customerId: customerDocs[0]._id
            },
            {
                username: 'sarah.j',
                email: 'sarah.j@example.com',
                password: 'sarah123',
                role: 'customer',
                customerId: customerDocs[1]._id
            },
            {
                username: 'david.smith',
                email: 'david.smith@example.com',
                password: 'david123',
                role: 'customer',
                customerId: customerDocs[2]._id
            }
        ]);

        console.log('🚗 Seeding Vehicles...');
        const vehicleDocs = await Vehicle.create([
            {
                customerId: customerDocs[0]._id,
                registrationNumber: 'GK17UTO',
                make: 'MITSUBISHI',
                model: 'OUTLANDER',
                year: 2017,
                motExpiryDate: new Date('2026-11-02'),
                lastServiceDate: new Date('2025-10-29'),
                status: 'Active'
            },
            {
                customerId: customerDocs[0]._id,
                registrationNumber: 'CU15XZG',
                make: 'VOLKSWAGEN',
                model: 'GOLF',
                year: 2015,
                motExpiryDate: new Date('2026-09-18'),
                lastServiceDate: new Date('2025-09-10'),
                status: 'Active'
            },
            {
                customerId: customerDocs[1]._id,
                registrationNumber: 'GK17UTO',
                make: 'MITSUBISHI',
                model: 'OUTLANDER',
                year: 2017,
                motExpiryDate: new Date('2026-11-02'),
                lastServiceDate: new Date('2025-10-29'),
                status: 'Active'
            }
        ]);

        console.log('🔔 Seeding Alerts & Bookings...');
        await Alert.create([
            // Vehicle approvals
            {
                type: 'NEW_VEHICLE',
                customerName: 'Sarah Jenkins',
                customerId: customerDocs[1]._id,
                garageId: garageDocs[0]._id,
                registrationNumber: 'GY19 PLK',
                makeModel: 'AUDI A3',
                date: new Date('2026-07-22T09:30:00Z'),
                status: 'Pending'
            },
            // Booked MOTs
            {
                type: 'BOOKED',
                customerName: 'John Doe',
                customerId: customerDocs[0]._id,
                garageId: garageDocs[0]._id,
                registrationNumber: 'GK17UTO',
                makeModel: 'MITSUBISHI OUTLANDER',
                serviceName: 'MOT',
                price: 45,
                duration: 45,
                date: new Date('2026-07-25T10:00:00Z'),
                status: 'Approved'
            },
            {
                type: 'BOOKED',
                customerName: 'Sarah Jenkins',
                customerId: customerDocs[1]._id,
                garageId: garageDocs[1]._id,
                registrationNumber: 'CU15XZG',
                makeModel: 'VOLKSWAGEN GOLF',
                serviceName: 'Full Service',
                price: 140,
                duration: 180,
                date: new Date('2026-07-28T13:30:00Z'),
                status: 'Pending'
            }
        ]);

        console.log('📝 Seeding Templates...');
        await Template.create({
            t45: "Dear [Name], Your [Vehicle] ([Reg]) MOT expires on [Expiry]. Book your MOT today.",
            t30: "Dear [Name], Just a reminder that your [Vehicle] ([Reg]) MOT is due in 30 days ([Expiry]). Book now.",
            t7: "URGENT: Dear [Name], Your [Vehicle] ([Reg]) MOT expires in 7 days on [Expiry]. Book immediately to avoid fines."
        });

        console.log('📊 Seeding Audits...');
        await Audit.create([
            {
                date: new Date('2026-07-20T09:00:00Z'),
                activity: 'Reminder Sent (45 Days)',
                details: 'Reminder 1 sent to John Doe for MITSUBISHI OUTLANDER (GK17UTO) via SMS'
            },
            {
                date: new Date('2026-07-21T09:00:00Z'),
                activity: 'Reminder Sent (7 Days)',
                details: 'Reminder 3 sent to Sarah Jenkins for VOLKSWAGEN GOLF (CU15XZG) via Email'
            }
        ]);

        console.log('⏰ Seeding Reminders...');
        await Reminder.create([
            {
                vehicleId: vehicleDocs[0]._id,
                reminderType: '45_Days',
                reminderDate: new Date('2026-07-11'),
                sentStatus: true,
                sentTimestamp: new Date('2026-07-11T09:00:00Z'),
                communicationMethod: 'SMS'
            },
            {
                vehicleId: vehicleDocs[1]._id,
                reminderType: '30_Days',
                reminderDate: new Date('2026-06-29'),
                sentStatus: true,
                sentTimestamp: new Date('2026-06-29T09:00:00Z'),
                communicationMethod: 'Email'
            }
        ]);

        console.log('🎉 Database seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error seeding database:', error);
    }
}

module.exports = seedDatabase;
