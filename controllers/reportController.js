const Customer = require('../models/Customer');
const Vehicle = require('../models/Vehicle');
const Reminder = require('../models/Reminder');
const Alert = require('../models/Alert');
const Audit = require('../models/Audit');
const Garage = require('../models/Garage');
const { getDaysDiff, formatCSV } = require('../utils/helpers');
const PDFDocument = require('pdfkit');
const XLSX = require('xlsx');

// Generic function to generate PDF report
function generatePDFReport(res, title, headers, displayHeaders, data) {
  const doc = new PDFDocument({ margin: 30, size: 'A4', layout: 'landscape' });
  
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.toLowerCase().replace(/ /g, '_')}.pdf"`);
  
  doc.pipe(res);
  
  // Title
  doc.fontSize(18).text(title, { align: 'center' });
  doc.moveDown(1);
  
  // Date generated
  doc.fontSize(10).text(`Generated: ${new Date().toLocaleString()}`, { align: 'right' });
  doc.moveDown(1.5);
  
  // Table settings
  const startX = 30;
  const startY = doc.y;
  const tableWidth = doc.page.width - 60; // Landscape A4 width is 841.89
  const colWidth = tableWidth / displayHeaders.length;
  
  // Draw header background
  doc.rect(startX, startY, tableWidth, 20).fill('#1E293B').stroke();
  
  // Draw headers text
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold');
  displayHeaders.forEach((header, index) => {
    doc.text(header, startX + (index * colWidth) + 5, startY + 5, { width: colWidth - 10, lineBreak: false });
  });
  
  let currentY = startY + 20;
  
  // Draw rows
  doc.fillColor('#000000').font('Helvetica');
  data.forEach((row, rowIndex) => {
    if (currentY > 500) { // page height is 595.28
      doc.addPage({ margin: 30, size: 'A4', layout: 'landscape' });
      currentY = 40;
      
      // Header on new page
      doc.rect(startX, currentY, tableWidth, 20).fill('#1E293B').stroke();
      doc.fillColor('#FFFFFF').font('Helvetica-Bold');
      displayHeaders.forEach((header, index) => {
        doc.text(header, startX + (index * colWidth) + 5, currentY + 5, { width: colWidth - 10, lineBreak: false });
      });
      currentY += 20;
      doc.fillColor('#000000').font('Helvetica');
    }
    
    // Alternate backgrounds
    if (rowIndex % 2 === 1) {
      doc.rect(startX, currentY, tableWidth, 18).fill('#F1F5F9').stroke('#E2E8F0');
    } else {
      doc.rect(startX, currentY, tableWidth, 18).stroke('#E2E8F0');
    }
    
    doc.fillColor('#334155').fontSize(8);
    headers.forEach((header, colIndex) => {
      const text = String(row[header] !== undefined && row[header] !== null ? row[header] : '');
      doc.text(text, startX + (colIndex * colWidth) + 5, currentY + 5, { width: colWidth - 10, lineBreak: false });
    });
    
    currentY += 18;
  });
  
  doc.end();
}

// Generic function to generate Excel report
function generateExcelReport(res, filename, sheetName, headers, displayHeaders, data) {
  // Map data keys to display headers
  const formattedData = data.map(row => {
    const newRow = {};
    headers.forEach((header, index) => {
      newRow[displayHeaders[index]] = row[header] !== undefined && row[header] !== null ? row[header] : '';
    });
    return newRow;
  });
  
  const worksheet = XLSX.utils.json_to_sheet(formattedData, { header: displayHeaders });
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  
  const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename.toLowerCase().replace(/ /g, '_')}.xlsx"`);
  res.send(buf);
}

