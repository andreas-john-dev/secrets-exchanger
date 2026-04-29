import * as crypto from "crypto";
import { DecryptionResult, EncryptionResult } from "./types";

export class EncryptionService {
  private static readonly ALGORITHM = "aes-256-cbc";
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits

  /**
   * Generates a random encryption key
   * @returns Buffer containing the random key
   */
  private static generateKey(): Buffer {
    return crypto.randomBytes(this.KEY_LENGTH);
  }

  /**
   * Generates a random initialization vector
   * @returns Buffer containing the random IV
   */
  private static generateIV(): Buffer {
    return crypto.randomBytes(this.IV_LENGTH);
  }

  /**
   * Encrypts a string using a randomly generated key
   * @param data - The string to encrypt
   * @returns Object containing the encrypted data, IV, and key (all base64 encoded)
   */
  public static encrypt(data: string): EncryptionResult {
    const key = this.generateKey();
    const iv = this.generateIV();

    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encryptedData = cipher.update(data, "utf8", "base64");
    encryptedData += cipher.final("base64");

    return {
      encryptedData: encryptedData,
      iv: iv.toString("base64"),
      key: key.toString("base64"),
    };
  }

  /**
   * Decrypts an encrypted string using the provided key and IV
   * @param encryptedData - The encrypted string (base64 encoded)
   * @param key - The encryption key (base64 encoded)
   * @param iv - The initialization vector (base64 encoded)
   * @returns Object containing the decrypted string
   */
  public static decrypt(
    encryptedData: string,
    key: string,
    iv: string,
  ): DecryptionResult {
    const keyBuffer = Buffer.from(key, "base64");
    const ivBuffer = Buffer.from(iv, "base64");

    const decipher = crypto.createDecipheriv(
      this.ALGORITHM,
      keyBuffer,
      ivBuffer,
    );

    let decryptedData = decipher.update(encryptedData, "base64", "utf8");
    decryptedData += decipher.final("utf8");

    return {
      decryptedData: decryptedData,
    };
  }
}
