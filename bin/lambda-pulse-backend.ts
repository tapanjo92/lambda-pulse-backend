#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaPulseBackendStack } from '../lib/lambda-pulse-backend-stack';
import { TenantConfigStack } from '../lib/tenant-config-stack';
import { ColdStartDataStack } from '../lib/cold-start-data-stack';
import { DataPipelineStack } from '../lib/data-pipeline-stack';

const app = new cdk.App();
const region = process.env.CDK_DEFAULT_REGION || 'ap-south-1'; // Define region, or use your specific one
const account = process.env.CDK_DEFAULT_ACCOUNT || '809555764832'; // Define account, or use your specific one

const defaultStackProps = {
    env: { account, region },
};

new LambdaPulseBackendStack(app, 'LambdaPulseBackendStack', defaultStackProps);

new TenantConfigStack(app, 'LambdaPulseTenantConfigStack', defaultStackProps);

// Instantiate ColdStartDataStack
const coldStartDataStack = new ColdStartDataStack(app, 'LambdaPulseColdStartDataStack', defaultStackProps);

// Instantiate DataPipelineStack and pass the table details
new DataPipelineStack(app, 'LambdaPulseDataPipelineStack', {
  ...defaultStackProps, // Spread default props
  coldStartDataTableName: coldStartDataStack.coldStartDataTable.tableName,
  coldStartDataTableArn: coldStartDataStack.coldStartDataTable.tableArn,
});

cdk.Tags.of(app).add('Project', 'LambdaPulse');
