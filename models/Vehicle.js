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
        // Only optional when the make was verified to have no models listed (see vehicleModelService)
        required: [function () { return this.modelNotListed !== true; }, 'Model is required'],
        default: '',
        trim: true
    },
    // True when the vehicle was saved without a model because its make has no models listed
    modelNotListed: {
        type: Boolean,
        default: false
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