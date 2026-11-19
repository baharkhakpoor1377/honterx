// Vercel serverless function: creates a Stripe Checkout session.
// Needs the environment variable STRIPE_SECRET_KEY (set in Vercel > Settings > Environment Variables).
// Prices live HERE (server side), so customers can't change what they pay.
const CATALOG = {
  "xh1": {
    "name": "S11 Hoodie",
    "tone": "Carbon Grey",
    "price": 92.5
  },
  "xh2": {
    "name": "S5 Hoodie",
    "tone": "Team Red",
    "price": 89.99
  },
  "xh3": {
    "name": "S10 Hoodie",
    "tone": "Navy Blazer",
    "price": 89.99
  },
  "xh4": {
    "name": "S9 Hoodie",
    "tone": "Adobe",
    "price": 89.99
  },
  "xh5": {
    "name": "S8 Hoodie",
    "tone": "Military Green",
    "price": 58.0
  },
  "xh6": {
    "name": "S7 Hoodie",
    "tone": "Oatmeal Heather",
    "price": 89.99
  },
  "xh7": {
    "name": "S6 Hoodie",
    "tone": "Team Royal",
    "price": 89.99
  },
  "xh8": {
    "name": "S4 Hoodie",
    "tone": "Team Red",
    "price": 89.99
  },
  "xh9": {
    "name": "S3 Hoodie",
    "tone": "Khaki",
    "price": 90.99
  },
  "xt1": {
    "name": "TS1 Tee",
    "tone": "Heather Grey",
    "price": 60.0
  },
  "xt2": {
    "name": "TS2 Tee",
    "tone": "French Navy",
    "price": 65.0
  },
  "xt3": {
    "name": "TS3 Tee",
    "tone": "Black",
    "price": 65.0
  },
  "xt4": {
    "name": "TS4 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt5": {
    "name": "TS5 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt6": {
    "name": "TS6 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt8": {
    "name": "TS8 Tee",
    "tone": "French Navy",
    "price": 65.0
  },
  "xh10": {
    "name": "S12 Hoodie",
    "tone": "Black",
    "price": 89.99
  },
  "xt11": {
    "name": "TS11 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt12": {
    "name": "TS12 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt13": {
    "name": "TS13 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt14": {
    "name": "TS14 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xh12": {
    "name": "S14 Hoodie",
    "tone": "Bottle Green / Green Paw",
    "price": 89.99
  },
  "xh13": {
    "name": "S15 Hoodie",
    "tone": "Charcoal Melange / Gold Paw",
    "price": 89.99
  },
  "xh14": {
    "name": "S16 Hoodie",
    "tone": "Burgundy / White Paw",
    "price": 89.99
  },
  "xh15": {
    "name": "S17 Hoodie",
    "tone": "Black / Green Paw",
    "price": 89.99
  },
  "xh16": {
    "name": "S18 Hoodie",
    "tone": "Black / Dark Red Paw",
    "price": 89.99
  },
  "xh17": {
    "name": "S19 Hoodie",
    "tone": "Black / Red Paw",
    "price": 89.99
  },
  "xh18": {
    "name": "S20 Hoodie",
    "tone": "White / Tan Paw",
    "price": 89.99
  },
  "xh19": {
    "name": "S21 Hoodie",
    "tone": "White / Multicolor Paw",
    "price": 89.99
  },
  "xh20": {
    "name": "S22 Hoodie",
    "tone": "Latte",
    "price": 89.99
  },
  "xh21": {
    "name": "S23 Hoodie",
    "tone": "Navy Blazer",
    "price": 89.99
  },
  "xh22": {
    "name": "S24 Hoodie",
    "tone": "Team Royal / Light Blue Paw",
    "price": 89.99
  },
  "xh23": {
    "name": "S25 Hoodie",
    "tone": "Team Royal / Yellow Paw",
    "price": 89.99
  },
  "xh24": {
    "name": "S26 Hoodie",
    "tone": "Military Green",
    "price": 89.99
  },
  "xh25": {
    "name": "S27 Hoodie",
    "tone": "Sky Blue",
    "price": 89.99
  },
  "xh11": {
    "name": "S13 Hoodie",
    "tone": "Carolina Blue",
    "price": 89.99
  },
  "xa1": {
    "name": "CS1 Dad Cap",
    "tone": "Navy",
    "price": 45.0
  },
  "xa2": {
    "name": "CS2 Dad Cap",
    "tone": "Black",
    "price": 45.0
  },
  "xa3": {
    "name": "CS3 Dad Cap",
    "tone": "Navy",
    "price": 45.0
  },
  "xa4": {
    "name": "CS4 Dad Cap",
    "tone": "Black",
    "price": 45.0
  }
};
const SIZES = ['S', 'M', 'L', 'XL', '2XL', '3XL', 'One size'];

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Checkout is not set up yet.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const currency = body.currency === 'usd' ? 'usd' : 'cad';
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    const params = new URLSearchParams();
    let n = 0;
    const unknown = [];
    for (const it of items) {
      const p = CATALOG[it.id];
      const qty = Math.floor(Number(it.qty));
      if (!p) { unknown.push(String(it.name || it.id)); continue; }
      if (!(qty >= 1 && qty <= 10)) continue;
      const size = SIZES.includes(it.size) ? it.size : 'One size';
      params.append(`line_items[${n}][quantity]`, String(qty));
      params.append(`line_items[${n}][price_data][currency]`, currency);
      params.append(`line_items[${n}][price_data][unit_amount]`, String(Math.round(p.price * 100)));
      params.append(`line_items[${n}][price_data][product_data][name]`, `${p.name} - ${p.tone}`);
      params.append(`line_items[${n}][price_data][product_data][description]`, `Size: ${size}`);
      params.append(`line_items[${n}][price_data][product_data][metadata][product_id]`, it.id);
      params.append(`line_items[${n}][price_data][product_data][metadata][size]`, size);
      n++;
    }
    if (unknown.length) return res.status(400).json({ error: 'Some items in your bag are no longer available (' + unknown.join(', ') + '). Please remove them and try again.' });
    if (!n) return res.status(400).json({ error: 'Your bag is empty.' });
    const host = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
    const origin = `https://${host}`;
    params.append('mode', 'payment');
    params.append('success_url', `${origin}/?paid=1`);
    params.append('cancel_url', `${origin}/`);
    params.append('shipping_address_collection[allowed_countries][0]', 'CA');
    params.append('shipping_address_collection[allowed_countries][1]', 'US');
    params.append('phone_number_collection[enabled]', 'true');
    const email = String(body.email || '').trim();
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) params.append('customer_email', email);
    const r = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const d = await r.json();
    if (!r.ok || !d.url) {
      const why = d && d.error && d.error.message ? String(d.error.message) : '';
      console.error('Stripe checkout error', r.status, why);
      return res.status(502).json({ error: 'Could not start checkout. Please try again.' + (why ? ' (' + why.slice(0, 140) + ')' : '') });
    }
    return res.status(200).json({ url: d.url });
  } catch (e) {
    console.error('Checkout exception', e && e.message);
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
