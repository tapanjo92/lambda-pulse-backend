import * as cdk from 'aws-cdk-lib';
import { StackProps as CdkStackProps } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
export interface DataPipelineStackProps extends CdkStackProps {
    coldStartDataTableName: string;
    coldStartDataTableArn: string;
    tenantConfigTableName: string;
    tenantConfigTableArn: string;
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
export declare class DataPipelineStack extends cdk.Stack {
    readonly ingestionQueue: sqs.Queue;
    readonly deadLetterQueue: sqs.Queue;
    readonly processingLambda: lambdaNodejs.NodejsFunction;
    readonly orchestratorLambda: lambdaNodejs.NodejsFunction;
    constructor(scope: Construct, id: string, props: DataPipelineStackProps);
}
