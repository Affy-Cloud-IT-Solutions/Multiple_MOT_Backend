// Garage profile completion - mirrors the "Complete your profile" checklist in the garage admin app
// (registration, location, services & pricing, MOT/DVLA documents). A garage is only shown to customers
// once it is Approved AND its profile is complete.

// Schema defaults for latitude/longitude (central London) - not a real configured location
const DEFAULT_LATITUDE = 51.5074;
const DEFAULT_LONGITUDE = -0.1278;

function getGarageProfileCompletion(garage) {
  const g = garage || {};
  const hasRealLocation =
    Boolean(String(g.address || '').trim() && String(g.postcode || '').trim()) &&
    !(Number(g.latitude) === DEFAULT_LATITUDE && Number(g.longitude) === DEFAULT_LONGITUDE);
  const hasActiveService = Array.isArray(g.services) && g.services.some(s => s && s.isActive !== false);
  const documents = Array.isArray(g.verificationDocuments) ? g.verificationDocuments : [];
  const hasDocuments = documents.length > 0;
  // A rejected document needs a new copy before the documents step counts as done again
  const hasRejectedDocuments = documents.some(d => d && d.status === 'Rejected');
  // After a full application rejection the garage must save these steps again
  const redoSteps = Array.isArray(g.redoSteps) ? g.redoSteps : [];

  const steps = {
    location: (Boolean(g.locationConfigured) || hasRealLocation) && !redoSteps.includes('location'),
    // Must have something customers can actually book
    services: hasActiveService && !redoSteps.includes('services'),
    documents: (Boolean(g.documentsConfigured) || hasDocuments) && !hasRejectedDocuments
  };
  const missing = Object.keys(steps).filter(key => !steps[key]);
  // Same 4-item checklist the garage admin sees: registration (always done once the garage exists) + the 3 steps
  const totalTasks = Object.keys(steps).length + 1;
  const percent = Math.round(((totalTasks - missing.length) / totalTasks) * 100);
  return { complete: missing.length === 0, steps, missing, percent };
}

function isGarageVisibleToCustomers(garage) {
  return Boolean(garage) && garage.status === 'Approved' && getGarageProfileCompletion(garage).complete;
}

/** Platform admins and the garage's own admin/staff can always see and manage it. */
function canManageGarage(user, garage) {
  if (!user || !garage) return false;
  if (user.role === 'admin') return true;
  return (user.role === 'garage_admin' || user.role === 'staff') && String(user.garageId) === String(garage._id || garage.id);
}

module.exports = {
  getGarageProfileCompletion,
  isGarageVisibleToCustomers,
  canManageGarage,
  DEFAULT_LATITUDE,
  DEFAULT_LONGITUDE
};
