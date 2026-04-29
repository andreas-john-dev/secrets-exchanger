import {
  Duration,
  aws_dynamodb as dynamodb,
  aws_kms as kms,
  aws_lambda as lambda,
  aws_logs as logs,
  aws_lambda_nodejs as nodeLambda,
} from "aws-cdk-lib";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { resolve } from "path";
interface SecretsExchangeLogicProps {
  kmsKey: kms.IKey;
  secretsTable: dynamodb.TableV2;
}
export class SecretsExchangeLogic extends Construct {
  readonly storeEncryptedSecret: lambda.Alias;
  readonly readSecretFunction: lambda.Alias;

  constructor(scope: Construct, id: string, props: SecretsExchangeLogicProps) {
    super(scope, id);

    this.storeEncryptedSecret = this.createStoreEncryptedSecret(props);
    this.readSecretFunction = this.createReadSecretFunction(props);

    NagSuppressions.addResourceSuppressions(
      this,
      [
        {
          id: "AwsSolutions-IAM5",
          reason: "Lambda Basic Execution Role is fine",
          appliesTo: ["Action::kms:GenerateDataKey*", "Action::kms:ReEncrypt*"],
        },
        {
          id: "AwsSolutions-IAM4",
          reason: "Lambda Basic Execution Role is fine",
          appliesTo: [
            "Policy::arn:<AWS::Partition>:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
          ],
        },
      ],
      true,
    );
  }

  private createStoreEncryptedSecret(
    props: SecretsExchangeLogicProps,
  ): lambda.Alias {
    const storeEncryptedSecretLogGroup = new logs.LogGroup(this, "StoreEncryptedSecretLogGroup", {
      retention: RetentionDays.ONE_WEEK,
    });
    const storeEncryptedSecret = new nodeLambda.NodejsFunction(
      this,
      "StoreEncryptedSecretFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        architecture: lambda.Architecture.ARM_64,
        memorySize: 1024,
        timeout: Duration.seconds(10),
        // Hard ceiling on concurrent invocations to bound worst-case spend.
        reservedConcurrentExecutions: 10,
        logGroup: storeEncryptedSecretLogGroup,
        entry: resolve(__dirname, "store-encrypted-secret.handler.ts"),
        environment: {
          KMS_KEY_ID: props.kmsKey.keyId,
          SECRETS_TABLE_NAME: props.secretsTable.tableName,
        },
      },
    );

    props.kmsKey.grantEncrypt(storeEncryptedSecret);
    props.secretsTable.grantWriteData(storeEncryptedSecret);

    return storeEncryptedSecret.addAlias("Live");
  }
  private createReadSecretFunction(
    props: SecretsExchangeLogicProps,
  ): lambda.Alias {
    const readSecretLogGroup = new logs.LogGroup(this, "ReadSecretLogGroup", {
      retention: RetentionDays.ONE_WEEK,
    });
    const readSecretFunction = new nodeLambda.NodejsFunction(
      this,
      "ReadSecretFunction",
      {
        runtime: lambda.Runtime.NODEJS_24_X,
        architecture: lambda.Architecture.ARM_64,
        entry: resolve(__dirname, "read-secret.handler.ts"),
        memorySize: 1024,
        timeout: Duration.seconds(10),
        reservedConcurrentExecutions: 10,
        logGroup: readSecretLogGroup,
        environment: {
          KMS_KEY_ID: props.kmsKey.keyId,
          SECRETS_TABLE_NAME: props.secretsTable.tableName,
        },
      },
    );

    props.kmsKey.grantDecrypt(readSecretFunction);
    props.secretsTable.grantReadWriteData(readSecretFunction);

    return readSecretFunction.addAlias("Live");
  }
}
