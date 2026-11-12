// Høntérx customer emails, sent through Resend (https://resend.com).
// Needs these Vercel environment variables:
//   RESEND_API_KEY  - from your Resend account
//   EMAIL_FROM      - e.g.  Høntérx <orders@honterx.com>   (must be on a domain verified in Resend)
// Optional:
//   EMAIL_REPLY_TO  - where customer replies go (your support inbox)
//   EMAIL_BCC       - get a copy of every email you send to customers

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const money = (n, cur) => { try { return new Intl.NumberFormat('en-CA', { style: 'currency', currency: cur || 'CAD' }).format(n) + ' ' + (cur || ''); } catch (e) { return String(n); } };

const CARRIERS = {
  'Canada Post': (t) => 'https://www.canadapost-postescanada.ca/track-reperage/en#/search?searchFor=' + encodeURIComponent(t),
  'UPS': (t) => 'https://www.ups.com/track?tracknum=' + encodeURIComponent(t),
  'FedEx': (t) => 'https://www.fedex.com/fedextrack/?trknbr=' + encodeURIComponent(t),
  'USPS': (t) => 'https://tools.usps.com/go/TrackConfirmAction?tLabels=' + encodeURIComponent(t),
  'DHL': (t) => 'https://www.dhl.com/global-en/home/tracking.html?tracking-id=' + encodeURIComponent(t),
  'Purolator': (t) => 'https://www.purolator.com/en/shipping/tracker?pin=' + encodeURIComponent(t)
};

function addressLines(o) {
  const a = o.address || {};
  return [o.name, a.line1, a.line2, [a.city, a.state, a.postal_code].filter(Boolean).join(' '), a.country].filter(Boolean);
}

function layout(title, intro, bodyHtml, footNote) {
  return '<!doctype html><html><body style="margin:0;background:#f3f4f7;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif;color:#14161c">' +
    '<div style="max-width:560px;margin:0 auto;padding:28px 16px">' +
    '<div style="text-align:center;font-size:22px;font-weight:800;letter-spacing:.14em;padding:8px 0 20px">HØNTÉRX</div>' +
    '<div style="background:#ffffff;border-radius:16px;padding:28px 24px">' +
    '<h1 style="margin:0 0 10px;font-size:24px;letter-spacing:-.01em">' + esc(title) + '</h1>' +
    '<p style="margin:0 0 20px;font-size:16px;line-height:1.55;color:#2b2e36">' + intro + '</p>' + bodyHtml + '</div>' +
    '<p style="text-align:center;font-size:12px;color:#6b7080;margin:18px 0 0;line-height:1.6">' + (footNote || '') + 'Høntérx · honterx.com</p>' +
    '</div></body></html>';
}

function itemsTable(o) {
  const rows = (o.items || []).map((i) =>
    '<tr><td style="padding:8px 0;border-bottom:1px solid #e6e8ee;font-size:15px">' + esc(i.name) + (i.size ? '<br><span style="color:#6b7080;font-size:13px">Size ' + esc(i.size) + '</span>' : '') + '</td>' +
    '<td style="padding:8px 0;border-bottom:1px solid #e6e8ee;text-align:right;font-size:15px;white-space:nowrap">× ' + esc(i.qty) + '</td></tr>').join('');
  return '<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;margin:0 0 14px">' + rows +
    (o.total != null ? '<tr><td style="padding:10px 0;font-weight:800;font-size:16px">Total paid</td><td style="padding:10px 0;font-weight:800;font-size:16px;text-align:right;white-space:nowrap">' + esc(money(o.total, o.currency)) + '</td></tr>' : '') + '</table>';
}

function addressBlock(o) {
  const L = addressLines(o);
  if (!L.length) return '';
  return '<div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7080;margin:18px 0 6px">Shipping to</div>' +
    '<div style="font-size:15px;line-height:1.55">' + L.map(esc).join('<br>') + '</div>';
}

function firstName(o) { return String(o.name || '').trim().split(/\s+/)[0] || 'there'; }

function thankYou(o) {
  const subject = 'Thank you for your Høntérx order';
  const html = layout('Thank you for your order',
    'Hi ' + esc(firstName(o)) + ', we have your payment and your order is confirmed. Every piece is made to order, so it usually ships within 2 to 7 business days. We will email you again as soon as it is on its way.',
    itemsTable(o) + addressBlock(o) +
    '<p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#5d6270">Something not right with the size or address? Just reply to this email and we will sort it out before it ships.</p>',
    'Order ' + esc(String(o.id || '').slice(-10).toUpperCase()) + '<br>');
  const text = ['Hi ' + firstName(o) + ',', '', 'Thank you for your order! We have your payment and your order is confirmed.',
    'Every piece is made to order, so it usually ships within 2 to 7 business days. We will email you again as soon as it is on its way.', '',
    'YOUR ORDER'].concat((o.items || []).map((i) => '- ' + i.name + (i.size ? ' | Size ' + i.size : '') + ' | Qty ' + i.qty),
    ['Total paid: ' + money(o.total, o.currency), '', 'SHIPPING TO'], addressLines(o),
    ['', 'Something not right with the size or address? Just reply to this email.', '', 'Høntérx · honterx.com']).join('\n');
  return { subject, html, text };
}

