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
    slots: {
        type: [String],
        default: ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']
    },
    blockedSlots: [{
        date: { type: String, required: true }, // format "YYYY-MM-DD"
        slot: { type: String, required: true }  // e.g. "10:00"
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
