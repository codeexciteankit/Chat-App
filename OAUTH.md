# Google sign-in

The application is an OpenID Connect relying party. It uses the OAuth 2.0 authorization-code flow with PKCE (`S256`), plus OIDC discovery and signed ID-token validation through `openid-client`.

## Configure a provider

Copy `Backend/.env.example` to `Backend/.env`. The application is preconfigured for Google's OIDC issuer; create a Google OAuth 2.0 **Web application** client and place its client ID and client secret only in `Backend/.env`.

For local development, create a **Web application** in the provider console with this authorized redirect URI:

`http://localhost:5001/api/auth/oauth/oidc/callback`

Set `http://localhost:5173` as an authorized JavaScript origin in Google's client configuration. In staging and production, replace both URLs with the actual public backend callback URL and frontend origin; do not register guessed or wildcard URLs. `OIDC_REDIRECT_URI` must exactly match the registered callback and must not include a query string or fragment.

Required OIDC values when sign-in is enabled: `OIDC_PROVIDER_NAME`, `OIDC_ISSUER_URL`, `OIDC_CLIENT_ID`, `OIDC_CLIENT_SECRET`, `OIDC_REDIRECT_URI`, and `OIDC_SCOPES`. Do not expose any of these as `VITE_` variables.

## Run and test

```powershell
npm.cmd start --prefix Backend
npm.cmd run dev --prefix Frontend
npm.cmd test --prefix Backend
npm.cmd run lint --prefix Frontend
npm.cmd run build --prefix Frontend
```

Open login, choose **Continue with Google**, authenticate, and confirm an application session. Log out and repeat sign-in to verify reuse of the same Google identity.

## Account policy and security

- OAuth accounts are keyed by immutable provider `sub`, never email.
- Matching local email is never automatically linked. Sign in normally, then use protected `/api/auth/oauth/oidc/link` to link an identity.
- New OAuth sign-ups require a verified provider email. Access, refresh, and ID tokens are exchanged server-side and never persisted, logged, or exposed to the browser.
- OAuth state is random, bound to an HttpOnly short-lived cookie, stored server-side only as a SHA-256 digest, and atomically consumed. PKCE verifier and OIDC nonce are server-side only.
- The callback only redirects to validated internal paths and then creates the existing HttpOnly application JWT cookie.

OAuth state uses MongoDB with a TTL index. Every backend instance must share the same durable MongoDB deployment. To add a provider, generalize the fixed `oidc` route/model provider key into a provider registry; keep issuer and callback configuration server-side and fixed per provider.
