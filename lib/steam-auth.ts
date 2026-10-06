/**
 * Steam OpenID 2.0 helper.
 * Steam acts as an OpenID 2.0 Provider; we redirect the user to Steam,
 * Steam redirects back to our /api/auth/steam/callback with signed params,
 * and we verify the signature by re-querying Steam's endpoint.
 */

const STEAM_OPENID = 'https://steamcommunity.com/openid/login';
const STEAM_NS = 'http://specs.openid.net/auth/2.0';

/**
 * Build the URL that redirects the user to the Steam login page.
 */
export function buildSteamLoginUrl(returnTo: string): string {
  const params = new URLSearchParams({
    'openid.ns': STEAM_NS,
    'openid.mode': 'checkid_setup',
    'openid.return_to': returnTo,
    'openid.realm': new URL(returnTo).origin,
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
  });
  return `${STEAM_OPENID}?${params}`;
}

/**
 * Verify the OpenID response from Steam by re-POSTing with mode=check_authentication.
 * Returns the validated SteamID64 string or null on failure.
 */
export async function verifySteamCallback(
  searchParams: URLSearchParams
): Promise<string | null> {
  // Build verification params
  const verifyParams = new URLSearchParams(searchParams);
  verifyParams.set('openid.mode', 'check_authentication');

  const res = await fetch(STEAM_OPENID, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: verifyParams.toString(),
  });

  if (!res.ok) return null;

  const body = await res.text();
  if (!body.includes('is_valid:true')) return null;

  // Extract SteamID64 from the claimed_id URL
  // e.g. "https://steamcommunity.com/openid/id/76561198047011640"
  const claimedId = searchParams.get('openid.claimed_id') ?? '';
  const match = claimedId.match(/\/openid\/id\/(\d+)$/);
  return match ? match[1] : null;
}

/**
 * Convert SteamID64 to Dota 2 Account ID (SteamID32).
 * Dota 2's account_id = SteamID64 - 76561197960265728
 */
export function steamId64ToAccountId(steamId64: string): number {
  return Number(BigInt(steamId64) - BigInt('76561197960265728'));
}