// Helper to check if MOT is due soon
async function getMOTDueReportData(req) {
  const role = req.user?.role;
  const garageId = req.user?.garageId;
  const { startDate, endDate } = req.query;

  let vehicleQuery = { status: 'Active' };
  if (role === 'garage_admin' || role === 'staff') {
    const garageAlerts = await Alert.find({ garageId }).select('customerId');
    const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
    vehicleQuery.customerId = { $in: customerIds };
  }

  if (startDate || endDate) {
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    vehicleQuery.motExpiryDate = dateQuery;
  }

  const vehicles = await Vehicle.find(vehicleQuery);
  const customers = await Customer.find({});

  return vehicles.map(v => {
    const customer = customers.find(c => c._id.toString() === v.customerId.toString());
    const daysLeft = getDaysDiff(v.motExpiryDate, '2026-07-22');
    return {
      registrationNumber: v.registrationNumber,
      make: v.make,
      model: v.model,
      motExpiryDate: v.motExpiryDate.toISOString().substring(0, 10),
      daysRemaining: daysLeft,
      customerName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
      customerContact: customer ? customer.mobile : 'N/A'
    };
  });
}

async function getReminderSentReportData(req) {
  const role = req.user?.role;
  const garageId = req.user?.garageId;
  const { startDate, endDate } = req.query;

  let vehicleQuery = {};
  if (role === 'garage_admin' || role === 'staff') {
    const garageAlerts = await Alert.find({ garageId }).select('customerId');
    const customerIds = [...new Set(garageAlerts.filter(a => a.customerId).map(a => a.customerId.toString()))];
    vehicleQuery.customerId = { $in: customerIds };
  }

  const matchingVehicles = await Vehicle.find(vehicleQuery).select('_id');
  const vehicleIds = matchingVehicles.map(v => v._id);

  let reminderQuery = { vehicleId: { $in: vehicleIds } };
  if (startDate || endDate) {
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    reminderQuery.createdAt = dateQuery;
  }

  const reminders = await Reminder.find(reminderQuery);
  const vehicles = await Vehicle.find({});
  const customers = await Customer.find({});

  return reminders.map(rem => {
    const vehicle = vehicles.find(v => v._id.toString() === rem.vehicleId.toString());
    const customer = vehicle ? customers.find(c => c._id.toString() === vehicle.customerId.toString()) : null;
    return {
      reminderId: rem._id.toString(),
      registrationNumber: vehicle ? vehicle.registrationNumber : 'N/A',
      makeModel: vehicle ? `${vehicle.make} ${vehicle.model}` : 'N/A',
      recipientName: customer ? `${customer.firstName} ${customer.lastName}` : 'Unknown',
      contactMethod: customer ? customer.preferredContact : 'N/A',
      reminderType: rem.reminderType,
      sentTimestamp: rem.sentTimestamp ? rem.sentTimestamp.toISOString().replace('T', ' ').substring(0, 16) : 'N/A',
      sentStatus: rem.sentStatus ? 'Sent' : 'Failed'
    };
  });
}

async function getCustomerResponseReportData(req) {
  const role = req.user?.role;
  const garageId = req.user?.garageId;
  const { startDate, endDate } = req.query;

  let query = {
    $or: [
      { activity: { $regex: 'Requested', $options: 'i' } },
      { activity: { $regex: 'Changed', $options: 'i' } },
      { activity: { $regex: 'Booked', $options: 'i' } },
      { activity: { $regex: 'Rescheduled', $options: 'i' } }
    ]
  };

  if (startDate || endDate) {
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    query.createdAt = dateQuery;
  }

  const audits = await Audit.find(query).sort({ date: -1 });

  // Filter logs associated with the garage's customer names or garage name
  if (role === 'garage_admin' || role === 'staff') {
    const garageAlerts = await Alert.find({ garageId }).select('customerName');
    const customerNames = [...new Set(garageAlerts.filter(a => a.customerName).map(a => a.customerName.toLowerCase()))];
    const garageObj = await Garage.findById(garageId);
    const garageName = garageObj ? garageObj.name.toLowerCase() : '';

    return audits.filter(au => {
      const detailsLower = au.details.toLowerCase();
      const matchCustomer = customerNames.some(name => detailsLower.includes(name));
      const matchGarage = garageName ? detailsLower.includes(garageName) : false;
      return matchCustomer || matchGarage;
    }).map(au => ({
      auditId: au._id.toString(),
      timestamp: au.date.toISOString().replace('T', ' ').substring(0, 16),
      activity: au.activity,
      details: au.details
    }));
  }

  return audits.map(au => ({
    auditId: au._id.toString(),
    timestamp: au.date.toISOString().replace('T', ' ').substring(0, 16),
    activity: au.activity,
    details: au.details
  }));
}

