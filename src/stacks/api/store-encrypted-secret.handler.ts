import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EncryptCommand, KMSClient } from "@aws-sdk/client-kms";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { randomUUID } from "crypto";
import { BrowserEncryptRequest, ResponseInputToEncrypt } from "./types";

const kmsClient = new KMSClient();
const logger = new Logger({ serviceName: "Secrets-Exchanger" });
const dynamodbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

async function wrapSecretIdWithKms(input: ResponseInputToEncrypt): Promise<string> {
  const encryptCommand = new EncryptCommand({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: Buffer.from(JSON.stringify(input), "utf8"),
    EncryptionContext: {
      purpose: "secret-storage",
      application: "secrets-exchanger",
    },
  });

  const result = await kmsClient.send(encryptCommand);
  return Buffer.from(result.CiphertextBlob!).toString("base64");
}

async function storeEncryptedSecret(encryptedSecret: string): Promise<string> {
  const secretId = randomUUID();
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  await dynamodbClient.send(
    new PutCommand({
      TableName: process.env.SECRETS_TABLE_NAME!,
      Item: { secretId, encryptedSecret, ttl },
    }),
  );

  return secretId;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("Event", { event });
  const { encryptedData } = JSON.parse(event.body!) as BrowserEncryptRequest;

  // The browser has already encrypted the secret with AES-GCM.
  // We store the opaque ciphertext blob and KMS-wrap only the secretId.
  const secretId = await storeEncryptedSecret(encryptedData);
  const encryptedResponse = await wrapSecretIdWithKms({ secretId });

  return {
    statusCode: 201,
    body: JSON.stringify({ encryptedResponse }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
};
