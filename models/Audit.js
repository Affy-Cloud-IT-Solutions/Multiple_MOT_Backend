const mongoose = require('mongoose');

const AuditSchema = new mongoose.Schema({
    date: {
        type: Date,
        default: Date.now
    },
    activity: {
        type: String,
        required: true
    },
    details: {
        type: String,
        required: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Audit', AuditSchema);
