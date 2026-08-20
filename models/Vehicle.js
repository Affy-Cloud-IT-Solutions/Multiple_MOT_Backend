const mongoose = require('mongoose');

const VehicleSchema = new mongoose.Schema({
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    registrationNumber: {
        type: String,
        required: [true, 'Registration number is required'],
        unique: true,
        uppercase: true,
        trim: true
    },
    make: {
        type: String,
        required: [true, 'Make is required'],
        trim: true
    },
    model: {
        type: String,
        required: [true, 'Model is required'],
        trim: true
    },
    year: {
        type: Number,
        min: 1900,
        max: new Date().getFullYear() + 1
    },
    motExpiryDate: {
        type: Date,
        required: [true, 'MOT expiry date is required']
    },
    lastServiceDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Active', 'Sold', 'Scrapped', 'Pending', 'Rejected'],
        default: 'Active'
    },
    rejectionReason: {
        type: String,
        trim: true
    },
    token: {
        type: String,
        unique: true,
        sparse: true
    }
}, {
    timestamps: true
});

VehicleSchema.index({ motExpiryDate: 1 });

module.exports = mongoose.model('Vehicle', VehicleSchema);