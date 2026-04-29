import {
  Stack,
  StackProps,
  aws_dynamodb as dynamodb,
  aws_kms as kms,
} from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { PROJECT_NAME } from "../constants";

export interface StatefulStackProps extends StackProps {}

export class StatefulStack extends Stack {
  readonly secretsTable: dynamodb.TableV2;
  readonly kmsKey: kms.Key;
  constructor(scope: Construct, id: string, props: StatefulStackProps) {
    super(scope, id, { ...props, stackName: PROJECT_NAME + "-Stateful" });

    this.secretsTable = new dynamodb.TableV2(this, "secrets-table", {
      partitionKey: { name: "secretId", type: dynamodb.AttributeType.STRING },
      billing: dynamodb.Billing.onDemand(),
      timeToLiveAttribute: "ttl",
    });

    this.kmsKey = new kms.Key(this, "secrets-encryption-key", {
      enableKeyRotation: false,
      alias: "SecretsExchangerKey",
      keySpec: kms.KeySpec.SYMMETRIC_DEFAULT,
    });

    NagSuppressions.addResourceSuppressions(
      this.kmsKey,
      [
        {
          id: "AwsSolutions-KMS5",
          reason: "Key rotation is not required for this use case",
        },
      ],
      true,
    );
  }
}
