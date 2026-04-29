import { Stack, StackProps } from "aws-cdk-lib";
import { ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { IHostedZone } from "aws-cdk-lib/aws-route53";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";
import { PROJECT_NAME } from "../constants";
import { AngularWebApp } from "./website/angular-web-app.construct";

export interface WebsiteStackProps extends StackProps {
  readonly customDomain?: {
    readonly domainName: string;
    readonly certificate: ICertificate;
    readonly hostedZone: IHostedZone;
  };
}

export class WebsiteStack extends Stack {
  readonly websiteDomainName: string;
  constructor(scope: Construct, id: string, props: WebsiteStackProps) {
    super(scope, id, {
      ...props,
      stackName: PROJECT_NAME + "-Website",
      crossRegionReferences: true,
    });

    const webApp = new AngularWebApp(this, "web-app", {
      projectName: "secrets-exchanger-web-app",
      buildConfiguration: "production",
      relativeAngularPath: "./src/stacks/website/secrets-exchanger-web-app",
      customDomain: props.customDomain,
    });
    this.websiteDomainName = webApp.domainName;

    NagSuppressions.addResourceSuppressionsByPath(
      this,
      "/website-dev/Custom::CDKBucketDeployment8693BB64968944B69AAFB0CC9EB8756C",
      [
        { id: "AwsSolutions-L1", reason: "CDK Custom Resource" },
        { id: "AwsSolutions-IAM5", reason: "CDK Custom Resource" },
        { id: "AwsSolutions-IAM4", reason: "CDK Custom Resource" },
      ],
      true,
    );
  }
}
