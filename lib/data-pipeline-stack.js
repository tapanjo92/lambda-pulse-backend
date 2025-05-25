"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataPipelineStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const aws_cdk_lib_1 = require("aws-cdk-lib"); // Renamed to CdkStackProps to avoid conflict
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
/**
 * Deploys:
 * - LambdaPulseIngestionDLQ   (standard queue)
 * - LambdaPulseIngestionQueue (standard queue, wired to the DLQ)
 * - LambdaPulseProcessingFunction (Lambda to process SQS messages and write to DynamoDB)
 *
 * Outputs URLs, ARNs, and names for relevant resources.
 */
class DataPipelineStack extends cdk.Stack {
    ingestionQueue;
    deadLetterQueue;
    processingLambda;
    constructor(scope, id, props) {
        super(scope, id, props);
        /* ------------------------------------------------------------------------
         * 1. Dead-letter queue
         * --------------------------------------------------------------------- */
        this.deadLetterQueue = new sqs.Queue(this, 'LambdaPulseIngestionDLQ', {
            queueName: 'LambdaPulseIngestionDLQ',
            retentionPeriod: aws_cdk_lib_1.Duration.days(14),
            // encryption: sqs.QueueEncryption.KMS_MANAGED, // uncomment in prod
        });
        /* ------------------------------------------------------------------------
         * 2. Main ingestion queue
         * --------------------------------------------------------------------- */
        this.ingestionQueue = new sqs.Queue(this, 'LambdaPulseIngestionQueue', {
            queueName: 'LambdaPulseIngestionQueue',
            visibilityTimeout: aws_cdk_lib_1.Duration.seconds(300), // must exceed Lambda timeout + buffer
            retentionPeriod: aws_cdk_lib_1.Duration.days(4),
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
            timeout: aws_cdk_lib_1.Duration.seconds(60), // Adjust as needed, ensure SQS visibility timeout is longer
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
        this.processingLambda.addEventSource(new aws_lambda_event_sources_1.SqsEventSource(this.ingestionQueue, {
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
    }
}
exports.DataPipelineStack = DataPipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1waXBlbGluZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEtcGlwZWxpbmUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsNkNBQW9FLENBQUMsNkNBQTZDO0FBQ2xILHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsNEVBQThEO0FBQzlELHlEQUEyQztBQUMzQyxtRkFBc0U7QUFVdEU7Ozs7Ozs7R0FPRztBQUNILE1BQWEsaUJBQWtCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDOUIsY0FBYyxDQUFZO0lBQzFCLGVBQWUsQ0FBWTtJQUMzQixnQkFBZ0IsQ0FBOEI7SUFFOUQsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUNyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7bUZBRTJFO1FBQzNFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNwRSxTQUFTLEVBQUUseUJBQXlCO1lBQ3BDLGVBQWUsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsb0VBQW9FO1NBQ3JFLENBQUMsQ0FBQztRQUVIOzttRkFFMkU7UUFDM0UsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ3JFLFNBQVMsRUFBRSwyQkFBMkI7WUFDdEMsaUJBQWlCLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsc0NBQXNDO1lBQ2hGLGVBQWUsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakMsZUFBZSxFQUFFO2dCQUNmLGVBQWUsRUFBRSxDQUFDLEVBQUUsMENBQTBDO2dCQUM5RCxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWU7YUFDNUI7WUFDRCxvRUFBb0U7U0FDckUsQ0FBQyxDQUFDO1FBRUg7O21GQUUyRTtRQUMzRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwrQkFBK0IsRUFBRTtZQUM3RixZQUFZLEVBQUUsK0JBQStCLEVBQUUsbUNBQW1DO1lBQ2xGLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWEsRUFBRSwrQkFBK0I7WUFDdEUsS0FBSyxFQUFFLHdDQUF3QyxFQUFFLDJCQUEyQjtZQUM1RSxPQUFPLEVBQUUsU0FBUyxFQUFFLGlEQUFpRDtZQUNyRSxPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLEVBQUUsNERBQTREO1lBQzNGLFVBQVUsRUFBRSxHQUFHLEVBQUUsbUJBQW1CO1lBQ3BDLFdBQVcsRUFBRTtnQkFDWCwwQkFBMEIsRUFBRSxLQUFLLENBQUMsc0JBQXNCO2dCQUN4RCxtRUFBbUU7YUFDcEU7WUFDRCxRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsb0VBQW9FO2FBQ3RHO1NBQ0YsQ0FBQyxDQUFDO1FBRUgscUVBQXFFO1FBQ3JFLG9FQUFvRTtRQUNwRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLElBQUkseUNBQWMsQ0FBQyxJQUFJLENBQUMsY0FBYyxFQUFFO1lBQzNFLFNBQVMsRUFBRSxDQUFDLEVBQUUsb0VBQW9FO1lBQ2xGLG9HQUFvRztZQUNwRywwRkFBMEY7U0FDM0YsQ0FBQyxDQUFDLENBQUM7UUFFSiwyRUFBMkU7UUFDM0UsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDNUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQyxFQUFFLHFEQUFxRDtZQUMzRyxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUM7U0FDekMsQ0FBQyxDQUFDLENBQUM7UUFFSjs7bUZBRTJFO1FBQzNFLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDakQsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUTtTQUNwQyxDQUFDLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLHlCQUF5QixFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsY0FBYyxDQUFDLFFBQVE7U0FDcEMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRO1NBQ3JDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDbEQsS0FBSyxFQUFFLElBQUksQ0FBQyxlQUFlLENBQUMsUUFBUTtTQUNyQyxDQUFDLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDRCQUE0QixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsWUFBWTtTQUM1QyxDQUFDLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ2pELEtBQUssRUFBRSxJQUFJLENBQUMsZ0JBQWdCLENBQUMsV0FBVztTQUMzQyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6RkQsOENBeUZDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IER1cmF0aW9uLCBTdGFja1Byb3BzIGFzIENka1N0YWNrUHJvcHMgfSBmcm9tICdhd3MtY2RrLWxpYic7IC8vIFJlbmFtZWQgdG8gQ2RrU3RhY2tQcm9wcyB0byBhdm9pZCBjb25mbGljdFxuaW1wb3J0ICogYXMgc3FzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zcXMnO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgbGFtYmRhTm9kZWpzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEtbm9kZWpzJztcbmltcG9ydCAqIGFzIGlhbSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtaWFtJztcbmltcG9ydCB7IFNxc0V2ZW50U291cmNlIH0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ldmVudC1zb3VyY2VzJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcGF0aCBmcm9tICdwYXRoJztcblxuLy8gSW50ZXJmYWNlIGZvciBwcm9wcyBleHBlY3RlZCBieSB0aGlzIHN0YWNrXG5leHBvcnQgaW50ZXJmYWNlIERhdGFQaXBlbGluZVN0YWNrUHJvcHMgZXh0ZW5kcyBDZGtTdGFja1Byb3BzIHsgLy8gVXNpbmcgQ2RrU3RhY2tQcm9wc1xuICBjb2xkU3RhcnREYXRhVGFibGVOYW1lOiBzdHJpbmc7XG4gIGNvbGRTdGFydERhdGFUYWJsZUFybjogc3RyaW5nO1xufVxuXG4vKipcbiAqIERlcGxveXM6XG4gKiAtIExhbWJkYVB1bHNlSW5nZXN0aW9uRExRICAgKHN0YW5kYXJkIHF1ZXVlKVxuICogLSBMYW1iZGFQdWxzZUluZ2VzdGlvblF1ZXVlIChzdGFuZGFyZCBxdWV1ZSwgd2lyZWQgdG8gdGhlIERMUSlcbiAqIC0gTGFtYmRhUHVsc2VQcm9jZXNzaW5nRnVuY3Rpb24gKExhbWJkYSB0byBwcm9jZXNzIFNRUyBtZXNzYWdlcyBhbmQgd3JpdGUgdG8gRHluYW1vREIpXG4gKlxuICogT3V0cHV0cyBVUkxzLCBBUk5zLCBhbmQgbmFtZXMgZm9yIHJlbGV2YW50IHJlc291cmNlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIERhdGFQaXBlbGluZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGluZ2VzdGlvblF1ZXVlOiBzcXMuUXVldWU7XG4gIHB1YmxpYyByZWFkb25seSBkZWFkTGV0dGVyUXVldWU6IHNxcy5RdWV1ZTtcbiAgcHVibGljIHJlYWRvbmx5IHByb2Nlc3NpbmdMYW1iZGE6IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcblxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogRGF0YVBpcGVsaW5lU3RhY2tQcm9wcykgeyAvLyBFeHBlY3RpbmcgRGF0YVBpcGVsaW5lU3RhY2tQcm9wc1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogMS4gRGVhZC1sZXR0ZXIgcXVldWVcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgICB0aGlzLmRlYWRMZXR0ZXJRdWV1ZSA9IG5ldyBzcXMuUXVldWUodGhpcywgJ0xhbWJkYVB1bHNlSW5nZXN0aW9uRExRJywge1xuICAgICAgcXVldWVOYW1lOiAnTGFtYmRhUHVsc2VJbmdlc3Rpb25ETFEnLFxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBEdXJhdGlvbi5kYXlzKDE0KSxcbiAgICAgIC8vIGVuY3J5cHRpb246IHNxcy5RdWV1ZUVuY3J5cHRpb24uS01TX01BTkFHRUQsIC8vIHVuY29tbWVudCBpbiBwcm9kXG4gICAgfSk7XG5cbiAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiAyLiBNYWluIGluZ2VzdGlvbiBxdWV1ZVxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuICAgIHRoaXMuaW5nZXN0aW9uUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdMYW1iZGFQdWxzZUluZ2VzdGlvblF1ZXVlJywge1xuICAgICAgcXVldWVOYW1lOiAnTGFtYmRhUHVsc2VJbmdlc3Rpb25RdWV1ZScsXG4gICAgICB2aXNpYmlsaXR5VGltZW91dDogRHVyYXRpb24uc2Vjb25kcygzMDApLCAvLyBtdXN0IGV4Y2VlZCBMYW1iZGEgdGltZW91dCArIGJ1ZmZlclxuICAgICAgcmV0ZW50aW9uUGVyaW9kOiBEdXJhdGlvbi5kYXlzKDQpLFxuICAgICAgZGVhZExldHRlclF1ZXVlOiB7XG4gICAgICAgIG1heFJlY2VpdmVDb3VudDogMywgLy8gTnVtYmVyIG9mIHJldHJpZXMgYmVmb3JlIHNlbmRpbmcgdG8gRExRXG4gICAgICAgIHF1ZXVlOiB0aGlzLmRlYWRMZXR0ZXJRdWV1ZSxcbiAgICAgIH0sXG4gICAgICAvLyBlbmNyeXB0aW9uOiBzcXMuUXVldWVFbmNyeXB0aW9uLktNU19NQU5BR0VELCAvLyB1bmNvbW1lbnQgaW4gcHJvZFxuICAgIH0pO1xuXG4gICAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogMy4gUHJvY2Vzc2luZyBMYW1iZGEgRnVuY3Rpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgICB0aGlzLnByb2Nlc3NpbmdMYW1iZGEgPSBuZXcgbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uKHRoaXMsICdMYW1iZGFQdWxzZVByb2Nlc3NpbmdGdW5jdGlvbicsIHtcbiAgICAgIGZ1bmN0aW9uTmFtZTogJ0xhbWJkYVB1bHNlLVByb2Nlc3NDb2xkU3RhcnRzJywgLy8gT3B0aW9uYWw6IGRlZmluZSBhIHNwZWNpZmljIG5hbWVcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU19MQVRFU1QsIC8vIE9yIHNwZWNpZmljIGxpa2UgTk9ERUpTXzIwX1hcbiAgICAgIGVudHJ5OiAnc3JjL2xhbWJkYXMvcHJvY2Vzc2luZy1sYW1iZGEvaW5kZXgudHMnLCAvLyBQYXRoIHRvIHlvdXIgTGFtYmRhIGNvZGVcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJywgLy8gVGhlIGV4cG9ydGVkIGZ1bmN0aW9uIG5hbWUgaW4geW91ciBMYW1iZGEgY29kZVxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg2MCksIC8vIEFkanVzdCBhcyBuZWVkZWQsIGVuc3VyZSBTUVMgdmlzaWJpbGl0eSB0aW1lb3V0IGlzIGxvbmdlclxuICAgICAgbWVtb3J5U2l6ZTogMjU2LCAvLyBBZGp1c3QgYXMgbmVlZGVkXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDT0xEX1NUQVJUX0RBVEFfVEFCTEVfTkFNRTogcHJvcHMuY29sZFN0YXJ0RGF0YVRhYmxlTmFtZSxcbiAgICAgICAgLy8gQWRkIG90aGVyIG5lY2Vzc2FyeSBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaGVyZSAoZS5nLiwgTE9HX0xFVkVMKVxuICAgICAgfSxcbiAgICAgIGJ1bmRsaW5nOiB7XG4gICAgICAgIG1pbmlmeTogZmFsc2UsXG4gICAgICAgIHNvdXJjZU1hcDogdHJ1ZSxcbiAgICAgICAgZXh0ZXJuYWxNb2R1bGVzOiBbJ0Bhd3Mtc2RrLyonXSwgLy8gRXhjbHVkZSBBV1MgU0RLIHYzIG1vZHVsZXMgZnJvbSBidW5kbGUsIHVzZSBMYW1iZGEncyBwcm92aWRlZCBTREtcbiAgICAgIH0sXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCB0aGUgTGFtYmRhIHBlcm1pc3Npb24gdG8gY29uc3VtZSBtZXNzYWdlcyBmcm9tIHRoZSBTUVMgcXVldWVcbiAgICAvLyBUaGlzIGFsc28gc2V0cyB1cCB0aGUgU1FTIHF1ZXVlIGFzIGFuIGV2ZW50IHNvdXJjZSBmb3IgdGhlIExhbWJkYVxuICAgIHRoaXMucHJvY2Vzc2luZ0xhbWJkYS5hZGRFdmVudFNvdXJjZShuZXcgU3FzRXZlbnRTb3VyY2UodGhpcy5pbmdlc3Rpb25RdWV1ZSwge1xuICAgICAgYmF0Y2hTaXplOiA1LCAvLyBOdW1iZXIgb2YgbWVzc2FnZXMgdG8gcHVsbCBpbiBvbmUgZ28uIE1heCAxMCBmb3Igc3RhbmRhcmQgcXVldWVzLlxuICAgICAgLy8gbWF4QmF0Y2hpbmdXaW5kb3c6IER1cmF0aW9uLm1pbnV0ZXMoMSksIC8vIE9wdGlvbmFsOiBNYXggdGltZSB0byBnYXRoZXIgbWVzc2FnZXMgYmVmb3JlIGludm9raW5nLlxuICAgICAgLy8gcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIFJlY29tbWVuZGVkIGZvciBtb3JlIGdyYW51bGFyIGVycm9yIGhhbmRsaW5nIHdpdGggU1FTXG4gICAgfSkpO1xuXG4gICAgLy8gR3JhbnQgdGhlIExhbWJkYSBwZXJtaXNzaW9uIHRvIHdyaXRlIHRvIHRoZSBDb2xkU3RhcnREYXRhIER5bmFtb0RCIHRhYmxlXG4gICAgdGhpcy5wcm9jZXNzaW5nTGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlB1dEl0ZW0nLCAnZHluYW1vZGI6VXBkYXRlSXRlbSddLCAvLyBBZGQgb3RoZXIgYWN0aW9ucyBpZiBuZWVkZWQgKGUuZy4sIEJhdGNoV3JpdGVJdGVtKVxuICAgICAgcmVzb3VyY2VzOiBbcHJvcHMuY29sZFN0YXJ0RGF0YVRhYmxlQXJuXSxcbiAgICB9KSk7XG5cbiAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiA0LiBDbG91ZEZvcm1hdGlvbiBvdXRwdXRzXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0luZ2VzdGlvblF1ZXVlVXJsT3V0cHV0JywgeyAvLyBNYWRlIG91dHB1dCBuYW1lcyBtb3JlIHVuaXF1ZVxuICAgICAgdmFsdWU6IHRoaXMuaW5nZXN0aW9uUXVldWUucXVldWVVcmwsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0luZ2VzdGlvblF1ZXVlQXJuT3V0cHV0Jywge1xuICAgICAgdmFsdWU6IHRoaXMuaW5nZXN0aW9uUXVldWUucXVldWVBcm4sXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RlYWRMZXR0ZXJRdWV1ZVVybE91dHB1dCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRlYWRMZXR0ZXJRdWV1ZS5xdWV1ZVVybCxcbiAgICB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGVhZExldHRlclF1ZXVlQXJuT3V0cHV0Jywge1xuICAgICAgdmFsdWU6IHRoaXMuZGVhZExldHRlclF1ZXVlLnF1ZXVlQXJuLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9jZXNzaW5nTGFtYmRhTmFtZU91dHB1dCcsIHtcbiAgICAgICAgdmFsdWU6IHRoaXMucHJvY2Vzc2luZ0xhbWJkYS5mdW5jdGlvbk5hbWUsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1Byb2Nlc3NpbmdMYW1iZGFBcm5PdXRwdXQnLCB7XG4gICAgICAgIHZhbHVlOiB0aGlzLnByb2Nlc3NpbmdMYW1iZGEuZnVuY3Rpb25Bcm4sXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==