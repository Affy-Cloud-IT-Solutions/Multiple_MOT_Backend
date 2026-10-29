const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
    username: {
        type: String,
        required: [true, 'Username is required'],
        unique: true,
        trim: true
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: 6
    },
    role: {
        type: String,
        enum: ['admin', 'garage_admin', 'staff', 'customer'],
        default: 'customer'
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    garageId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Garage'
    },
    garageConsent: {
        type: Boolean,
        default: false
    },
    garageConsentDate: {
        type: Date
    },
    refreshToken: {
        type: String,
        default: null
    },
    // The refresh token that was replaced by the last rotation, accepted briefly (see authController.refreshToken)
    previousRefreshToken: {
        type: String,
        default: null
    },
    refreshTokenRotatedAt: {
        type: Date,
        default: null
    },
    // One entry per signed-in device, so signing in on another device doesn't end this one's session.
    // previousToken/rotatedAt give each device a short grace window after its token is rotated.
    refreshSessions: [{
        token: { type: String, required: true },
        previousToken: { type: String, default: null },
        rotatedAt: { type: Date, default: null },
        createdAt: { type: Date, default: Date.now },
        _id: false
    }]
}, {
    timestamps: true
});

UserSchema.pre('save', async function() {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

UserSchema.methods.comparePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', UserSchema);