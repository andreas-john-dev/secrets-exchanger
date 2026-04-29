import { App, Aspects } from "aws-cdk-lib";
import { AwsSolutionsChecks } from "cdk-nag";
import { ENVIRONMENT_PROPERTIES, Stage } from "./constants";
import { ApiStack } from "./stacks/apiStack";
import { CertificateStack } from "./stacks/certificateStack";
import { GitHubOidcStack } from "./stacks/githubOidcStack";
import { StatefulStack } from "./stacks/statefulStack";
import { WebsiteStack } from "./stacks/websiteStack";

const stage = (process.env.CDK_STAGE || "dev") as Stage;
const envProps = ENVIRONMENT_PROPERTIES[stage];

const app = new App();

const websiteDomainName =
  process.env.WEBSITE_DOMAIN_NAME || "secrets-exchanger.andi-john-dev.de";
const hostedZoneName = process.env.HOSTED_ZONE_NAME || "andi-john-dev.de";

const certStack = new CertificateStack(app, `website-cert-${stage}`, {
  env: { account: envProps.env.account, region: "us-east-1" },
  domainName: websiteDomainName,
  hostedZoneName,
});

const statefulStack = new StatefulStack(app, `stateful-${stage}`, {
  env: envProps.env,
});
const apiStack = new ApiStack(app, `api-${stage}`, {
  env: envProps.env,
  secretsTable: statefulStack.secretsTable,
  kmsKey: statefulStack.kmsKey,
  allowOrigins: [
    `https://${websiteDomainName}`,
    "http://localhost:4200",
  ],
});

const websiteStack = new WebsiteStack(app, `website-${stage}`, {
  env: envProps.env,
  apiUrl: apiStack.apiUrl,
  customDomain: {
    domainName: websiteDomainName,
    certificate: certStack.certificate,
    hostedZone: certStack.hostedZone,
  },
});
websiteStack.addDependency(certStack);
websiteStack.addDependency(apiStack);
Aspects.of(app).add(new AwsSolutionsChecks({ verbose: true }));

const githubRepo = process.env.GITHUB_REPO || "andreas-john-dev/secrets-exchanger";
new GitHubOidcStack(app, `github-oidc-${stage}`, {
  env: envProps.env,
  githubRepo,
});

app.synth();
