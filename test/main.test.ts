import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { ENVIRONMENT_PROPERTIES } from '../src/constants';
import { StatefulStack } from '../src/stacks/statefulStack';

test('Snapshot', () => {
  const app = new App();
  const stack = new StatefulStack(app, 'test', { env: ENVIRONMENT_PROPERTIES.dev.env });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});