import { awscdk, javascript } from "projen";
import { Transform } from "projen/lib/javascript/jest";
const project = new awscdk.AwsCdkTypeScriptApp({
  cdkVersion: "2.1.0",
  typescriptVersion: "^6.0.3",
  defaultReleaseBranch: "main",
  name: "secrets-exchanger",
  packageManager: javascript.NodePackageManager.NPM,
  projenrcTs: true,
  eslint: false,
  jestOptions: {
    jestVersion: "^30.0.0",
    jestConfig: {
      testPathIgnorePatterns: ["/node_modules/", "/secrets-exchanger-web-app/"],
      transform: {
        "^.+\\.[t]sx?$": new Transform("ts-jest", { tsconfig: "tsconfig.dev.json", isolatedModules: true }),
      },
    },
  },
  gitignore: [".DS_Store"],
  tsconfig: {
    exclude: ["src/stacks/website/secrets-exchanger-web-app"],
  },
  deps: [
    "@types/aws-lambda",
    "@aws-sdk/client-dynamodb",
    "@aws-sdk/lib-dynamodb",
    "@aws-sdk/client-kms",
    "@aws-lambda-powertools/logger",
  ],
  // deps: [],                /* Runtime dependencies of this module. */
  // description: undefined,  /* The description is just a string that helps people understand the purpose of the package. */
  devDeps: [
    "prettier@^3.8.3",
    "eslint@^10.2.1",
    "prettier-eslint@^16.4.2",
    "typescript-eslint@^8.59.1",
    "@eslint/js@^10.0.1",
    "cdk-nag",
  ] /* Build dependencies for this module. */,
  // packageName: undefined,  /* The "name" in package.json. */
});
project.synth();
