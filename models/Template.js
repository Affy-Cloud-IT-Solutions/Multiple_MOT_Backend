const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
    motDue: {
        type: String,
        required: true,
        default: "Dear [Name], Your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today under the DVSA 30-day early renewal window."
    },
    t30: {
        type: String,
        default: "Dear [Name], Just a reminder that your [Vehicle] ([Reg]) MOT is due for renewal on [Expiry]. Book your MOT today."
    },
    t45: {
        type: String,
        default: ""
    },
    t7: {
        type: String,
        default: ""
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Template', TemplateSchema);
