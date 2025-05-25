import * as cdk from 'aws-cdk-lib';
import { StackProps as CdkStackProps } from 'aws-cdk-lib';
import * as sqs from 'aws-cdk-lib/aws-sqs';
import * as lambdaNodejs from 'aws-cdk-lib/aws-lambda-nodejs';
import { Construct } from 'constructs';
export interface DataPipelineStackProps extends CdkStackProps {
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
export declare class DataPipelineStack extends cdk.Stack {
    readonly ingestionQueue: sqs.Queue;
    readonly deadLetterQueue: sqs.Queue;
    readonly processingLambda: lambdaNodejs.NodejsFunction;
    constructor(scope: Construct, id: string, props: DataPipelineStackProps);
}
