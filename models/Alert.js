const mongoose = require('mongoose');

const AlertSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['NEW_VEHICLE', 'SOLD', 'BOOKED'],
        required: true
    },
    customerName: {
        type: String,
        required: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
        required: true
    },
    garageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Garage'
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
        required: true,
        uppercase: true,
        trim: true
    },
    makeModel: {
        type: String,
        required: true
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
