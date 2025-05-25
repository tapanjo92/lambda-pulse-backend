import * as cdk from 'aws-cdk-lib';
import { Duration, StackProps as CdkStackProps } from 'aws-cdk-lib'; // Renamed to CdkStackProps to avoid conflict
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import * as iam from 'aws-cdk-lib/aws-iam';
import { SqsEventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { Construct } from 'constructs';
import * as path from 'path';

// Interface for props expected by this stack
export interface DataPipelineStackProps extends CdkStackProps { // Using CdkStackProps
  coldStartDataTableName: string;
  coldStartDataTableArn: string;
}

/**
 * Deploys:
 * - LambdaPulseIngestionDLQ   (standard queue)
 * - LambdaPulseIngestionQueue (standard queue, wired to the DLQ)
 * - LambdaPulseProcessingFunction (Lambda to process SQS messages and write to DynamoDB)
 *
 * Outputs URLs, ARNs, and names for relevant resources.
 */
export class DataPipelineStack extends cdk.Stack {
  public readonly ingestionQueue: sqs.Queue;
  public readonly deadLetterQueue: sqs.Queue;
  public readonly processingLambda: lambdaNodejs.NodejsFunction;

  constructor(scope: Construct, id: string, props: DataPipelineStackProps) { // Expecting DataPipelineStackProps
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
      runtime: lambda.Runtime.NODEJS_LATEST, // Or specific like NODEJS_20_X
      entry: 'src/lambdas/processing-lambda/index.ts', // Path to your Lambda code
      handler: 'handler', // The exported function name in your Lambda code
      timeout: Duration.seconds(60), // Adjust as needed, ensure SQS visibility timeout is longer
      memorySize: 256, // Adjust as needed
      environment: {
        COLD_START_DATA_TABLE_NAME: props.coldStartDataTableName,
        // Add other necessary environment variables here (e.g., LOG_LEVEL)
      },
      bundling: {
        minify: false,
        sourceMap: true,
        externalModules: ['@aws-sdk/*'], // Exclude AWS SDK v3 modules from bundle, use Lambda's provided SDK
      },
    });

    // Grant the Lambda permission to consume messages from the SQS queue
    // This also sets up the SQS queue as an event source for the Lambda
    this.processingLambda.addEventSource(new SqsEventSource(this.ingestionQueue, {
      batchSize: 5, // Number of messages to pull in one go. Max 10 for standard queues.
      // maxBatchingWindow: Duration.minutes(1), // Optional: Max time to gather messages before invoking.
      // reportBatchItemFailures: true, // Recommended for more granular error handling with SQS
    }));

    // Grant the Lambda permission to write to the ColdStartData DynamoDB table
    this.processingLambda.addToRolePolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['dynamodb:PutItem', 'dynamodb:UpdateItem'], // Add other actions if needed (e.g., BatchWriteItem)
      resources: [props.coldStartDataTableArn],
    }));

    /* ------------------------------------------------------------------------
     * 4. CloudFormation outputs
     * --------------------------------------------------------------------- */
    new cdk.CfnOutput(this, 'IngestionQueueUrlOutput', { // Made output names more unique
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
  }
}
