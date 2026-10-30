import api from './axios';

// Each browser holds a non-extractable ECDSA private key in IndexedDB. The server only
// ever sees the public key and signatures, so the key cannot be copied to another system.
const DB_NAME = 'pcb-device';
const STORE = 'keys';
const KEY_NAME = 'device-key';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function runStore(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        tx.oncomplete = () => {
          db.close();
          resolve(req.result);
        };
        tx.onerror = () => {
          db.close();
          reject(tx.error);
        };
      })
  );
}

async function getKeyPair() {
  const stored = await runStore('readonly', (store) => store.get(KEY_NAME));
  if (stored) return stored;

  const pair = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  await runStore('readwrite', (store) => store.put(pair, KEY_NAME));
  return pair;
}

function toBase64Url(buffer) {
  let binary = '';
  for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function getDeviceProof() {
  if (!window.crypto?.subtle || !window.indexedDB) {
    throw new Error('This browser does not support secure device verification. Please use an updated Chrome or Edge.');
  }

  const pair = await getKeyPair();
  const { data } = await api.get('/auth/device-challenge');
  const signature = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    pair.privateKey,
    new TextEncoder().encode(data.challenge)
  );
  const { kty, crv, x, y } = await crypto.subtle.exportKey('jwk', pair.publicKey);

  return { publicKey: { kty, crv, x, y }, challenge: data.challenge, signature: toBase64Url(signature) };
}
