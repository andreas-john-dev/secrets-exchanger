import { Logger } from "@aws-lambda-powertools/logger";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DecryptCommand,
  InvalidCiphertextException,
  KMSClient,
} from "@aws-sdk/client-kms";
import {
  DeleteCommand,
  DynamoDBDocumentClient,
  GetCommand,
} from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyHandler } from "aws-lambda";
import { DecryptRequest, ResponseInputToEncrypt, StoredSecret } from "./types";

const kmsClient = new KMSClient();
const dynamodbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const logger = new Logger({ serviceName: "Secrets-Exchanger" });

async function unwrapSecretIdFromKms(
  encryptedInput: string,
): Promise<ResponseInputToEncrypt> {
  const decryptCommand = new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedInput, "base64"),
    EncryptionContext: {
      purpose: "secret-storage",
      application: "secrets-exchanger",
    },
  });

  const result = await kmsClient.send(decryptCommand);
  return JSON.parse(Buffer.from(result.Plaintext!).toString()) as ResponseInputToEncrypt;
}

async function getAndDeleteSecret(secretId: string): Promise<StoredSecret | undefined> {
  const stored = await dynamodbClient.send(
    new GetCommand({
      TableName: process.env.SECRETS_TABLE_NAME!,
      Key: { secretId },
    }),
  );

  if (!stored.Item) return undefined;

  // Burn immediately — even if the caller fails to decrypt, the secret is gone.
  await dynamodbClient.send(
    new DeleteCommand({
      TableName: process.env.SECRETS_TABLE_NAME!,
      Key: { secretId },
    }),
  );

  return stored.Item as StoredSecret;
}

const RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

function createHttpResponse(statusCode: number, body: object) {
  return { statusCode, body: JSON.stringify(body), headers: RESPONSE_HEADERS };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("Event", { event });
  const { encryptedInput } = JSON.parse(event.body!) as DecryptRequest;

  try {
    const { secretId } = await unwrapSecretIdFromKms(encryptedInput);

    const storedSecret = await getAndDeleteSecret(secretId);
    if (!storedSecret) {
      return createHttpResponse(404, { message: "Secret not found" });
    }

    // The browser ciphertext is returned as-is; decryption happens client-side.
    return createHttpResponse(200, { encryptedData: storedSecret.encryptedSecret });
  } catch (error) {
    if (error instanceof InvalidCiphertextException) {
      return createHttpResponse(400, { message: "Invalid encrypted input" });
    }
    throw error;
  }
};
