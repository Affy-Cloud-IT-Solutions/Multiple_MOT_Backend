// Garage profile completion - mirrors the "Complete your profile" checklist in the garage admin app
// (registration, location, services & pricing, MOT/DVLA documents).
// Approved garages are shown to customers irrespective of whether setup profile is 100% complete.
// A "Verified" badge is shown to customers only when profile & documents are 100% complete.

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
  const validDocuments = documents.filter(d => d && (d.fileUrl || d.url || d.name));
  const hasDocuments = validDocuments.length > 0;
  // A rejected document needs a new copy before the documents step counts as done again
  const hasRejectedDocuments = validDocuments.some(d => d && d.status === 'Rejected');
  // After a full application rejection the garage must save these steps again
  const redoSteps = Array.isArray(g.redoSteps) ? g.redoSteps : [];

  // Documents step: marked done ONLY when documents are genuinely uploaded and not rejected.
  // Never tick documents on its own if no real files were uploaded.
  const isDocUploaded = hasDocuments && !hasRejectedDocuments;

  const steps = {
    location: (Boolean(g.locationConfigured) || hasRealLocation) && !redoSteps.includes('location'),
    // Must have something customers can actually book
    services: hasActiveService && !redoSteps.includes('services'),
    documents: isDocUploaded
  };
  const missing = Object.keys(steps).filter(key => !steps[key]);
  // 4-item checklist: registration (done) + location + services + documents uploaded
  const completedCount = 1 + (steps.location ? 1 : 0) + (steps.services ? 1 : 0) + (isDocUploaded ? 1 : 0);
  const percent = Math.round((completedCount / 4) * 100);
  return { complete: percent === 100 && missing.length === 0, steps, missing, percent };
}

function isGarageVisibleToCustomers(garage, isProfileMandatory = false) {
  if (!garage) return false;
  // Strictly hidden if Rejected or Blacklisted
  if (garage.status === 'Rejected' || garage.status === 'Blacklisted') return false;

  // Garages must be approved by Super Admin to appear to customers
  if (garage.status !== 'Approved') return false;

  // When profile completion is set to mandatory by Super Admin, 100% completion is strictly required
  if (isProfileMandatory) {
    const { percent } = getGarageProfileCompletion(garage);
    return percent === 100;
  }

  // When profile completion is optional, any Approved garage is shown (7-day grace period for docs)
  return true;
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
