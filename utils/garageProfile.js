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
  const hasDocuments = Array.isArray(g.verificationDocuments) && g.verificationDocuments.length > 0;

  const steps = {
    location: Boolean(g.locationConfigured) || hasRealLocation,
    // Must have something customers can actually book
    services: hasActiveService,
    documents: Boolean(g.documentsConfigured) || hasDocuments
  };
  const missing = Object.keys(steps).filter(key => !steps[key]);
  return { complete: missing.length === 0, steps, missing };
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
