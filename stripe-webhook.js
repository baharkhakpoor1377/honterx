// Stripe tells this address when a customer has paid. We then email them a thank-you.
// Safe by design: we never trust the message itself. We only take the session id from it,
// then ask Stripe directly whether that session is really paid, and we only ever send once per order.
const mail = require('./mail.js');

module.exports = async (req, res) => {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Stripe is not connected yet.' });
  try {
    const ev = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const sid = ev && ev.data && ev.data.object && ev.data.object.id;
    if (ev.type !== 'checkout.session.completed' || !/^cs_(test|live)_[A-Za-z0-9]+$/.test(String(sid || ''))) return res.status(200).json({ ignored: true });
    const stripe = async (path, opt) => {
      const r = await fetch('https://api.stripe.com/v1' + path, Object.assign({ headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' } }, opt || {}));
      const d = await r.json();
      if (!r.ok) throw new Error((d && d.error && d.error.message) || 'Stripe error');
      return d;
    };
    const o = await mail.loadOrder(stripe, sid);
    if (!o.paid || !o.pi) return res.status(200).json({ ignored: 'not paid' });
    if (o.meta.thanks_sent === '1') return res.status(200).json({ ignored: 'already sent' });
    const r = await mail.send(o.email, mail.thankYou(o));
    if (r.sent) {
      const p = new URLSearchParams(); p.append('metadata[thanks_sent]', '1');
      await stripe('/payment_intents/' + o.pi, { method: 'POST', body: p });
    }
    return res.status(200).json({ ok: true, result: r.sent ? 'sent' : r.skipped });
  } catch (e) {
    // 500 makes Stripe retry later, which is what we want if email or Stripe hiccuped.
    return res.status(500).json({ error: String(e && e.message || e) });
  }
};