function shipped(o, tracking, carrier) {
  const subject = 'Your Høntérx order is on its way';
  const link = tracking && CARRIERS[carrier] ? CARRIERS[carrier](tracking) : '';
  const trackHtml = tracking
    ? '<div style="background:#f3f4f7;border-radius:12px;padding:14px 16px;margin:0 0 16px;font-size:15px;line-height:1.6">' +
      '<b>' + esc(carrier || 'Carrier') + '</b> tracking number<br><span style="font-size:17px;font-weight:700;letter-spacing:.02em">' + esc(tracking) + '</span>' +
      (link ? '<br><a href="' + esc(link) + '" style="display:inline-block;margin-top:10px;background:#14161c;color:#ffffff;text-decoration:none;padding:10px 18px;border-radius:999px;font-weight:700;font-size:14px">Track your package</a>' : '') + '</div>'
    : '';
  const html = layout('Your order is on its way',
    'Hi ' + esc(firstName(o)) + ', good news: your Høntérx order has shipped.' + (tracking ? ' You can follow it with the tracking number below.' : ''),
    trackHtml + itemsTable(Object.assign({}, o, { total: null })) + addressBlock(o) +
    '<p style="margin:22px 0 0;font-size:14px;line-height:1.55;color:#5d6270">Thank you for shopping with us. If anything is wrong when it arrives, reply to this email and we will help.</p>', '');
  const text = ['Hi ' + firstName(o) + ',', '', 'Good news: your Høntérx order has shipped.'].concat(
    tracking ? ['', carrier + ' tracking number: ' + tracking].concat(link ? ['Track it here: ' + link] : []) : [],
    ['', 'IN THIS PACKAGE'], (o.items || []).map((i) => '- ' + i.name + (i.size ? ' | Size ' + i.size : '') + ' | Qty ' + i.qty),
    ['', 'SHIPPING TO'], addressLines(o), ['', 'Thank you for shopping with us.', '', 'Høntérx · honterx.com']).join('\n');
  return { subject, html, text };
}

async function send(to, msg) {
  const key = process.env.RESEND_API_KEY, from = process.env.EMAIL_FROM;
  if (!key || !from) return { skipped: 'Email is not set up yet (RESEND_API_KEY / EMAIL_FROM).' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(to || ''))) return { skipped: 'No valid customer email.' };
  const payload = { from, to: [to], subject: msg.subject, html: msg.html, text: msg.text };
  if (process.env.EMAIL_REPLY_TO) payload.reply_to = process.env.EMAIL_REPLY_TO;
  if (process.env.EMAIL_BCC) payload.bcc = [process.env.EMAIL_BCC];
  const r = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error((d && d.message) || 'Resend error ' + r.status);
  return { sent: true, id: d.id };
}

// Turns a Stripe Checkout Session + its line items into the simple order object the emails use.
async function loadOrder(stripe, sessionId) {
  const s = await stripe('/checkout/sessions/' + sessionId + '?expand[]=payment_intent');
  const li = await stripe('/checkout/sessions/' + sessionId + '/line_items?limit=50&expand[]=data.price.product');
  const items = (li.data || []).map((l) => {
    const pr = (l.price && l.price.product && typeof l.price.product === 'object') ? l.price.product : {};
    const md = pr.metadata || {};
    return { name: l.description || pr.name || 'Item', size: md.size || (pr.description || '').replace(/^Size:\s*/i, '') || '', qty: l.quantity || 1 };
  });
  const ship = s.shipping_details || (s.collected_information && s.collected_information.shipping_details) || null;
  const cd = s.customer_details || {};
  const a = (ship && ship.address) || cd.address || {};
  const pi = s.payment_intent && typeof s.payment_intent === 'object' ? s.payment_intent : null;
  return {
    id: s.id, pi: pi ? pi.id : '', meta: (pi && pi.metadata) || {}, paid: s.payment_status === 'paid',
    name: (ship && ship.name) || cd.name || '', email: cd.email || s.customer_email || '',
    address: { line1: a.line1 || '', line2: a.line2 || '', city: a.city || '', state: a.state || '', postal_code: a.postal_code || '', country: a.country || '' },
    items, total: (s.amount_total || 0) / 100, currency: String(s.currency || '').toUpperCase()
  };
}

module.exports = { send, thankYou, shipped, loadOrder, CARRIERS };
