import { Stack, StackProps } from "aws-cdk-lib";
import { Certificate, CertificateValidation, ICertificate } from "aws-cdk-lib/aws-certificatemanager";
import { HostedZone, IHostedZone } from "aws-cdk-lib/aws-route53";
import { Construct } from "constructs";

export interface CertificateStackProps extends StackProps {
    /** Fully-qualified domain name to issue the certificate for, e.g. secrets-exchanger.andi-john-dev.de */
    readonly domainName: string;
    /** Name of an existing public hosted zone, e.g. andi-john-dev.de */
    readonly hostedZoneName: string;
}

/**
 * Issues an ACM certificate in us-east-1 (required for CloudFront).
 * Validates via DNS using an existing Route53 hosted zone.
 */
export class CertificateStack extends Stack {
    readonly certificate: ICertificate;
    readonly hostedZone: IHostedZone;

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, { ...props, crossRegionReferences: true });

        this.hostedZone = HostedZone.fromLookup(this, "HostedZone", {
            domainName: props.hostedZoneName,
        });

        this.certificate = new Certificate(this, "WebsiteCertificate", {
            domainName: props.domainName,
            validation: CertificateValidation.fromDns(this.hostedZone),
        });
    }
}
