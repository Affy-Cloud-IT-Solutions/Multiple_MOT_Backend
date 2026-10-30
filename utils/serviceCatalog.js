// Builds the services a garage can choose from during setup: only the categories the Super Admin has
// created (and kept active), each with the suggested services that belong to it.

const normalise = (value = '') => String(value).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
// "Tyres" / "Tyre replacement" -> "tyre", "Repairs" -> "repair", "MOT" stays "mot"
const firstWordStem = (value = '') => {
  const word = normalise(value).split(' ')[0] || '';
  return word.length > 3 && word.endsWith('s') ? word.slice(0, -1) : word;
};

/** The active category a service belongs to: exact name first, then the same leading word (Tyres ~ Tyre replacement). */
function findMatchingCategory(categories, categoryName) {
  const wanted = normalise(categoryName);
  if (!wanted) return null;
  const exact = categories.find(c => normalise(c.name) === wanted);
  if (exact) return exact;
  const stem = firstWordStem(categoryName);
  return categories.find(c => firstWordStem(c.name) === stem) || null;
}

/**
 * @param categories  active Super Admin categories (sorted)
 * @param suggestions services to suggest ({ name, category, price, duration, description, icon? })
 * @param resolveIcon (name, category) => { icon } for suggestions without an icon
 */
function buildServiceCatalog(categories, suggestions, resolveIcon = () => ({ icon: 'wrench' })) {
  const groups = categories.map(c => ({
    id: String(c._id || c.id || c.name),
    name: c.name,
    description: c.description || '',
    icon: c.icon || 'wrench',
    iconColor: c.iconColor || '#1677FF',
    iconBg: c.iconBg || '#1677FF15',
    services: []
  }));

  const seen = new Set();
  for (const s of suggestions) {
    const name = String(s.name || '').trim();
    const key = name.toLowerCase();
    if (!name || seen.has(key) || s.isActive === false) continue;
    const category = findMatchingCategory(categories, s.category);
    if (!category) continue; // the Super Admin has not created (or has disabled) this category
    seen.add(key);
    const group = groups.find(g => g.name === category.name);
    group.services.push({
      name,
      // Saved under the Super Admin's category name, so garages and customers see one consistent list
      category: category.name,
      price: Number(s.price) || 0,
      duration: Number(s.duration) || 45,
      description: s.description || '',
      icon: s.icon || resolveIcon(name, category.name).icon
    });
  }
  return groups;
}

module.exports = { buildServiceCatalog, findMatchingCategory };
