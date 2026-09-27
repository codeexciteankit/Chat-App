import { getOidcSettings, hashOAuthState, isSafeInternalPath, safeReturnTo } from "../libs/oauth.js";
import OAuthAccount from "../models/oauthAccount.model.js";
import OAuthState from "../models/oauthState.model.js";

describe("OIDC security helpers", () => {
  const original = { ...process.env };

  beforeEach(() => {
    process.env = { ...original, NODE_ENV: "test" };
    delete process.env.OIDC_ISSUER_URL;
    delete process.env.OIDC_CLIENT_ID;
    delete process.env.OIDC_CLIENT_SECRET;
    delete process.env.OIDC_REDIRECT_URI;
  });

  afterAll(() => { process.env = original; });

  test("does not enable OIDC without complete server configuration", () => {
    expect(getOidcSettings()).toEqual({ enabled: false });
    process.env.OIDC_CLIENT_ID = "client";
    expect(() => getOidcSettings()).toThrow("incomplete");
  });

  test("uses an opaque, deterministic state digest", () => {
    expect(hashOAuthState("state-a")).toHaveLength(43);
    expect(hashOAuthState("state-a")).toBe(hashOAuthState("state-a"));
    expect(hashOAuthState("state-a")).not.toBe(hashOAuthState("state-b"));
  });

  test.each(["https://attacker.test", "//attacker.test", "javascript:alert(1)", "login", "\\\\attacker.test"])(
    "rejects malicious return destination %s",
    (destination) => {
      expect(isSafeInternalPath(destination)).toBe(false);
      expect(safeReturnTo(destination)).toBe("/");
    },
  );

  test("accepts an internal return path only", () => {
    expect(safeReturnTo("/profile?tab=account")).toBe("/profile?tab=account");
  });

  test("enforces unique provider subject identities and expires transient state", () => {
    expect(OAuthAccount.schema.indexes()).toContainEqual([
      { provider: 1, providerAccountId: 1 },
      { unique: true, background: true },
    ]);
    expect(OAuthState.schema.path("expiresAt")._index).toEqual({ expireAfterSeconds: 0 });
  });
});
