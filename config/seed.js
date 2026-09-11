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
            console.log('🌱 Database already seeded. Verifying registered garages...');
            
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

            // Ensure key registered UK garages exist for testing
            const registeredGaragesCount = await Garage.countDocuments({ status: 'Approved' });
            if (registeredGaragesCount < 4) {
                console.log('🏢 Seeding missing approved UK registered garages for location testing...');
                const sampleGarages = [
                    {
                        name: 'Apex MOT & Service Centre',
                        address: '10 Industrial Estate, London Road, London, SE1 7PB',
                        city: 'London',
                        postcode: 'SE1 7PB',
                        latitude: 51.5014,
                        longitude: -0.0910,
                        vtsNumber: 'VTS-104928',
                        motAuthorisedExaminerNumber: 'AE-884920',
                        businessRegistrationNumber: 'GB-9928174',
                        legalDeclaration: true,
                        email: 'info@apexmot.co.uk',
                        phone: '020 7946 0192',
                        rating: 4.8,
                        status: 'Approved'
                    },
                    {
                        name: 'Prestige Auto Care',
                        address: '88 Station Road, Manchester, M1 2WD',
                        city: 'Manchester',
                        postcode: 'M1 2WD',
                        latitude: 53.4808,
                        longitude: -2.2426,
                        vtsNumber: 'VTS-209148',
                        motAuthorisedExaminerNumber: 'AE-771924',
                        businessRegistrationNumber: 'GB-4401928',
                        legalDeclaration: true,
                        email: 'bookings@prestigeautocare.co.uk',
                        phone: '0161 496 0231',
                        rating: 4.6,
                        status: 'Approved'
                    },
                    {
                        name: 'Cornerstone Garage',
                        address: '4 The Mews, Great Charles St, Birmingham, B3 2KL',
                        city: 'Birmingham',
                        postcode: 'B3 2KL',
                        latitude: 52.4862,
                        longitude: -1.8904,
                        vtsNumber: 'VTS-391024',
                        motAuthorisedExaminerNumber: 'AE-551029',
                        businessRegistrationNumber: 'GB-1102934',
                        legalDeclaration: true,
                        email: 'contact@cornerstone.co.uk',
                        phone: '0121 496 0544',
                        rating: 4.7,
                        status: 'Approved'
                    },
                    {
                        name: 'Camden & North London MOT Bay',
                        address: '14 Chalk Farm Road, Camden, London, NW1 8NH',
                        city: 'London',
                        postcode: 'NW1 8NH',
                        latitude: 51.5414,
                        longitude: -0.1444,
                        vtsNumber: 'VTS-449102',
                        motAuthorisedExaminerNumber: 'AE-992014',
                        businessRegistrationNumber: 'GB-8819201',
                        legalDeclaration: true,
                        email: 'camden@northlondonmot.co.uk',
                        phone: '020 7485 9920',
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
                        vtsNumber: 'VTS-882019',
                        motAuthorisedExaminerNumber: 'AE-330192',
                        businessRegistrationNumber: 'GB-6610294',
                        legalDeclaration: true,
                        email: 'contact@yorkshiremastermot.co.uk',
                        phone: '0113 496 0199',
                        rating: 4.8,
                        status: 'Approved'
                    }
                ];

                for (const g of sampleGarages) {
                    const exists = await Garage.findOne({ name: g.name });
                    if (!exists) {
                        await Garage.create(g);
                    } else if (exists.status !== 'Approved' || !exists.latitude) {
                        exists.status = 'Approved';
                        exists.latitude = g.latitude;
                        exists.longitude = g.longitude;
                        exists.postcode = g.postcode;
                        await exists.save();
                    }
                }
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
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'
                ],
                address: '10 Industrial Estate, London Road, London, SE1 7PB',
                city: 'London',
                postcode: 'SE1 7PB',
                latitude: 51.5014,
                longitude: -0.0910,
                vtsNumber: 'VTS-104928',
                motAuthorisedExaminerNumber: 'AE-884920',
                businessRegistrationNumber: 'GB-9928174',
                legalDeclaration: true,
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
                    { name: 'MOT Test Station License', fileUrl: '/uploads/apex_mot_license.pdf', documentType: 'MOT Certificate', uploadDate: new Date('2025-08-15') },
                    { name: 'Public Liability Insurance', fileUrl: '/uploads/apex_liability_insurance.pdf', documentType: 'Public Liability Insurance', uploadDate: new Date('2025-08-15') }
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
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'
                ],
                address: '88 Station Road, Manchester, M1 2WD',
                city: 'Manchester',
                postcode: 'M1 2WD',
                latitude: 53.4808,
                longitude: -2.2426,
                vtsNumber: 'VTS-209148',
                motAuthorisedExaminerNumber: 'AE-771924',
                businessRegistrationNumber: 'GB-4401928',
                legalDeclaration: true,
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
                    { name: 'DVLA Approval Certificate', fileUrl: '/uploads/prestige_dvla_cert.pdf', documentType: 'MOT Certificate', uploadDate: new Date('2026-02-10') }
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
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'
                ],
                address: '4 The Mews, Great Charles St, Birmingham, B3 2KL',
                city: 'Birmingham',
                postcode: 'B3 2KL',
                latitude: 52.4862,
                longitude: -1.8904,
                vtsNumber: 'VTS-391024',
                motAuthorisedExaminerNumber: 'AE-551029',
                businessRegistrationNumber: 'GB-1102934',
                legalDeclaration: true,
                email: 'contact@cornerstone.co.uk',
                phone: '0121 496 0544',
                openingTime: '09:00',
                closingTime: '17:00',
                description: 'Local family-run service garage catering to all makes and models for over 15 years with fast turnaround MOTs.',
                services: [
                    { name: 'MOT', price: 39, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true },
                    { name: 'Oil & Filter Change', price: 55, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true }
                ],
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                stations: [
                    { name: 'Main MOT Station', type: 'Class 4 MOT Bay', slotDuration: 45, status: 'Approved', requestedAt: new Date('2026-08-10'), approvedAt: new Date('2026-08-10'), isActive: true }
                ],
                slots: ['08:30', '09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45'],
                verificationDocuments: [
                    { name: 'Government MOT License Registration', fileUrl: '/uploads/cornerstone_mot_lic.pdf', documentType: 'MOT Certificate', uploadDate: new Date('2026-08-10') }
                ],
                verificationDate: new Date('2026-08-10'),
                verificationStatus: 'Verified',
                rating: 4.7,
                distance: 1.1,
                status: 'Approved'
            },
            {
                name: 'Camden & North London MOT Bay',
                logoUrl: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=120&h=120&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop'
                ],
                address: '14 Chalk Farm Road, Camden, London, NW1 8NH',
                city: 'London',
                postcode: 'NW1 8NH',
                latitude: 51.5414,
                longitude: -0.1444,
                vtsNumber: 'VTS-449102',
                motAuthorisedExaminerNumber: 'AE-992014',
                businessRegistrationNumber: 'GB-8819201',
                legalDeclaration: true,
                email: 'camden@northlondonmot.co.uk',
                phone: '020 7485 9920',
                openingTime: '08:00',
                closingTime: '18:30',
                description: 'Convenient North London MOT testing center. Class 4 testing, brake tests, and pre-MOT health checks.',
                services: [
                    { name: 'MOT', price: 44, duration: 40, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], isActive: true },
                    { name: 'Major Service', price: 160, duration: 180, availability: ['Monday', 'Wednesday', 'Friday'], isActive: true }
                ],
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
                stations: [
                    { name: 'Bay 1 (Class 4)', type: 'Class 4 MOT Bay', slotDuration: 40, status: 'Approved', requestedAt: new Date('2026-01-15'), approvedAt: new Date('2026-01-15'), isActive: true }
                ],
                slots: ['08:00', '08:45', '09:30', '10:15', '11:00', '11:45', '12:30', '13:15', '14:00', '14:45', '15:30', '16:15', '17:00'],
                verificationDocuments: [
                    { name: 'DVSA Testing Authority', fileUrl: '/uploads/camden_dvsa.pdf', documentType: 'MOT Certificate', uploadDate: new Date('2026-01-15') }
                ],
                verificationDate: new Date('2026-01-15'),
                verificationStatus: 'Verified',
                rating: 4.9,
                distance: 3.4,
                status: 'Approved'
            },
            {
                name: 'Yorkshire Master Auto & MOT',
                logoUrl: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=120&h=120&fit=crop',
                images: [
                    'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1617886322168-72b886573c3c?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1486006920555-c77dce18193b?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1517524206127-48bbd363f3d7?w=800&h=500&fit=crop',
                    'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop'
                ],
                address: '5 Wellington St, Leeds, LS1 4DY',
                city: 'Leeds',
                postcode: 'LS1 4DY',
                latitude: 53.7968,
                longitude: -1.5489,
                vtsNumber: 'VTS-882019',
                motAuthorisedExaminerNumber: 'AE-330192',
                businessRegistrationNumber: 'GB-6610294',
                legalDeclaration: true,
                email: 'contact@yorkshiremastermot.co.uk',
                phone: '0113 496 0199',
                openingTime: '08:30',
                closingTime: '17:30',
                description: 'Trusted Leeds city center MOT testing center. Friendly technicians and comprehensive diagnostic bay.',
                services: [
                    { name: 'MOT', price: 42, duration: 45, availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], isActive: true },
                    { name: 'Air Con Regas & MOT Combo', price: 85, duration: 60, availability: ['Monday', 'Tuesday', 'Thursday'], isActive: true }
                ],
                workingDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
                stations: [
                    { name: 'Leeds MOT Bay', type: 'Class 4 MOT Bay', slotDuration: 45, status: 'Approved', requestedAt: new Date('2026-03-01'), approvedAt: new Date('2026-03-01'), isActive: true }
                ],
                slots: ['08:30', '09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00'],
                verificationDocuments: [
                    { name: 'DVSA Leeds Certification', fileUrl: '/uploads/leeds_dvsa.pdf', documentType: 'MOT Certificate', uploadDate: new Date('2026-03-01') }
                ],
                verificationDate: new Date('2026-03-01'),
                verificationStatus: 'Verified',
                rating: 4.8,
                distance: 1.8,
                status: 'Approved'
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
            motDue: "Dear [Name], Your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today under the DVSA 30-day early renewal window.",
            t30: "Dear [Name], Just a reminder that your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today."
        });

        console.log('📊 Seeding Audits...');
        await Audit.create([
            {
                date: new Date('2026-07-20T09:00:00Z'),
                activity: 'Reminder Sent (MOT Due)',
                details: 'MOT Due Reminder sent to John Doe for MITSUBISHI OUTLANDER (GK17UTO) via SMS'
            },
            {
                date: new Date('2026-07-21T09:00:00Z'),
                activity: 'Reminder Sent (MOT Due)',
                details: 'MOT Due Reminder sent to Sarah Jenkins for VOLKSWAGEN GOLF (CU15XZG) via Email'
            }
        ]);

        console.log('⏰ Seeding Reminders...');
        await Reminder.create([
            {
                vehicleId: vehicleDocs[0]._id,
                reminderType: 'MOT_Due',
                reminderDate: new Date('2026-07-11'),
                sentStatus: true,
                sentTimestamp: new Date('2026-07-11T09:00:00Z'),
                communicationMethod: 'SMS'
            },
            {
                vehicleId: vehicleDocs[1]._id,
                reminderType: 'MOT_Due',
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
