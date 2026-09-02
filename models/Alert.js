const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['NEW_VEHICLE', 'SOLD', 'BOOKED', 'NEW_STATION'],
        required: true
    },
    customerName: {
        type: String,
        default: 'Garage Admin'
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    garageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Garage'
    },
    stationId: {
        type: mongoose.Schema.Types.ObjectId
    },
    stationName: {
        type: String
    },
    slotTime: {
        type: String // e.g. "10:00" or "10:00 - 10:45"
    },
    serviceName: {
        type: String
    },
    price: {
        type: Number
    },
    duration: {
        type: Number
    },
    registrationNumber: {
        type: String,
        uppercase: true,
        trim: true
    },
    makeModel: {
        type: String
    },
    date: {
        type: Date,
        default: Date.now
    },
    year: {
        type: Number
    },
    motExpiryDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Acknowledged', 'Rejected'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    rescheduled: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Alert', AlertSchema);
