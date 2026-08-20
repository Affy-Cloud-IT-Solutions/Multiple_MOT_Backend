const mongoose = require('mongoose');

const TemplateSchema = new mongoose.Schema({
    t45: {
        type: String,
        required: true,
        default: "Dear [Name], Your [Vehicle] ([Reg]) MOT expires on [Expiry]. Book your MOT today."
    },
    t30: {
        type: String,
        required: true,
        default: "Dear [Name], Just a reminder that your [Vehicle] ([Reg]) MOT is due in 30 days ([Expiry]). Book now."
    },
    t7: {
        type: String,
        required: true,
        default: "URGENT: Dear [Name], Your [Vehicle] ([Reg]) MOT expires in 7 days on [Expiry]. Book immediately to avoid fines."
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Template', TemplateSchema);
