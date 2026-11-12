// Høntérx order desk: reads paid orders straight from Stripe (no database needed).
// Protected by the ADMIN_PASSWORD environment variable set in Vercel.
const crypto = require('crypto');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
function same(a, b) {
  const x = Buffer.from(String(a || '')), y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const key = process.env.STRIPE_SECRET_KEY;
  const pw = process.env.ADMIN_PASSWORD;
  if (!key) return res.status(500).json({ error: 'Stripe is not connected yet.' });
  if (!pw || pw.length < 8) return res.status(500).json({ error: 'The orders password is not set up yet (ADMIN_PASSWORD in Vercel, at least 8 characters).' });
  let body = {};
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {}); } catch (e) {}
  if (!same(body.password, pw)) { await sleep(800); return res.status(401).json({ error: 'Wrong password.' }); }

  const stripe = async (path, opt) => {
    const r = await fetch('https://api.stripe.com/v1' + path, Object.assign({ headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/x-www-form-urlencoded' } }, opt || {}));
    const d = await r.json();
    if (!r.ok) throw new Error((d && d.error && d.error.message) || 'Stripe error');
    return d;
  };

  try {
    if (body.action === 'ship') {
      const pi = String(body.pi || '');
      if (!/^pi_[A-Za-z0-9_]+$/.test(pi)) return res.status(400).json({ error: 'Bad order.' });
      const p = new URLSearchParams();
      if (body.shipped) { p.append('metadata[shipped]', '1'); p.append('metadata[shipped_at]', new Date().toISOString()); }
      else { p.append('metadata[shipped]', ''); p.append('metadata[shipped_at]', ''); }
      await stripe('/payment_intents/' + pi, { method: 'POST', body: p });
      return res.status(200).json({ ok: true });
    }

    const list = await stripe('/checkout/sessions?limit=100&expand[]=data.payment_intent');
    const done = (list.data || []).filter((s) => s.status === 'complete');
    const orders = await Promise.all(done.map(async (s) => {
      let items = [];
      try {
        const li = await stripe('/checkout/sessions/' + s.id + '/line_items?limit=50&expand[]=data.price.product');
        items = (li.data || []).map((l) => {
          const pr = (l.price && l.price.product && typeof l.price.product === 'object') ? l.price.product : {};
          const md = pr.metadata || {};
          return { name: l.description || pr.name || 'Item', size: md.size || (pr.description || '').replace(/^Size:\s*/i, '') || '', qty: l.quantity || 1, id: md.product_id || '' };
        });
      } catch (e) {}
      const ship = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || null;
      const cd = s.customer_details || {};
      const a = (ship && ship.address) || cd.address || {};
      const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
      const md = (pi && pi.metadata) || {};
      return {
        id: s.id,
        pi: pi ? pi.id : (typeof s.payment_intent === 'string' ? s.payment_intent : ''),
        created: s.created * 1000,
        paid: s.payment_status === 'paid',
        name: (ship && ship.name) || cd.name || '',
        email: cd.email || s.customer_email || '',
        phone: cd.phone || '',
        address: { line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', state: a.state || '', postal_code: a.postal_code || '', country: a.country || '' },
        items,
        total: (s.amount_total || 0) / 100,
        currency: String(s.currency || '').toUpperCase(),
        shipped: md.shipped === '1',
        shippedAt: md.shipped_at || ''
      };
    }));
    orders.sort((x, y) => y.created - x.created);
    return res.status(200).json({ orders });
  } catch (e) {
    return res.status(502).json({ error: 'Could not reach Stripe: ' + (e && e.message ? e.message : 'unknown error') });
  }
};
