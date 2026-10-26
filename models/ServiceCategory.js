const mongoose = require('mongoose');

const ServiceCategorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Category name is required'],
    unique: true,
    trim: true,
  },
  description: {
    type: String,
    default: '',
    trim: true,
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
  sortOrder: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isDefault: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('ServiceCategory', ServiceCategorySchema);
