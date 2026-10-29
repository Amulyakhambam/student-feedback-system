require('dotenv').config();
const path = require('path');
const express = require('express');
const session = require('express-session');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SESSION_SECRET', 'ADMIN_USERNAME', 'ADMIN_PASSWORD'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) throw new Error(`Missing environment variables: ${missing.join(', ')}`);

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});
const app = express();
const production = process.env.NODE_ENV === 'production';
app.use(helmet());
app.use(express.json({ limit: '12kb' }));
app.use(session({
  name: 'feedback.sid', secret: process.env.SESSION_SECRET, resave: false, saveUninitialized: false,
  cookie: { httpOnly: true, sameSite: 'strict', secure: production, maxAge: 2 * 60 * 60 * 1000 }
}));
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const submitLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 10, standardHeaders: 'draft-8', legacyHeaders: false });
const loginLimit = rateLimit({ windowMs: 15 * 60 * 1000, limit: 8, standardHeaders: 'draft-8', legacyHeaders: false });
const clean = (value) => typeof value === 'string' ? value.trim() : '';
function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) return next();
  return res.status(401).json({ error: 'Please sign in as an administrator.' });
}

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

app.post('/api/feedback', submitLimit, async (req, res) => {
  const student_name = clean(req.body.studentName);
  const student_email = clean(req.body.studentEmail).toLowerCase();
  const course_code = clean(req.body.courseCode).toUpperCase();
  const instructor_name = clean(req.body.instructorName);
  const rating = Number(req.body.rating);
  const comments = clean(req.body.comments);
  if (student_name.length < 2 || student_name.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(student_email) || student_email.length > 254 ||
      course_code.length < 2 || course_code.length > 20 || instructor_name.length < 2 || instructor_name.length > 100 ||
      !Number.isInteger(rating) || rating < 1 || rating > 5 || comments.length < 10 || comments.length > 2000) {
    return res.status(400).json({ error: 'Check each field. Comments must be 10–2000 characters and rating must be 1–5.' });
  }
  const { error } = await supabase.from('feedback').insert({ student_name, student_email, course_code, instructor_name, rating, comments });
  if (error) return res.status(500).json({ error: 'Could not save feedback. Please try again later.' });
  return res.status(201).json({ message: 'Thank you. Your feedback has been submitted.' });
});

app.post('/api/admin/login', loginLimit, (req, res) => {
  const username = clean(req.body.username);
  const password = typeof req.body.password === 'string' ? req.body.password : '';
  if (username !== process.env.ADMIN_USERNAME || password !== process.env.ADMIN_PASSWORD) {
    return res.status(401).json({ error: 'Invalid username or password.' });
  }
  req.session.regenerate((err) => {
    if (err) return res.status(500).json({ error: 'Could not start a secure session.' });
    req.session.isAdmin = true;
    return res.json({ message: 'Signed in.' });
  });
});

app.post('/api/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => { res.clearCookie('feedback.sid'); res.json({ message: 'Signed out.' }); });
});
app.get('/api/admin/me', (req, res) => res.json({ isAdmin: Boolean(req.session && req.session.isAdmin) }));
app.get('/api/admin/feedback', requireAdmin, async (_req, res) => {
  const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false }).limit(500);
  if (error) return res.status(500).json({ error: 'Could not load feedback.' });
  return res.json({ feedback: data });
});
app.patch('/api/admin/feedback/:id', requireAdmin, async (req, res) => {
  const status = req.body.status;
  if (!['new', 'reviewed'].includes(status)) return res.status(400).json({ error: 'Status must be new or reviewed.' });
  const { data, error } = await supabase.from('feedback').update({ status }).eq('id', req.params.id).select('id').maybeSingle();
  if (error) return res.status(500).json({ error: 'Could not update feedback.' });
  if (!data) return res.status(404).json({ error: 'Feedback entry not found.' });
  return res.json({ message: 'Feedback status updated.' });
});

app.use('/api', (_req, res) => res.status(404).json({ error: 'API route not found.' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error.' });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => console.log(`Student Feedback System running at http://localhost:${port}`));
