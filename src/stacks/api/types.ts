
export interface UserSecretInput {
  secretString: string;
  passphrase?: string;
}
export interface StoredSecret {
  secretId: string;
  encryptedSecret: string;
  ttl: number;
}

export interface UserSecretQueryInput {
  secretId: string;
  passphrase?: string;
}

export type EncryptionResult = {
  encryptedData: string;
  iv: string;
  key: string;
};

export type DecryptionResult = {
  decryptedData: string;
};

export type ResponseInputToEncrypt = {
  secretId: string;
  key: string;
  iv: string;
}
