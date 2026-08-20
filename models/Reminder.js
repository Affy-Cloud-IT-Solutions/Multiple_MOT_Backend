const mongoose = require('mongoose');

const ReminderSchema = new mongoose.Schema({
    vehicleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Vehicle',
        required: true
    },
    reminderType: {
        type: String,
        enum: ['45_Days', '30_Days', '7_Days'],
        required: true
    },
    reminderDate: {
        type: Date,
        required: true
    },
    sentStatus: {
        type: Boolean,
        default: false
    },
    sentTimestamp: {
        type: Date
    },
    communicationMethod: {
        type: String,
        enum: ['SMS', 'Email', 'WhatsApp']
    },
    response: {
        type: String,
        enum: ['Booked', 'Sold', 'NewVehicle'],
        default: null
    },
    responseDate: {
        type: Date
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Reminder', ReminderSchema);