const Alert = require('../models/Alert');

const sameId = (a, b) => a !== undefined && a !== null && b !== undefined && b !== null && String(a) === String(b);

/**
 * Who may read/change a customer record (and that customer's vehicles):
 * - platform admin: everyone
 * - customer: only themselves (by customerId, or by login email)
 * - garage admin/staff: customers linked to their garage (garageId/garageIds) or who have booked there
 */
async function canAccessCustomer(user, customer) {
  if (!user || !customer) return false;
  if (user.role === 'admin') return true;

  if (user.role === 'customer') {
    if (sameId(customer._id, user.customerId)) return true;
    return Boolean(user.email && customer.email &&
      String(customer.email).toLowerCase().trim() === String(user.email).toLowerCase().trim());
  }

  if ((user.role === 'garage_admin' || user.role === 'staff') && user.garageId) {
    if (sameId(customer.garageId, user.garageId)) return true;
    if (Array.isArray(customer.garageIds) && customer.garageIds.some(g => sameId(g, user.garageId))) return true;
    return Boolean(await Alert.exists({ garageId: user.garageId, customerId: customer._id }));
  }

  return false;
}

module.exports = { canAccessCustomer };
