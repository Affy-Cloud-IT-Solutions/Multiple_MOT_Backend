const {
  INITIAL_USERS,
  INITIAL_CUSTOMERS,
  INITIAL_VEHICLES,
  INITIAL_REMINDERS,
  INITIAL_ALERTS,
  INITIAL_AUDITS,
  INITIAL_TEMPLATES
} = require("./data/seedData");

class Database {
  constructor() {
    this.users = [...INITIAL_USERS];
    this.customers = [...INITIAL_CUSTOMERS];
    this.vehicles = [...INITIAL_VEHICLES];
    this.reminders = [...INITIAL_REMINDERS];
    this.alerts = [...INITIAL_ALERTS];
    this.audits = [...INITIAL_AUDITS];
    this.templates = { ...INITIAL_TEMPLATES };
  }

  // Audit log helper
  addAudit(activity, details) {
    const log = {
      id: `au_${Date.now()}`,
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      activity,
      details
    };
    this.audits.unshift(log);
    return log;
  }
}

// Global database instance
const db = new Database();

module.exports = db;
