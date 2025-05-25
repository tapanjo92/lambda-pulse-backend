import * as cdk from 'aws-cdk-lib';
import { Duration, StackProps as CdkStackProps } from 'aws-cdk-lib'; // Renamed to CdkStackProps
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import * as events from 'aws-cdk-lib/aws-events'; // For EventBridge
import * as eventTargets from 'aws-cdk-lib/aws-events-targets'; // For EventBridge Lambda target
import { Construct } from 'constructs';
import * as path from 'path';

// Interface for props expected by this stack
export interface DataPipelineStackProps extends CdkStackProps {
  coldStartDataTableName: string;
  coldStartDataTableArn: string;
  tenantConfigTableName: string;  // Added for Orchestrator Lambda
  tenantConfigTableArn: string;   // Added for Orchestrator Lambda
}

/**
 * Deploys:
 * - LambdaPulseIngestionDLQ (standard queue)
 * - LambdaPulseIngestionQueue (standard queue, wired to the DLQ)
 * - LambdaPulseProcessingFunction (Lambda to process SQS messages and write to DynamoDB)
 * - LambdaPulseOrchestratorFunction (Lambda to simulate data fetching and send to SQS)
 * - EventBridge rule to schedule the Orchestrator Lambda
 *
 * Outputs URLs, ARNs, and names for relevant resources.
 */
export class DataPipelineStack extends cdk.Stack {
  public readonly ingestionQueue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly processingLambda: lambdaNodejs.NodejsFunction;
  public readonly orchestratorLambda: lambdaNodejs.NodejsFunction; // Added for Orchestrator

  constructor(scope: Construct, id: string, props: DataPipelineStackProps) {
    super(scope, id, props);

    /* ------------------------------------------------------------------------
     * 1. Dead-letter queue
     * --------------------------------------------------------------------- */
    this.deadLetterQueue = new sqs.Queue(this, 'LambdaPulseIngestionDLQ', {
      queueName: 'LambdaPulseIngestionDLQ',
      retentionPeriod: Duration.days(14),
      // encryption: sqs.QueueEncryption.KMS_MANAGED, // uncomment in prod
    });

    /* ------------------------------------------------------------------------
     * 2. Main ingestion queue
     * --------------------------------------------------------------------- */
    this.ingestionQueue = new sqs.Queue(this, 'LambdaPulseIngestionQueue', {
      queueName: 'LambdaPulseIngestionQueue',
      visibilityTimeout: Duration.seconds(300), // must exceed Lambda timeout + buffer
      retentionPeriod: Duration.days(4),
      deadLetterQueue: {
        maxReceiveCount: 3, // Number of retries before sending to DLQ
        queue: this.deadLetterQueue,
      },
      // encryption: sqs.QueueEncryption.KMS_MANAGED, // uncomment in prod
    });

    /* ------------------------------------------------------------------------
     * 3. Processing Lambda Function
     * --------------------------------------------------------------------- */
    this.processingLambda = new lambdaNodejs.NodejsFunction(this, 'LambdaPulseProcessingFunction', {
      functionName: 'LambdaPulse-ProcessColdStarts', // Optional: define a specific name
      runtime: lambda.Runtime.NODEJS_LATEST,
      entry: path.join(__dirname, '../../src/lambdas/processing-lambda/index.ts'), // Corrected path
      handler: 'handler',
      timeout: Duration.seconds(60),
      memorySize: 256,
      environment: {
        COLD_START_DATA_TABLE_NAME: props.coldStartDataTableName,
      },
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // Exclude AWS SDK v3 from bundle
      },
    });

    // Grant Processing Lambda permission to consume from SQS and set up event source
    this.processingLambda.addEventSource(new SqsEventSource(this.ingestionQueue, {
      batchSize: 5,
      // reportBatchItemFailures: true, // Recommended for granular error handling
    }));

    // Grant Processing Lambda permission to write to ColdStartData DynamoDB table
    this.processingLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'],
      resources: [props.coldStartDataTableArn],
    }));

    /* ------------------------------------------------------------------------
     * 4. Orchestrator Lambda Function
     * --------------------------------------------------------------------- */
    this.orchestratorLambda = new lambdaNodejs.NodejsFunction(this, 'LambdaPulseOrchestratorFunction', {
      functionName: 'LambdaPulse-OrchestrateDataFetch', // Optional: define a specific name
      runtime: lambda.Runtime.NODEJS_LATEST,
      entry: 'src/lambdas/processing-lambda/index.ts',
      handler: 'handler',
      timeout: Duration.minutes(1), // Can be shorter if just sending SQS messages
      memorySize: 256,
      environment: {
        TENANT_CONFIG_TABLE_NAME: props.tenantConfigTableName,
        INGESTION_SQS_QUEUE_URL: this.ingestionQueue.queueUrl,
      },
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // Exclude AWS SDK v3 from bundle
      },
    });

    // Grant Orchestrator Lambda permission to read from TenantConfigTable
    this.orchestratorLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:Scan', 'dynamodb:Query'], // Query might be useful later
      resources: [props.tenantConfigTableArn],
    }));

    // Grant Orchestrator Lambda permission to send messages to the Ingestion SQS queue
    this.ingestionQueue.grantSendMessages(this.orchestratorLambda);

    // Schedule the Orchestrator Lambda to run periodically
    const scheduleRule = new events.Rule(this, 'OrchestratorScheduleRule', {
      ruleName: 'LambdaPulse-OrchestratorSchedule', // Optional: define a specific name
      schedule: events.Schedule.rate(Duration.minutes(15)), // Run every 15 minutes
      // For testing, you might use Duration.minutes(2) or similar
    });
    scheduleRule.addTarget(new eventTargets.LambdaFunction(this.orchestratorLambda));


    /* ------------------------------------------------------------------------
     * 5. CloudFormation outputs
     * --------------------------------------------------------------------- */
    new cdk.CfnOutput(this, 'IngestionQueueUrlOutput', {
      value: this.ingestionQueue.queueUrl,
    });
    new cdk.CfnOutput(this, 'IngestionQueueArnOutput', {
      value: this.ingestionQueue.queueArn,
    });
    new cdk.CfnOutput(this, 'DeadLetterQueueUrlOutput', {
      value: this.deadLetterQueue.queueUrl,
    });
    new cdk.CfnOutput(this, 'DeadLetterQueueArnOutput', {
      value: this.deadLetterQueue.queueArn,
    });
    new cdk.CfnOutput(this, 'ProcessingLambdaNameOutput', {
      value: this.processingLambda.functionName,
    });
    new cdk.CfnOutput(this, 'ProcessingLambdaArnOutput', {
      value: this.processingLambda.functionArn,
    });
    new cdk.CfnOutput(this, 'OrchestratorLambdaNameOutput', { // Added for Orchestrator
        value: this.orchestratorLambda.functionName,
    });
    new cdk.CfnOutput(this, 'OrchestratorLambdaArnOutput', { // Added for Orchestrator
        value: this.orchestratorLambda.functionArn,
    });
    new cdk.CfnOutput(this, 'OrchestratorScheduleRuleNameOutput', { // Added for Schedule Rule
        value: scheduleRule.ruleName,
    });
  }
}
