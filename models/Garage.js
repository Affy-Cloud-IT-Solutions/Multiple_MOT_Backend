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
        required: [true, 'Garage address is required'],
        trim: true
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
        name: { type: String, required: true },
        price: { type: Number, required: true },
        duration: { type: Number, required: true }, // in minutes
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
        default: ['08:30', '09:15', '10:00', '10:45', '11:30', '12:15', '13:00', '13:45', '14:30', '15:15', '16:00', '16:45']
    },
    blockedSlots: [{
        date: { type: String, required: true }, // format "YYYY-MM-DD"
        slot: { type: String, required: true }, // e.g. "09:15"
        stationId: { type: mongoose.Schema.Types.ObjectId } // optional: specific station
    }],
    verificationDocuments: [{
        name: { type: String, required: true },
        fileUrl: { type: String, required: true },
        uploadDate: { type: Date, default: Date.now }
    }],
    verificationDate: {
        type: Date
    },
    verificationStatus: {
        type: String,
        enum: ['Pending', 'Verified', 'Expired'],
        default: 'Pending'
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
