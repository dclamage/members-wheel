export const slugify = (name) =>
  (name || '')
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '');

export const withSlug = (wheel, existing = []) => {
  const usedSlugs = new Set(existing.map((item) => item.slug));
  const baseSlug = slugify(wheel.name) || `wheel-${wheel.id}`;
  let slug = baseSlug;
  if (usedSlugs.has(slug)) {
    slug = `${baseSlug}-${wheel.id}`;
  }
  return {
    ...wheel,
    slug,
  };
};

export const assignSlugsToList = (items) => {
  const prepared = [];
  items.forEach((item) => {
    prepared.push(withSlug(item, prepared));
  });
  return prepared;
};

export default slugify;
