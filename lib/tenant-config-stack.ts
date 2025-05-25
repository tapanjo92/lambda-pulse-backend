import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class TenantConfigStack extends cdk.Stack {
  public readonly tenantConfigTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.tenantConfigTable = new dynamodb.Table(this, 'TenantConfigurationTable', {
      tableName: 'LambdaPulseTenantConfig', // Optional: set a specific physical name
      partitionKey: {
        name: 'tenantId',
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Good for starting, cost-effective for unpredictable workloads
      removalPolicy: cdk.RemovalPolicy.DESTROY, // IMPORTANT: This will delete the table if you destroy the stack. Good for dev, use RETAIN for prod.
    });

    // Output the table name for easy reference
    new cdk.CfnOutput(this, 'TenantConfigTableName', {
      value: this.tenantConfigTable.tableName,
    });
  }
}
