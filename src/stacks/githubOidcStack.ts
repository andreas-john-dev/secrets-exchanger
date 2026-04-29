import { CfnOutput, Fn, Stack, StackProps } from "aws-cdk-lib";
import {
    Effect,
    FederatedPrincipal,
    ManagedPolicy,
    PolicyStatement,
    Role,
} from "aws-cdk-lib/aws-iam";
import { NagSuppressions } from "cdk-nag";
import { Construct } from "constructs";

export interface GitHubOidcStackProps extends StackProps {
    /**
     * GitHub repository in the form "owner/repo".
     */
    readonly githubRepo: string;
    /**
     * Branch / ref / environment subject filter. Defaults to allowing the main
     * branch and the workflow_dispatch event.
     */
    readonly subjectClaims?: string[];
    /**
     * IAM role name. Including the project name avoids collisions with other
     * GitHub OIDC roles already present in the AWS account.
     */
    readonly roleName?: string;
}

/**
 * Provisions an IAM role that GitHub Actions can assume via the
 * AWS-account-level GitHub OIDC provider (assumed to already exist in the
 * account). The role is granted the permissions needed to run `cdk deploy`
 * by assuming the CDK bootstrap roles.
 */
export class GitHubOidcStack extends Stack {
    readonly roleArn: string;

    constructor(scope: Construct, id: string, props: GitHubOidcStackProps) {
        super(scope, id, props);

        const subjects = props.subjectClaims ?? [
            `repo:${props.githubRepo}:ref:refs/heads/main`,
            `repo:${props.githubRepo}:environment:dev`,
            `repo:${props.githubRepo}:environment:prod`,
        ];

        // Assumes the GitHub OIDC provider already exists in this AWS account
        // (only one provider per URL is allowed per account).
        const providerArn = `arn:aws:iam::${this.account}:oidc-provider/token.actions.githubusercontent.com`;

        const role = new Role(this, "DeployRole", {
            roleName:
                props.roleName ?? "SecretsExchangerGitHubActionsDeployRole",
            assumedBy: new FederatedPrincipal(
                providerArn,
                {
                    StringEquals: {
                        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
                    },
                    StringLike: {
                        "token.actions.githubusercontent.com:sub": subjects,
                    },
                },
                "sts:AssumeRoleWithWebIdentity",
            ),
            description:
                "Role assumed by GitHub Actions to deploy the SecretsExchanger CDK app.",
        });

        // Allow assuming the CDK bootstrap roles (qualifier "hnb659fds" is the
        // default; adjust if you re-bootstrapped with a custom qualifier).
        role.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ["sts:AssumeRole"],
                resources: [
                    `arn:aws:iam::${this.account}:role/cdk-hnb659fds-deploy-role-*`,
                    `arn:aws:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-*`,
                    `arn:aws:iam::${this.account}:role/cdk-hnb659fds-image-publishing-role-*`,
                    `arn:aws:iam::${this.account}:role/cdk-hnb659fds-lookup-role-*`,
                ],
            }),
        );

        // CDK lookups (e.g. HostedZone.fromLookup) and `cdk diff` need direct
        // read access for context providers.
        role.addManagedPolicy(
            ManagedPolicy.fromAwsManagedPolicyName("ReadOnlyAccess"),
        );

        NagSuppressions.addResourceSuppressions(
            role,
            [
                {
                    id: "AwsSolutions-IAM4",
                    reason:
                        "ReadOnlyAccess is required for CDK context lookups during synth.",
                    appliesTo: [
                        "Policy::arn:<AWS::Partition>:iam::aws:policy/ReadOnlyAccess",
                    ],
                },
                {
                    id: "AwsSolutions-IAM5",
                    reason:
                        "Wildcards are scoped to this account's CDK bootstrap roles only.",
                    appliesTo: [
                        `Resource::arn:aws:iam::${this.account}:role/cdk-hnb659fds-deploy-role-*`,
                        `Resource::arn:aws:iam::${this.account}:role/cdk-hnb659fds-file-publishing-role-*`,
                        `Resource::arn:aws:iam::${this.account}:role/cdk-hnb659fds-image-publishing-role-*`,
                        `Resource::arn:aws:iam::${this.account}:role/cdk-hnb659fds-lookup-role-*`,
                    ],
                },
            ],
            true,
        );

        this.roleArn = role.roleArn;

        new CfnOutput(this, "DeployRoleArn", {
            value: role.roleArn,
            description: "ARN of the role for GitHub Actions to assume",
            exportName: Fn.join("-", [this.stackName, "DeployRoleArn"]),
        });
    }
}
