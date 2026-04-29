import { aws_apigateway as apigw, aws_lambda as lambda } from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { PROJECT_NAME } from "../../constants";

interface SecretsExchangerApiProps {
  storeEncryptedSecret: lambda.Alias;
  readSecretFunction: lambda.Alias;
  allowOrigins: string[];
}
export class SecretsExchangerApi extends Construct {
  constructor(scope: Construct, id: string, props: SecretsExchangerApiProps) {
    super(scope, id);
    const restApi = new apigw.RestApi(this, "rest-api", {
      defaultCorsPreflightOptions: {
        allowOrigins: props.allowOrigins,
        allowMethods: apigw.Cors.ALL_METHODS,
        allowHeaders: apigw.Cors.DEFAULT_HEADERS,
      },
      restApiName: `${PROJECT_NAME}-Api`,
    });
    restApi.addRequestValidator("validate-request", {
      validateRequestBody: true,
      validateRequestParameters: true,
    });
    const encryptModel = restApi.addModel("SecretCreationModel", {
      contentType: "application/json",
      modelName: "SecretCreationModel",
      schema: {
        type: apigw.JsonSchemaType.OBJECT,
        required: ["secretString"],
        properties: {
          secretString: { type: apigw.JsonSchemaType.STRING },
          passphrase: { type: apigw.JsonSchemaType.STRING },
        },
      },
    });
    const decryptModel = restApi.addModel("SecretReadModel", {
      contentType: "application/json",
      modelName: "SecretReadModel",
      schema: {
        type: apigw.JsonSchemaType.OBJECT,
        required: ["encryptedInput"],
        properties: {
          encryptedInput: { type: apigw.JsonSchemaType.STRING },
          passphrase: { type: apigw.JsonSchemaType.STRING },
        },
      },
    });
    const encryptResource = restApi.root.addResource("encrypt");
    encryptResource.addMethod(
      "POST",
      new apigw.LambdaIntegration(props.storeEncryptedSecret),
      {
        requestModels: { "application/json": encryptModel },
      },
    );
    const decryptResource = restApi.root.addResource("decrypt");
    decryptResource.addMethod(
      "POST",
      new apigw.LambdaIntegration(props.readSecretFunction),
      {
        requestModels: { "application/json": decryptModel },
      },
    );

    NagSuppressions.addResourceSuppressions(
      restApi,
      [
        { id: "AwsSolutions-APIG4", reason: "It is a public API" },
        { id: "AwsSolutions-COG4", reason: "It is a public API" },
        { id: "AwsSolutions-APIG6", reason: "No logging due to costs" },
        { id: "AwsSolutions-APIG1", reason: "No logging due to costs" },
        { id: "AwsSolutions-APIG3", reason: "No WAF yet..." },
        {
          id: "AwsSolutions-IAM4",
          reason: "AWS managed role for CloudWatch is fine.",
        },
      ],
      true,
    );
  }
}
