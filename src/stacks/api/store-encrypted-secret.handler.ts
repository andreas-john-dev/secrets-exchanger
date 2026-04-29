import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { EncryptCommand, KMSClient } from "@aws-sdk/client-kms";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { randomUUID } from "crypto";
import { EncryptionService } from "./encryption-service";
import { ResponseInputToEncrypt, UserSecretInput } from "./types";
const kmsClient = new KMSClient();
const logger = new Logger({ serviceName: "Secrets-Exchanger" });
const dynamodbClient = DynamoDBDocumentClient.from(new DynamoDBClient());

async function encryptSecretIdAndKeysWithKms(
  input: ResponseInputToEncrypt,
): Promise<string> {
  const encryptCommand = new EncryptCommand({
    KeyId: process.env.KMS_KEY_ID,
    Plaintext: Buffer.from(JSON.stringify(input), "utf8"),
    EncryptionContext: {
      purpose: "secret-storage",
      application: "secrets-exchanger",
    },
  });

  const encryptedData = await kmsClient.send(encryptCommand);
  return Buffer.from(encryptedData.CiphertextBlob!).toString("base64");
}

async function storeEncryptedSecret(encryptedSecret: string) {
  const secretId = randomUUID();
  // TTL should be 1 day from now
  const ttl = Math.floor(Date.now() / 1000) + 24 * 60 * 60;

  await dynamodbClient.send(
    new PutCommand({
      TableName: process.env.SECRETS_TABLE_NAME!,
      Item: {
        secretId,
        encryptedSecret,
        ttl,
      },
    }),
  );

  return secretId;
}

export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("Event", { event });
  const body = JSON.parse(event.body!) as UserSecretInput;

  const encryptedSecret = EncryptionService.encrypt(JSON.stringify(body));

  // store only the encrypted data but not the key + iv
  const secretId = await storeEncryptedSecret(encryptedSecret.encryptedData);

  const encryptedResponse = await encryptSecretIdAndKeysWithKms({
    secretId,
    key: encryptedSecret.key,
    iv: encryptedSecret.iv,
  });

  return {
    statusCode: 201,
    body: JSON.stringify({
      encryptedResponse,
    }),
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  };
};
