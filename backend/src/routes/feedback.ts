import { Router } from 'express';
import multer from 'multer';
import { supabase } from '../supabaseClient.js';
import { toCamel, toCamelList } from '../transform.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

export const feedbackRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) return cb(new Error('Only image files are allowed'));
    cb(null, true);
  },
});

feedbackRouter.use(requireAuth);

// Any logged-in role can submit feedback.
feedbackRouter.post('/', upload.single('image'), async (req, res) => {
  const { message } = req.body as { message?: string };
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'message is required' });
  }

  let imageUrl: string | null = null;
  if (req.file) {
    const ext = (req.file.originalname.split('.').pop() || 'png').toLowerCase().replace(/[^a-z0-9]/g, '') || 'png';
    const path = `${req.user!.id}/${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('feedback-images')
      .upload(path, req.file.buffer, { contentType: req.file.mimetype });
    if (uploadError) return res.status(400).json({ error: uploadError.message });
    imageUrl = supabase.storage.from('feedback-images').getPublicUrl(path).data.publicUrl;
  }

  const { data, error } = await supabase
    .from('feedback')
    .insert({
      user_id: req.user!.id,
      user_name: req.user!.name,
      message: message.trim(),
      image_url: imageUrl,
      tenant_id: req.tenantId,
    })
    .select()
    .single();
  if (error) return res.status(400).json({ error: error.message });
  res.status(201).json(toCamel(data));
});

// Reviewing feedback is admin-only.
feedbackRouter.get('/', requireRole(['admin']), async (req, res) => {
  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('tenant_id', req.tenantId)
    .order('created_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(toCamelList(data ?? []));
});

feedbackRouter.put('/:id', requireRole(['admin']), async (req, res) => {
  const { status } = req.body as { status?: string };
  if (!status || !['new', 'reviewed', 'resolved'].includes(status)) {
    return res.status(400).json({ error: 'status must be one of: new, reviewed, resolved' });
  }
  const { data, error } = await supabase
    .from('feedback')
    .update({ status })
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .select()
    .maybeSingle();
  if (error) return res.status(400).json({ error: error.message });
  if (!data) return res.status(404).json({ error: 'Not found' });
  res.json(toCamel(data));
});

feedbackRouter.delete('/:id', requireRole(['admin']), async (req, res) => {
  // Verify tenant ownership before any Storage cleanup or the row delete itself.
  const { data: row, error: lookupError } = await supabase
    .from('feedback')
    .select('image_url')
    .eq('id', req.params.id)
    .eq('tenant_id', req.tenantId)
    .maybeSingle();
  if (lookupError) return res.status(500).json({ error: lookupError.message });
  if (!row) return res.status(404).json({ error: 'Not found' });

  if (row.image_url) {
    const path = row.image_url.split('/feedback-images/')[1];
    if (path) await supabase.storage.from('feedback-images').remove([path]);
  }
  const { error } = await supabase.from('feedback').delete().eq('id', req.params.id).eq('tenant_id', req.tenantId);
  if (error) return res.status(400).json({ error: error.message });
  res.status(204).send();
});
