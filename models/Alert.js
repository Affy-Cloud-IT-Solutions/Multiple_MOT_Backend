const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['NEW_VEHICLE', 'SOLD', 'BOOKED', 'NEW_STATION', 'GARAGE_REGISTRATION'],
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
    customerEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    customerMobile: {
        type: String,
        trim: true
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
    slotNumber: {
        type: Number // e.g. 1, 2, 3...
    },
    serviceName: {
        type: String
    },
    services: [{
        name: { type: String, trim: true },
        category: { type: String, default: 'General', trim: true },
        price: { type: Number, default: 0 },
        duration: { type: Number, default: 45 }
    }],
    hasMot: {
        type: Boolean,
        default: false
    },
    isDateOnly: {
        type: Boolean,
        default: false
    },
    serviceCategory: {
        type: String,
        default: 'General'
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
        enum: ['Pending', 'Approved', 'Acknowledged', 'Rejected', 'Completed', 'Cancelled'],
        default: 'Pending'
    },
    rejectionReason: {
        type: String,
        default: ''
    },
    // Set when the customer dismisses this notification in the app (hides it; does not change the booking status)
    customerDismissedAt: {
        type: Date,
        default: null
    },
    rescheduled: {
        type: Boolean,
        default: false
    },
    cancellationReason: {
        type: String,
        default: ''
    },
    cancelledBy: {
        type: String,
        default: ''
    },
    cancelledAt: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Alert', AlertSchema);
