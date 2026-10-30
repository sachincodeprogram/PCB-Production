const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const CHALLENGE_PURPOSE = 'device-challenge';

// Set DEVICE_APPROVAL=off to temporarily disable device checks (emergency switch).
const isDeviceApprovalEnabled = () => process.env.DEVICE_APPROVAL !== 'off';

const createChallenge = () =>
  jwt.sign({ purpose: CHALLENGE_PURPOSE, nonce: crypto.randomBytes(16).toString('hex') }, process.env.JWT_SECRET, {
    expiresIn: '2m',
  });

const isBase64Url = (value) => typeof value === 'string' && /^[A-Za-z0-9_-]+$/.test(value);

// RFC 7638 JWK thumbprint for an EC P-256 public key.
const thumbprint = (jwk) =>
  crypto
    .createHash('sha256')
    .update(JSON.stringify({ crv: jwk.crv, kty: jwk.kty, x: jwk.x, y: jwk.y }))
    .digest('base64url');

// Verifies that the caller holds the private key for the supplied public key by checking
// its signature over a fresh server-issued challenge. Returns null if the proof is invalid.
const verifyDeviceProof = (proof) => {
  if (!proof || typeof proof !== 'object') return null;
  const { publicKey, challenge, signature } = proof;

  if (
    !publicKey ||
    publicKey.kty !== 'EC' ||
    publicKey.crv !== 'P-256' ||
    !isBase64Url(publicKey.x) ||
    !isBase64Url(publicKey.y) ||
    typeof challenge !== 'string' ||
    !isBase64Url(signature)
  ) {
    return null;
  }

  try {
    const decoded = jwt.verify(challenge, process.env.JWT_SECRET);
    if (decoded.purpose !== CHALLENGE_PURPOSE) return null;

    const jwk = { kty: 'EC', crv: 'P-256', x: publicKey.x, y: publicKey.y };
    const key = crypto.createPublicKey({ key: jwk, format: 'jwk' });
    const valid = crypto.verify(
      'sha256',
      Buffer.from(challenge),
      { key, dsaEncoding: 'ieee-p1363' },
      Buffer.from(signature, 'base64url')
    );
    if (!valid) return null;

    return { publicKey: jwk, keyThumbprint: thumbprint(jwk) };
  } catch (error) {
    return null;
  }
};

// Human-friendly code like "DEV-7K2PQ9", avoiding look-alike characters.
const generateDeviceCode = () => {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.randomBytes(6);
  let code = '';
  for (const b of bytes) code += alphabet[b % alphabet.length];
  return `DEV-${code}`;
};

module.exports = { isDeviceApprovalEnabled, createChallenge, verifyDeviceProof, generateDeviceCode };
