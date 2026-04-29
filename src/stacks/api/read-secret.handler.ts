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
import { EncryptionService } from "./encryption-service";
import { ResponseInputToEncrypt, StoredSecret, UserSecretInput } from "./types";

const kmsClient = new KMSClient();
const dynamodbClient = DynamoDBDocumentClient.from(new DynamoDBClient());
const logger = new Logger({ serviceName: "Secrets-Exchanger" });

async function decryptResponseInput(
  encryptedSecret: string,
): Promise<ResponseInputToEncrypt> {
  const decryptCommand = new DecryptCommand({
    CiphertextBlob: Buffer.from(encryptedSecret, "base64"),
    EncryptionContext: {
      purpose: "secret-storage",
      application: "secrets-exchanger",
    },
  });

  const decryptedData = await kmsClient.send(decryptCommand);
  const plainText = Buffer.from(decryptedData.Plaintext!).toString();
  return JSON.parse(plainText) as ResponseInputToEncrypt;
}

async function getEncryptedSecret(secretId: string) {
  const storedSecret = await dynamodbClient.send(
    new GetCommand({
      TableName: process.env.SECRETS_TABLE_NAME!,
      Key: { secretId },
    }),
  );

  return storedSecret.Item ? (storedSecret.Item as StoredSecret) : undefined;
}

async function deleteEncryptedSecret(secretId: string) {
  await dynamodbClient.send(
    new DeleteCommand({
      TableName: process.env.SECRETS_TABLE_NAME!,
      Key: { secretId },
    }),
  );
}

const RESPONSE_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST",
  "Access-Control-Allow-Headers": "Content-Type",
};

function createHttpResponse(statusCode: number, body: object) {
  return {
    statusCode: statusCode,
    body: JSON.stringify(body),
    headers: RESPONSE_HEADERS,
  };
}

export const handler: APIGatewayProxyHandler = async (event) => {
  logger.info("Event", { event });
  const body = JSON.parse(event.body!);
  const encryptedInput = body["encryptedInput"]!;
  const passphrase = body["passphrase"];

  try {
    const decryptedInput: ResponseInputToEncrypt =
      await decryptResponseInput(encryptedInput);

    const storedSecret = await getEncryptedSecret(decryptedInput.secretId);
    if (!storedSecret) {
      return createHttpResponse(404, {
        message: "Secret not found",
      });
    }
    const decryptedSecret = EncryptionService.decrypt(
      storedSecret.encryptedSecret,
      decryptedInput.key,
      decryptedInput.iv,
    );
    const decryptedData = JSON.parse(
      decryptedSecret.decryptedData,
    ) as UserSecretInput;
    if (decryptedData.passphrase !== passphrase) {
      return createHttpResponse(401, {
        message: "Invalid passphrase",
      });
    }
    logger.info("decryptedData + passphrase", { decryptedData, passphrase });
    await deleteEncryptedSecret(decryptedInput.secretId);

    return createHttpResponse(200, {
      secretString: decryptedData.secretString,
    });
  } catch (error) {
    if (error instanceof InvalidCiphertextException) {
      return createHttpResponse(400, {
        message: "Invalid encrypted input",
      });
    } else {
      throw error; // re-throw the error unchanged
    }
  }
};
