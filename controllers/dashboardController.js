const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const Garage = require('../models/Garage');
const { getDaysDiff } = require('../utils/helpers');

async function getDashboardStats(req, res) {
  try {
    const role = req.user?.role;
    const garageId = req.user?.garageId;

    let vehicleQuery = {};
    let customerCount = 0;
    let auditCount = 0;
    let alertQuery = { type: 'BOOKED' };

    if (role === 'garage_admin' || role === 'staff') {
      const garageAlerts = await Alert.find({ garageId }).select('customerId');
      const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
      vehicleQuery.customerId = { $in: customerIds };
      customerCount = customerIds.length;
      alertQuery.garageId = garageId;
      
      // Count matching audits
      const audits = await Audit.find({
        $or: [
          { activity: { $regex: 'Requested', $options: 'i' } },
          { activity: { $regex: 'Changed', $options: 'i' } },
          { activity: { $regex: 'Booked', $options: 'i' } },
          { activity: { $regex: 'Rescheduled', $options: 'i' } }
        ]
      });
      
      const garageAlertsAll = await Alert.find({ garageId }).select('customerName');
      const customerNames = [...new Set(garageAlertsAll.filter(a => a.customerName).map(a => a.customerName.toLowerCase()))];
      const garageObj = await Garage.findById(garageId);
      const garageName = garageObj ? garageObj.name.toLowerCase() : '';
      
      const matchingAudits = audits.filter(au => {
        const detailsLower = au.details.toLowerCase();
        const matchCustomer = customerNames.some(name => detailsLower.includes(name));
        const matchGarage = garageName ? detailsLower.includes(garageName) : false;
        return matchCustomer || matchGarage;
      });
      auditCount = matchingAudits.length;
    } else {
      customerCount = await Customer.countDocuments({});
      auditCount = await Audit.countDocuments({});
    }

    const activeVehicles = await Vehicle.find({ ...vehicleQuery, status: 'Active' });
    const soldCount = await Vehicle.countDocuments({ ...vehicleQuery, status: 'Sold' });
    const bookedCount = await Alert.countDocuments(alertQuery);

    let due7 = 0;
    let due30 = 0;
    let due45 = 0;

    activeVehicles.forEach(v => {
      const diff = getDaysDiff(v.motExpiryDate, '2026-07-22');
      if (diff >= 0 && diff <= 7) {
        due7++;
      } else if (diff > 7 && diff <= 30) {
        due30++;
      } else if (diff > 30 && diff <= 45) {
        due45++;
      }
    });

    res.json({
      totalCustomers: customerCount,
      activeVehicles: activeVehicles.length,
      dueIn7Days: due7,
      dueIn30Days: due30,
      dueIn45Days: due45,
      vehiclesSold: soldCount,
      bookedMots: bookedCount,
      totalAudits: auditCount
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getDashboardStats
};
