import {
  aws_certificatemanager as acm,
  CfnOutput,
  aws_cloudfront as cloudfront,
  DockerImage,
  aws_cloudfront_origins as origins,
  aws_route53 as route53,
  aws_s3 as s3,
  aws_s3_deployment as s3Deployment,
  aws_route53_targets as targets,
} from "aws-cdk-lib";
import { NagSuppressions } from "cdk-nag";
import { spawnSync } from "child_process";
import { Construct } from "constructs";

interface AngularWebAppProps {
  /**
   * The configuration needed for building the angular app (defined in angular.json).
   * Probably something like 'production'.
   * This is needed to run "ng build --configuration <buildConfiguration>"
   */
  readonly buildConfiguration: string;

  /**
   * The path to the Angular code (relative to cdk folder).
   * e.g. "./demo-angular-app"
   */
  readonly relativeAngularPath: string;

  readonly projectName: string;

  /**
   * The API Gateway base URL to inject into the Angular runtime via /config.json.
   * May be a CDK token (resolved at deploy-time).
   */
  readonly apiUrl: string;

  /**
   * Optional custom domain configuration.
   * When provided, the CloudFront distribution will be served from this domain
   * and an A/AAAA alias record will be added to the supplied hosted zone.
   */
  readonly customDomain?: {
    readonly domainName: string;
    readonly certificate: acm.ICertificate;
    readonly hostedZone: route53.IHostedZone;
  };
}

export class AngularWebApp extends Construct {
  readonly domainName: string;
  constructor(scope: Construct, id: string, props: AngularWebAppProps) {
    super(scope, id);

    const webAppBucket = new s3.Bucket(this, "WebAppBucket", {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    const webDistribution = this.createCloudFrontDistribution(
      webAppBucket,
      props.customDomain,
    );
    this.domainName =
      props.customDomain?.domainName ?? webDistribution.distributionDomainName;
    new CfnOutput(this, "WebAppDomainName", {
      value: this.domainName,
    });
    new CfnOutput(this, "CloudFrontDomainName", {
      value: webDistribution.distributionDomainName,
    });

    if (props.customDomain) {
      new route53.ARecord(this, "WebAppAliasRecord", {
        zone: props.customDomain.hostedZone,
        recordName: props.customDomain.domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(webDistribution),
        ),
      });
      new route53.AaaaRecord(this, "WebAppAliasRecordIPv6", {
        zone: props.customDomain.hostedZone,
        recordName: props.customDomain.domainName,
        target: route53.RecordTarget.fromAlias(
          new targets.CloudFrontTarget(webDistribution),
        ),
      });
    }

    this.createDeployment(props, webAppBucket, webDistribution);

    NagSuppressions.addResourceSuppressions(
      webAppBucket,
      [
        {
          id: "AwsSolutions-S1",
          reason: "No access logging needed",
        },
      ],
      true,
    );
    NagSuppressions.addResourceSuppressions(
      webDistribution,
      [
        {
          id: "AwsSolutions-CFR2",
          reason: "No WAF needed currently",
        },
        {
          id: "AwsSolutions-CFR3",
          reason: "No access logging needed",
        },
      ],
      true,
    );
  }

  private createCloudFrontDistribution(
    webAppBucket: s3.IBucket,
    customDomain?: AngularWebAppProps["customDomain"],
  ) {
    const distribution = new cloudfront.Distribution(
      this,
      "AngularAppWebDistribution",
      {
        defaultBehavior: {
          origin: origins.S3BucketOrigin.withOriginAccessControl(webAppBucket),
        },
        geoRestriction: cloudfront.GeoRestriction.denylist("CN", "RU"),
        errorResponses: [
          {
            httpStatus: 403,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
          {
            httpStatus: 404,
            responseHttpStatus: 200,
            responsePagePath: "/index.html",
          },
        ],
        ...(customDomain
          ? {
            domainNames: [customDomain.domainName],
            certificate: customDomain.certificate,
            minimumProtocolVersion:
              cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
          }
          : {}),
      },
    );

    if (!customDomain) {
      NagSuppressions.addResourceSuppressions(distribution, [
        {
          id: "AwsSolutions-CFR4",
          reason:
            "No custom certificate used. Default CloudFront viewer cert is TLSv1",
        },
      ]);
    }

    return distribution;
  }

  private createDeployment(
    props: AngularWebAppProps,
    webAppBucket: s3.IBucket,
    webDistribution: cloudfront.Distribution,
  ) {
    new s3Deployment.BucketDeployment(this, "AngularWebAppDeployment", {
      destinationBucket: webAppBucket,
      sources: [
        s3Deployment.Source.asset(props.relativeAngularPath, {
          bundling: {
            // is mandatory, but actually not used when "local" is successful
            image: DockerImage.fromRegistry(
              "public.ecr.aws/docker/library/node:lts",
            ),
            local: {
              tryBundle(outputDir: string) {
                try {
                  spawnSync("npm --version");
                } catch {
                  return false;
                }
                spawnSync(
                  [
                    `cd ${props.relativeAngularPath}`,
                    "npm ci",
                    `npm run build -- -c ${props.buildConfiguration}`,
                    `cp -r ./dist/${props.projectName}/browser/* ${outputDir}`,
                  ].join(" && "),
                  {
                    shell: true, // for debugging
                    stdio: "inherit",
                  },
                );
                return true;
              },
            },
          },
        }),
        s3Deployment.Source.jsonData("config.json", {
          apiUrl: props.apiUrl,
        }),
      ],
      distribution: webDistribution,
    });
  }
}
