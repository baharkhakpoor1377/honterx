# Stripe integration: remaining steps

The site already creates Stripe Checkout Sessions in [checkout.js](checkout.js) (hosted Stripe page, no SDK, plain REST calls). The Checkout Studio settings below were applied to that call.

## Values to replace

None. `mode`, `success_url`, `cancel_url` and `line_items` already hold real values (prices come from the server-side CATALOG in checkout.js; success/cancel URLs use the site's own domain).

## Configured parameters (checkout.js)

| Parameter | Value |
|---|---|
| ui_mode | hosted_page |
| mode | payment |
| billing_address_collection | required |
| phone_number_collection | enabled |
| automatic_tax | enabled |
| allow_promotion_codes | true |
| submit_type | auto |
| tax_id_collection | enabled, required: if_supported |
| shipping_address_collection | 229 countries (list in `SHIP_COUNTRIES`) |
| consent_collection.terms_of_service | required |
| custom_text.terms_of_service_acceptance | "ALL SALES ARE FINAL..." |
| integration_identifier | hosted_web_0001 |
| origin_context | web |

`payment_method_collection` is only used for subscriptions, so it is not sent. `customer_email` was removed because it is not in the Studio settings (customers type their email on the Stripe page).

## Things that must be set up in Stripe or checkout will be refused

1. **Stripe Tax** (Dashboard > Tax): turn it on and set your business origin address, otherwise `automatic_tax` makes session creation fail.
2. **Terms of service URL** (Dashboard > Settings > Public details): required for `consent_collection[terms_of_service]`.
3. **API version**: no SDK is installed, so requests use your account default API version. `ui_mode=hosted_page` and `origin_context` need a recent version. If Stripe answers "unknown parameter" or "invalid ui_mode", upgrade the account API version (Dashboard > Developers) or tell Claude to switch to `ui_mode=hosted`.
4. **Shipping**: the form now allows 229 countries. Make sure your shipping policy and rates cover them, or trim `SHIP_COUNTRIES`.

## Environment variables (Vercel > Settings > Environment Variables)

- `STRIPE_SECRET_KEY` (required): `sk_test_...` to test, `sk_live_...` to go live. Redeploy after changing.
- `STRIPE_WEBHOOK_SECRET`: only if you use [stripe-webhook.js](stripe-webhook.js) for order emails.

## Flow

Bag > `POST /api/checkout` (prices looked up server-side) > redirect to Stripe hosted page > back to `/?paid=1`.

## Testing

Use test mode with card `4242 4242 4242 4242`, any future expiry, any CVC. More: https://docs.stripe.com/testing

## Resources

https://support.stripe.com and https://docs.stripe.com/mcp
