const mongoose = require('mongoose');

const GarageSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Garage name is required'],
        trim: true
    },
    logoUrl: {
        type: String,
        default: ''
    },
    images: {
        type: [String],
        default: []
    },
    address: {
        type: String,
        default: '',
        trim: true
    },
    city: {
        type: String,
        default: 'London',
        trim: true
    },
    postcode: {
        type: String,
        default: '',
        trim: true
    },
    latitude: {
        type: Number,
        default: 51.5074
    },
    longitude: {
        type: Number,
        default: -0.1278
    },
    vtsNumber: {
        type: String,
        default: '', // Vehicle Testing Station (VTS) Site Number (e.g. VTS104928)
        trim: true
    },
    motAuthorisedExaminerNumber: {
        type: String,
        default: '', // MOT Authorised Examiner (AE) Number
        trim: true
    },
    businessRegistrationNumber: {
        type: String,
        default: '', // Companies House / Trade Reg Number
        trim: true
    },
    legalDeclaration: {
        type: Boolean,
        default: false
    },
    legalDeclarationDate: {
        type: Date
    },
    locationConfigured: {
        type: Boolean,
        default: false
    },
    servicesConfigured: {
        type: Boolean,
        default: false
    },
    documentsConfigured: {
        type: Boolean,
        default: false
    },
    email: {
        type: String,
        lowercase: true,
        trim: true
    },
    phone: {
        type: String,
        trim: true
    },
    openingTime: {
        type: String,
        default: '08:00'
    },
    closingTime: {
        type: String,
        default: '18:00'
    },
    description: {
        type: String,
        default: ''
    },
    services: [{
        name: { type: String, required: true, trim: true },
        category: { 
            type: String, 
            default: 'Servicing',
            trim: true
        }, // e.g. 'MOT', 'Servicing', 'Repairs', 'Tyre replacement', 'Diagnostics', 'Brakes', 'Exhaust', 'Custom'
        price: { type: Number, required: true, min: 0 },
        duration: { type: Number, required: true, default: 45, min: 5 }, // in minutes
        description: { type: String, default: '', trim: true },
        availability: [{ type: String }], // e.g. ["Monday", "Tuesday", ...]
        isActive: { type: Boolean, default: true }
    }],
    workingDays: {
        type: [String],
        default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    },
    stations: [{
        name: { type: String, required: true, trim: true },
        type: { type: String, default: 'Class 4 MOT Bay' },
        slotDuration: { type: Number, default: 40 }, // in minutes
        status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
        requestedAt: { type: Date, default: Date.now },
        approvedAt: { type: Date },
        rejectionReason: { type: String, default: '' },
        isActive: { type: Boolean, default: true }
    }],
    slots: {
        type: [String],
        default: []
    },
    blockedSlots: [{
        date: { type: String, required: true }, // format "YYYY-MM-DD"
        slot: { type: String, required: true }, // e.g. "09:15"
        stationId: { type: mongoose.Schema.Types.ObjectId } // optional: specific station
    }],
    verificationDocuments: [{
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        documentType: { type: String, default: 'MOT Certificate' },
        status: { type: String, enum: ['Pending', 'Verified', 'Rejected'], default: 'Pending' },
        rejectionReason: { type: String, default: '' },
        verifiedAt: { type: Date },
        uploadDate: { type: Date, default: Date.now }
    }],
    verificationDate: {
        type: Date
    },
    verificationStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Rejected', 'Expired'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    rating: {
        type: Number,
        default: 4.5
    },
    distance: {
        type: Number,
        default: 0.0
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Blacklisted'],
        default: 'Pending'
    },
    annualReminderSent: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Garage', GarageSchema);
