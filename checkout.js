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
  "xt7": {
    "name": "TS7 Tee",
    "tone": "White",
    "price": 65.0
  },
  "xt8": {
    "name": "TS8 Tee",
    "tone": "French Navy",
    "price": 65.0
  },
  "xt9": {
    "name": "TS9 Tee",
    "tone": "White",
    "price": 65.0
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
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'Method not allowed' }); }
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return res.status(500).json({ error: 'Checkout is not set up yet.' });
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    const currency = body.currency === 'usd' ? 'usd' : 'cad';
    const items = Array.isArray(body.items) ? body.items.slice(0, 30) : [];
    const params = new URLSearchParams();
    let n = 0;
    for (const it of items) {
      const p = CATALOG[it.id];
      const qty = Math.floor(Number(it.qty));
      if (!p || !(qty >= 1 && qty <= 10)) continue;
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
    if (!n) return res.status(400).json({ error: 'Your bag is empty.' });
    const origin = `https://${req.headers.host}`;
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
    if (!r.ok || !d.url) return res.status(502).json({ error: 'Could not start checkout. Please try again.' });
    return res.status(200).json({ url: d.url });
  } catch (e) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
};
