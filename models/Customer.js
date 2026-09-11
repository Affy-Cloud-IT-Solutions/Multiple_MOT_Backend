const mongoose = require('mongoose');

const CustomerSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'First name is required'],
        trim: true
    },
    lastName: {
        type: String,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    mobile: {
        type: String,
        required: [true, 'Mobile number is required'],
        trim: true
    },
    address: {
        type: String,
        trim: true
    },
    preferredContact: {
        type: String,
        enum: ['SMS', 'Email', 'WhatsApp'],
        default: 'SMS'
    },
    garageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Garage'
    },
    garageIds: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Garage'
    }]
}, {
    timestamps: true
});

CustomerSchema.index({ garageId: 1 });
CustomerSchema.index({ garageIds: 1 });

module.exports = mongoose.model('Customer', CustomerSchema);