#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { LambdaPulseBackendStack } from '../lib/lambda-pulse-backend-stack';
import { TenantConfigStack } from '../lib/tenant-config-stack';
import { ColdStartDataStack } from '../lib/cold-start-data-stack';
import { DataPipelineStack } from '../lib/data-pipeline-stack';

const app = new cdk.App();

// Ensure your AWS Account ID and Region are correctly set here.
// Using environment variables is good, but ensure they are available in your EC2 execution environment.
// If not, you might need to hardcode them or use another method to retrieve them.
const region = process.env.CDK_DEFAULT_REGION || 'ap-south-1';
const account = process.env.CDK_DEFAULT_ACCOUNT || '809555764832'; // Make sure this is your correct AWS Account ID

if (!account || account === 'YOUR_ACCOUNT_ID_PLACEHOLDER' || account.length !== 12) {
    console.error("Error: AWS Account ID is not set correctly. Please update 'account' in bin/lambda-pulse-backend.ts");
    process.exit(1); // Exit if account ID is not valid
}


const defaultStackProps = {
    env: { account, region },
};

// This stack is currently empty but kept for potential future use or structure
new LambdaPulseBackendStack(app, 'LambdaPulseBackendStack', defaultStackProps);

// Instantiate TenantConfigStack
const tenantConfigStack = new TenantConfigStack(app, 'LambdaPulseTenantConfigStack', defaultStackProps);

// Instantiate ColdStartDataStack
const coldStartDataStack = new ColdStartDataStack(app, 'LambdaPulseColdStartDataStack', defaultStackProps);

// Instantiate DataPipelineStack and pass all required props
new DataPipelineStack(app, 'LambdaPulseDataPipelineStack', {
  ...defaultStackProps, // Spread default props
  coldStartDataTableName: coldStartDataStack.coldStartDataTable.tableName,
  coldStartDataTableArn: coldStartDataStack.coldStartDataTable.tableArn,
  tenantConfigTableName: tenantConfigStack.tenantConfigTable.tableName, // <-- ADDED THIS
  tenantConfigTableArn: tenantConfigStack.tenantConfigTable.tableArn,   // <-- ADDED THIS
});

cdk.Tags.of(app).add('Project', 'LambdaPulse');

