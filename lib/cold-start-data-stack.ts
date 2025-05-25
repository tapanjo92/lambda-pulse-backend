import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';

export class ColdStartDataStack extends cdk.Stack {
  public readonly coldStartDataTable: dynamodb.Table;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.coldStartDataTable = new dynamodb.Table(this, 'ColdStartDataTable', {
      tableName: 'LambdaPulseColdStartData', // Optional: set a specific physical name
      partitionKey: {
        name: 'tenantId',
        type: dynamodb.AttributeType.STRING,
      },
      sortKey: {
        name: 'timestamp#functionName', // Composite sort key
        type: dynamodb.AttributeType.STRING,
      },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.DESTROY, // Good for dev, use RETAIN or SNAPSHOT for prod.
      // Consider enabling Point-in-Time Recovery (PITR) for production
      // pointInTimeRecovery: true,
    });

    // Output the table name
    new cdk.CfnOutput(this, 'ColdStartDataTableName', {
      value: this.coldStartDataTable.tableName,
    });
  }
}
