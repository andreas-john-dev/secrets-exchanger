export const PROJECT_NAME = 'SecretsExchanger';

export type Stage = 'dev' | 'prod';

interface EnvironmentProps {
  env: {
    account?: string;
    region: string;
  };
}

export const ENVIRONMENT_PROPERTIES: Record<Stage, EnvironmentProps> = {
  dev: {
    env: {
      account: process.env.CDK_DEV_ACCOUNT || undefined,
      region: process.env.CDK_DEV_REGION || 'eu-central-1',
    },
  },
  prod: {
    env: {
      account: process.env.CDK_PROD_ACCOUNT || undefined,
      region: process.env.CDK_PROD_REGION || 'eu-west-1',
    },
  },
};
