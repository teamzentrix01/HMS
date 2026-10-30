import crypto from "crypto";

/**
 * Enterprise Private Hospital File Storage Abstraction
 * Encapsulates private document storage with signed expirable token access
 */
export class PrivateHospitalStorage {
  constructor() {
    this.secret =
      process.env.STORAGE_SECRET ||
      "jigyasa-hospital-private-storage-secret-key-2026-secure";
  }

  generateSignedUrl(fileKey, expiresInSeconds = 900) {
    const expires = Math.floor(Date.now() / 1000) + expiresInSeconds;
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(`${fileKey}:${expires}`);
    const token = hmac.digest("hex");
    return `/api/documents/download?fileKey=${encodeURIComponent(fileKey)}&expires=${expires}&signature=${token}`;
  }

  verifySignedUrl(fileKey, expires, signature) {
    const now = Math.floor(Date.now() / 1000);
    if (now > parseInt(expires, 10)) {
      return { valid: false, reason: "Link expired" };
    }
    const hmac = crypto.createHmac("sha256", this.secret);
    hmac.update(`${fileKey}:${expires}`);
    const expected = hmac.digest("hex");
    if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return { valid: true };
    }
    return { valid: false, reason: "Invalid signature" };
  }
}

export const privateStorage = new PrivateHospitalStorage();

