import fs from 'fs';
import path from 'path';

const REFERRALS_FILE = path.join(process.cwd(), 'data', 'referrals.json');

// Ensure data directory and file exist
if (!fs.existsSync(path.dirname(REFERRALS_FILE))) {
  fs.mkdirSync(path.dirname(REFERRALS_FILE), { recursive: true });
}
if (!fs.existsSync(REFERRALS_FILE)) {
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify({}, null, 2), 'utf-8');
}

/**
 * Saves a referrer code mapping to a wallet address.
 */
export function createReferral(code, walletAddress) {
  const data = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf-8'));
  data[code] = walletAddress;
  fs.writeFileSync(REFERRALS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`[ReferralService] Created referral ${code} -> ${walletAddress}`);
  return true;
}

/**
 * Gets the wallet address associated with a referral code.
 */
export function getReferrerWallet(code) {
  if (!code) return null;
  const data = JSON.parse(fs.readFileSync(REFERRALS_FILE, 'utf-8'));
  return data[code] || null;
}