async function getBookedMOTReportData(req) {
  const role = req.user?.role;
  const garageId = req.user?.garageId;
  const { startDate, endDate } = req.query;

  let query = { type: 'BOOKED' };
  if (role === 'garage_admin' || role === 'staff') {
    query.garageId = garageId;
  }

  if (startDate || endDate) {
    let dateQuery = {};
    if (startDate) dateQuery.$gte = new Date(startDate);
    if (endDate) dateQuery.$lte = new Date(endDate);
    query.date = dateQuery;
  }

  const bookingAlerts = await Alert.find(query);
  return bookingAlerts.map(b => ({
    alertId: b._id.toString(),
    customerName: b.customerName,
    registrationNumber: b.registrationNumber,
    makeModel: b.makeModel,
    requestDate: b.date.toISOString().replace('T', ' ').substring(0, 16),
    status: b.status
  }));
}

// Route handlers
async function getMOTDueReport(req, res) {
  try {
    const data = await getMOTDueReportData(req);
    const { format } = req.query;
    const headers = ['registrationNumber', 'make', 'model', 'motExpiryDate', 'daysRemaining', 'customerName', 'customerContact'];
    const displayHeaders = ['Registration', 'Make', 'Model', 'Expiry Date', 'Days Left', 'Customer Name', 'Contact'];

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=mot_due_report.csv');
      return res.send(formatCSV(data, headers));
    }
    
    if (format === 'excel') {
      return generateExcelReport(res, 'mot_due_report', 'MOT Due', headers, displayHeaders, data);
    }
    
    if (format === 'pdf') {
      return generatePDFReport(res, 'MOT Due Report', headers, displayHeaders, data);
    }
    
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getReminderSentReport(req, res) {
  try {
    const data = await getReminderSentReportData(req);
    const { format } = req.query;
    const headers = ['reminderId', 'registrationNumber', 'makeModel', 'recipientName', 'contactMethod', 'reminderType', 'sentTimestamp', 'sentStatus'];
    const displayHeaders = ['Reminder ID', 'Reg Number', 'Vehicle', 'Recipient', 'Method', 'Type', 'Sent Time', 'Status'];

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=reminders_sent_report.csv');
      return res.send(formatCSV(data, headers));
    }

    if (format === 'excel') {
      return generateExcelReport(res, 'reminders_sent_report', 'Reminders Sent', headers, displayHeaders, data);
    }
    
    if (format === 'pdf') {
      return generatePDFReport(res, 'Reminder Sent Report', headers, displayHeaders, data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getCustomerResponseReport(req, res) {
  try {
    const data = await getCustomerResponseReportData(req);
    const { format } = req.query;
    const headers = ['auditId', 'timestamp', 'activity', 'details'];
    const displayHeaders = ['Audit ID', 'Timestamp', 'Activity', 'Details'];

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=customer_response_report.csv');
      return res.send(formatCSV(data, headers));
    }

    if (format === 'excel') {
      return generateExcelReport(res, 'customer_response_report', 'Customer Responses', headers, displayHeaders, data);
    }
    
    if (format === 'pdf') {
      return generatePDFReport(res, 'Customer Response Report', headers, displayHeaders, data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

async function getBookedMOTReport(req, res) {
  try {
    const data = await getBookedMOTReportData(req);
    const { format } = req.query;
    const headers = ['alertId', 'customerName', 'registrationNumber', 'makeModel', 'requestDate', 'status'];
    const displayHeaders = ['Alert ID', 'Customer Name', 'Registration', 'Vehicle', 'Request Date', 'Status'];

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=booked_mots_report.csv');
      return res.send(formatCSV(data, headers));
    }

    if (format === 'excel') {
      return generateExcelReport(res, 'booked_mots_report', 'Booked MOTs', headers, displayHeaders, data);
    }
    
    if (format === 'pdf') {
      return generatePDFReport(res, 'Booked MOT Report', headers, displayHeaders, data);
    }

    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

module.exports = {
  getMOTDueReport,
  getReminderSentReport,
  getCustomerResponseReport,
  getBookedMOTReport
};
