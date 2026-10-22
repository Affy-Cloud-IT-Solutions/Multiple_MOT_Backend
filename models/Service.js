const mongoose = require('mongoose');

const ServiceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Service name is required'],
    trim: true,
  },
  title: {
    type: String,
    trim: true,
  },
  category: {
    type: String,
    default: 'Servicing',
    trim: true,
  },
  price: {
    type: Number,
    default: 45,
    min: 0,
  },
  duration: {
    type: Number,
    default: 45,
    min: 5,
  },
  icon: {
    type: String,
    default: 'wrench',
    trim: true,
  },
  iconBg: {
    type: String,
    default: '#1677FF15',
    trim: true,
  },
  iconColor: {
    type: String,
    default: '#1677FF',
    trim: true,
  },
  searchQuery: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Service', ServiceSchema);
