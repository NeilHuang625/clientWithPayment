# React + Vite

Using stripe CLI to make your localhost server access publicly, so that Webhook can send request to localhost endpoint, which is where our new order is confirmed and made.

macOS:
brew install stripe/stripe-cli/stripe

Windows (Scoop):
scoop install stripe

stripe login

stripe listen --forward-to localhost:5000/api/payments/webhook

stripe trigger checkout.session.completed
