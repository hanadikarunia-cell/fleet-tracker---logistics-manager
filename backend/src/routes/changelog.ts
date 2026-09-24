import { Router } from 'express';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList } from '../transform.js';
import { requireIdentity, requireRole } from '../middleware/auth.js';

export const changelogRouter = Router();

type BumpType = 'major' | 'minor' | 'patch';

function bumpVersion(current: string, bump: BumpType): string {
  const [major, minor, patch] = current.split('.').map((n) => Number(n) || 0);
  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

// The changelog is platform-wide, not tenant data, so it only needs an identity (a
// platform-only login has no tenant).
changelogRouter.use(requireIdentity);

// Any logged-in role can see the changelog / current version.
changelogRouter.get('/', async (_req, res) => {
  const { data, error } = await supabase.from('changelog').select('*').order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(toCamelList(data ?? []));
});

// Only admins publish new version entries. The version number is computed server-side from
// the bump type, so authors never have to track or type the next semver themselves.
changelogRouter.post('/', requireRole(['admin']), async (req, res) => {
  const { bumpType, title, changes } = req.body as { bumpType?: BumpType; title?: string; changes?: string[] };
  if (!bumpType || !['major', 'minor', 'patch'].includes(bumpType)) {
    return res.status(400).json({ error: 'bumpType must be one of: major, minor, patch' });
  }
  if (!title || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }
  const cleanChanges = Array.isArray(changes) ? changes.map((c) => String(c).trim()).filter(Boolean) : [];
  if (cleanChanges.length === 0) {
    return res.status(400).json({ error: 'At least one change entry is required' });
  }

  const { data: latest, error: latestError } = await supabase
    .from('changelog')
    .select('version')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (latestError) return res.status(500).json({ error: latestError.message });

  // No prior entries yet: treat this app as already at a 1.0.0 baseline, so the first
  // published entry bumps forward from there instead of starting at 0.x.
  const nextVersion = bumpVersion(latest?.version ?? '1.0.0', bumpType);

  const { data, error } = await supabase
    .from('changelog')
    .insert({
      version: nextVersion,
      bump_type: bumpType,
      title: title.trim(),
      changes: cleanChanges,
      created_by: req.user!.name,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(toCamel(data));
});

// Editing is limited to the title/changes text — the version number and bump type stay fixed
// once published so the semver history never gets out of sync with what was actually released.
changelogRouter.put('/:id', requireRole(['admin']), async (req, res) => {
  const { title, changes } = req.body as { title?: string; changes?: string[] };
  const update: Record<string, unknown> = {};
  if (title !== undefined) {
    if (!title.trim()) return res.status(400).json({ error: 'title cannot be empty' });
    update.title = title.trim();
  }
  if (changes !== undefined) {
    const cleanChanges = Array.isArray(changes) ? changes.map((c) => String(c).trim()).filter(Boolean) : [];
    if (cleanChanges.length === 0) return res.status(400).json({ error: 'At least one change entry is required' });
    update.changes = cleanChanges;
  }
  const { data, error } = await supabase.from('changelog').update(update).eq('id', req.params.id).select().maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(toCamel(data));
});

changelogRouter.delete('/:id', requireRole(['admin']), async (req, res) => {
  const { error } = await supabase.from('changelog').delete().eq('id', req.params.id);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});
