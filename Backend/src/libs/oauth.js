import crypto from "crypto";
import {
  authorizationCodeGrant,
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  discovery,
  fetchUserInfo,
  randomPKCECodeVerifier,
  randomState,
} from "openid-client";

const STATE_TTL_MS = 10 * 60 * 1000;
let oidcConfiguration;

export class OAuthError extends Error {
  constructor(category, message, cause) {
    super(message);
    this.category = category;
    this.cause = cause;
  }
}

export const hashOAuthState = (state) =>
  crypto.createHash("sha256").update(state).digest("base64url");

export const isSafeInternalPath = (value) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") && !value.includes("\\\\");

export const safeReturnTo = (value) => (isSafeInternalPath(value) ? value : "/");

const isLocalHttpUrl = (url) =>
  url.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(url.hostname);

export const getOidcSettings = () => {
  const issuer = process.env.OIDC_ISSUER_URL;
  const clientId = process.env.OIDC_CLIENT_ID;
  const clientSecret = process.env.OIDC_CLIENT_SECRET;
  const redirectUri = process.env.OIDC_REDIRECT_URI;
  const values = [issuer, clientId, clientSecret, redirectUri];

  if (!values.some(Boolean)) return { enabled: false };
  if (values.some((value) => !value)) {
    throw new OAuthError("configuration_failure", "OIDC configuration is incomplete");
  }

  let issuerUrl;
  let callbackUrl;
  try {
    issuerUrl = new URL(issuer);
    callbackUrl = new URL(redirectUri);
  } catch {
    throw new OAuthError("configuration_failure", "OIDC URLs must be absolute URLs");
  }

  const allowLocalHttp = process.env.NODE_ENV !== "production";
  if ((!allowLocalHttp && issuerUrl.protocol !== "https:") || (!allowLocalHttp && callbackUrl.protocol !== "https:") ||
      (allowLocalHttp && issuerUrl.protocol !== "https:" && !isLocalHttpUrl(issuerUrl)) ||
      (allowLocalHttp && callbackUrl.protocol !== "https:" && !isLocalHttpUrl(callbackUrl))) {
    throw new OAuthError("configuration_failure", "OIDC URLs must use HTTPS outside localhost development");
  }
  if (callbackUrl.search || callbackUrl.hash) {
    throw new OAuthError("configuration_failure", "OIDC redirect URI must not contain query parameters or a fragment");
  }

  const scopes = new Set((process.env.OIDC_SCOPES || "openid profile email").split(/\s+/).filter(Boolean));
  scopes.add("openid");
  return {
    enabled: true,
    issuerUrl,
    clientId,
    clientSecret,
    redirectUri: callbackUrl.toString(),
    scopes: [...scopes].join(" "),
    provider: (process.env.OIDC_PROVIDER_NAME || "OIDC").trim().toLowerCase(),
    providerDisplayName: (process.env.OIDC_PROVIDER_NAME || "OIDC").trim(),
  };
};

const getConfiguration = async (settings) => {
  if (!oidcConfiguration) {
    oidcConfiguration = await discovery(settings.issuerUrl, settings.clientId, {
      client_secret: settings.clientSecret,
      redirect_uris: [settings.redirectUri],
      response_types: ["code"],
    });
  }
  return oidcConfiguration;
};

export const resetOidcConfigurationForTests = () => {
  oidcConfiguration = undefined;
};

export const createAuthorizationRequest = async (settings) => {
  const codeVerifier = randomPKCECodeVerifier();
  const state = randomState();
  const nonce = randomState();
  const configuration = await getConfiguration(settings);
  const url = buildAuthorizationUrl(configuration, {
    redirect_uri: settings.redirectUri,
    response_type: "code",
    scope: settings.scopes,
    state,
    nonce,
    code_challenge: await calculatePKCECodeChallenge(codeVerifier),
    code_challenge_method: "S256",
  });
  return { url, state, nonce, codeVerifier, expiresAt: new Date(Date.now() + STATE_TTL_MS) };
};

export const exchangeAuthorizationCode = async (settings, callbackUrl, state) => {
  try {
    const configuration = await getConfiguration(settings);
    const tokens = await authorizationCodeGrant(configuration, callbackUrl, {
      expectedState: state.state,
      expectedNonce: state.nonce,
      pkceCodeVerifier: state.codeVerifier,
    });
    const claims = tokens.claims(); // validates the signed ID token and its OIDC claims
    if (!tokens.access_token || !claims?.sub) {
      throw new OAuthError("invalid_identity", "Provider did not return a valid identity");
    }
    const userinfo = await fetchUserInfo(configuration, tokens.access_token, claims.sub);
    if (!userinfo || userinfo.sub !== claims.sub || userinfo.email_verified !== true || !userinfo.email) {
      throw new OAuthError("invalid_identity", "A verified provider email is required");
    }
    return { subject: claims.sub, email: userinfo.email.toLowerCase(), name: userinfo.name || userinfo.preferred_username || userinfo.email, picture: userinfo.picture || "" };
  } catch (error) {
    if (error instanceof OAuthError) throw error;
    throw new OAuthError("provider_failure", "The identity provider could not complete sign-in", error);
  }
};
