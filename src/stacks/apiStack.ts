import {
  Stack,
  StackProps,
  aws_dynamodb as dynamodb,
  aws_kms as kms,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { PROJECT_NAME } from "../constants";
import { SecretsExchangeLogic } from "./api/secrets-exchange-logic.construct";
import { SecretsExchangerApi } from "./api/secrets-exchanger-api.construct";

export interface ApiStackProps extends StackProps {
  secretsTable: dynamodb.TableV2;
  kmsKey: kms.IKey;
  allowOrigins: string[];
}

export class ApiStack extends Stack {
  constructor(scope: Construct, id: string, props: ApiStackProps) {
    super(scope, id, { ...props, stackName: PROJECT_NAME + "-Api" });
    const exchangeLogic = new SecretsExchangeLogic(
      this,
      "secrets-exchange-logic",
      { secretsTable: props.secretsTable, kmsKey: props.kmsKey },
    );
    new SecretsExchangerApi(this, "secrets-exchanger-api", {
      allowOrigins: props.allowOrigins,
      storeEncryptedSecret: exchangeLogic.storeEncryptedSecret,
      readSecretFunction: exchangeLogic.readSecretFunction,
    });
  }
}
