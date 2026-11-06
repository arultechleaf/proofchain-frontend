/** Brand colours and short marks for common Indian banks, picked from an account's name (e.g. "HDFC Current", "indian"). */
export interface BankBrand { key: string; mark: string; bg: string; fg: string; name: string }

const BANKS: Array<{ match: RegExp } & BankBrand> = [
  { match: /\bhdfc\b/i, key: 'hdfc', mark: 'HDFC', bg: '#004c8f', fg: '#ffffff', name: 'HDFC Bank' },
  { match: /\bicici\b/i, key: 'icici', mark: 'i', bg: '#f37e20', fg: '#ffffff', name: 'ICICI Bank' },
  { match: /\bsbi\b|state bank/i, key: 'sbi', mark: 'SBI', bg: '#1d6fd6', fg: '#ffffff', name: 'State Bank of India' },
  { match: /\baxis\b/i, key: 'axis', mark: 'A', bg: '#97144d', fg: '#ffffff', name: 'Axis Bank' },
  { match: /\bkotak\b/i, key: 'kotak', mark: 'K', bg: '#ed1c24', fg: '#ffffff', name: 'Kotak Mahindra Bank' },
  { match: /indian overseas|\biob\b/i, key: 'iob', mark: 'IOB', bg: '#0b3c8c', fg: '#ffffff', name: 'Indian Overseas Bank' },
  { match: /\bindian\b/i, key: 'indian', mark: 'IB', bg: '#1e3a8a', fg: '#fbbf24', name: 'Indian Bank' },
  { match: /punjab national|\bpnb\b/i, key: 'pnb', mark: 'PNB', bg: '#a6192e', fg: '#ffffff', name: 'Punjab National Bank' },
  { match: /bank of baroda|\bbob\b|baroda/i, key: 'bob', mark: 'BoB', bg: '#f26522', fg: '#ffffff', name: 'Bank of Baroda' },
  { match: /\bcanara\b/i, key: 'canara', mark: 'C', bg: '#0f75bc', fg: '#ffd200', name: 'Canara Bank' },
  { match: /union bank/i, key: 'union', mark: 'U', bg: '#c8102e', fg: '#ffffff', name: 'Union Bank of India' },
  { match: /bank of india|\bboi\b/i, key: 'boi', mark: 'BoI', bg: '#1f5fa8', fg: '#ffffff', name: 'Bank of India' },
  { match: /central bank/i, key: 'cbi', mark: 'CBI', bg: '#c8102e', fg: '#ffffff', name: 'Central Bank of India' },
  { match: /\byes bank\b|\byes\b/i, key: 'yes', mark: 'YES', bg: '#0066b3', fg: '#ffffff', name: 'YES Bank' },
  { match: /idfc/i, key: 'idfc', mark: 'IDFC', bg: '#9c1d26', fg: '#ffffff', name: 'IDFC FIRST Bank' },
  { match: /indusind/i, key: 'indusind', mark: 'IndusInd', bg: '#7b1e3a', fg: '#ffffff', name: 'IndusInd Bank' },
  { match: /\bfederal\b/i, key: 'federal', mark: 'F', bg: '#0a4a8f', fg: '#ffcb05', name: 'Federal Bank' },
  { match: /karur|\bkvb\b/i, key: 'kvb', mark: 'KVB', bg: '#00548b', fg: '#ffffff', name: 'Karur Vysya Bank' },
  { match: /south indian|\bsib\b/i, key: 'sib', mark: 'SIB', bg: '#0b5aa6', fg: '#ffffff', name: 'South Indian Bank' },
  { match: /tamilnad|\btmb\b/i, key: 'tmb', mark: 'TMB', bg: '#6b2c91', fg: '#ffffff', name: 'Tamilnad Mercantile Bank' },
  { match: /city union|\bcub\b/i, key: 'cub', mark: 'CUB', bg: '#00539f', fg: '#ffffff', name: 'City Union Bank' },
  { match: /bandhan/i, key: 'bandhan', mark: 'B', bg: '#d3202f', fg: '#ffffff', name: 'Bandhan Bank' },
  { match: /\brbl\b/i, key: 'rbl', mark: 'RBL', bg: '#1b3c8c', fg: '#ffffff', name: 'RBL Bank' },
  { match: /paytm/i, key: 'paytm', mark: 'Paytm', bg: '#00baf2', fg: '#ffffff', name: 'Paytm Payments Bank' },
  { match: /\bau\b.*bank|au small/i, key: 'au', mark: 'AU', bg: '#f58220', fg: '#ffffff', name: 'AU Small Finance Bank' },
];

/** The brand for a bank account name, or null when the name is not a known bank. */
export function bankBrand(name: string | null | undefined): BankBrand | null {
  const text = name ?? '';
  const hit = BANKS.find((b) => b.match.test(text));
  return hit ? { key: hit.key, mark: hit.mark, bg: hit.bg, fg: hit.fg, name: hit.name } : null;
}
