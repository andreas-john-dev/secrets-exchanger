import { App } from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { StatefulStack } from '../src/stacks/statefulStack';

test('Snapshot', () => {
  const app = new App();
  const stack = new StatefulStack(app, 'test', {
    env: { account: '123456789012', region: 'eu-central-1' },
  });

  const template = Template.fromStack(stack);
  expect(template.toJSON()).toMatchSnapshot();
});