
export interface StoredSecret {
  secretId: string;
  encryptedSecret: string;
  ttl: number;
}

/** Body accepted by POST /encrypt */
export type BrowserEncryptRequest = {
  encryptedData: string;
};

/** Body accepted by POST /decrypt */
export type DecryptRequest = {
  encryptedInput: string;
};

/** KMS-wrapped payload stored in the shareable token */
export type ResponseInputToEncrypt = {
  secretId: string;
};
