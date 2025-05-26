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
const aws_cdk_lib_1 = require("aws-cdk-lib"); // Renamed to CdkStackProps
const sqs = __importStar(require("aws-cdk-lib/aws-sqs"));
const lambda = __importStar(require("aws-cdk-lib/aws-lambda"));
const lambdaNodejs = __importStar(require("aws-cdk-lib/aws-lambda-nodejs"));
const iam = __importStar(require("aws-cdk-lib/aws-iam"));
const aws_lambda_event_sources_1 = require("aws-cdk-lib/aws-lambda-event-sources");
const events = __importStar(require("aws-cdk-lib/aws-events")); // For EventBridge
const eventTargets = __importStar(require("aws-cdk-lib/aws-events-targets")); // For EventBridge Lambda target
const path = __importStar(require("path"));
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
class DataPipelineStack extends cdk.Stack {
    ingestionQueue;
    deadLetterQueue;
    processingLambda;
    orchestratorLambda; // Added for Orchestrator
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
            runtime: lambda.Runtime.NODEJS_LATEST,
            entry: path.join(__dirname, '..', 'src', 'lambdas', 'processing-lambda', 'index.ts'), // Corrected path
            handler: 'handler',
            timeout: aws_cdk_lib_1.Duration.seconds(60),
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
        this.processingLambda.addEventSource(new aws_lambda_event_sources_1.SqsEventSource(this.ingestionQueue, {
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
        // ...
        /* ------------------------------------------------------------------------
         * 4. Orchestrator Lambda Function
         * --------------------------------------------------------------------- */
        this.orchestratorLambda = new lambdaNodejs.NodejsFunction(this, 'LambdaPulseOrchestratorFunction', {
            functionName: 'LambdaPulse-OrchestrateDataFetch', // Optional: define a specific name
            runtime: lambda.Runtime.NODEJS_LATEST,
            // Corrected entry path:
            entry: path.join(__dirname, '..', 'src', 'lambdas', 'orchestrator-lambda', 'index.ts'),
            handler: 'handler', // Ensure this handler exists in orchestrator-lambda/index.ts
            timeout: aws_cdk_lib_1.Duration.minutes(1),
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
        // ...
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
            schedule: events.Schedule.rate(aws_cdk_lib_1.Duration.minutes(15)), // Run every 15 minutes
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
        new cdk.CfnOutput(this, 'OrchestratorLambdaNameOutput', {
            value: this.orchestratorLambda.functionName,
        });
        new cdk.CfnOutput(this, 'OrchestratorLambdaArnOutput', {
            value: this.orchestratorLambda.functionArn,
        });
        new cdk.CfnOutput(this, 'OrchestratorScheduleRuleNameOutput', {
            value: scheduleRule.ruleName,
        });
    }
}
exports.DataPipelineStack = DataPipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGF0YS1waXBlbGluZS1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImRhdGEtcGlwZWxpbmUtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsNkNBQW9FLENBQUMsMkJBQTJCO0FBQ2hHLHlEQUEyQztBQUMzQywrREFBaUQ7QUFDakQsNEVBQThEO0FBQzlELHlEQUEyQztBQUMzQyxtRkFBc0U7QUFDdEUsK0RBQWlELENBQUMsa0JBQWtCO0FBQ3BFLDZFQUErRCxDQUFDLGdDQUFnQztBQUVoRywyQ0FBNkI7QUFVN0I7Ozs7Ozs7OztHQVNHO0FBQ0gsTUFBYSxpQkFBa0IsU0FBUSxHQUFHLENBQUMsS0FBSztJQUM5QixjQUFjLENBQVk7SUFDMUIsZUFBZSxDQUFZO0lBQzNCLGdCQUFnQixDQUE4QjtJQUM5QyxrQkFBa0IsQ0FBOEIsQ0FBQyx5QkFBeUI7SUFFMUYsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUE2QjtRQUNyRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4Qjs7bUZBRTJFO1FBQzNFLElBQUksQ0FBQyxlQUFlLEdBQUcsSUFBSSxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNwRSxTQUFTLEVBQUUseUJBQXlCO1lBQ3BDLGVBQWUsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7WUFDbEMsb0VBQW9FO1NBQ3JFLENBQUMsQ0FBQztRQUVIOzttRkFFMkU7UUFDM0UsSUFBSSxDQUFDLGNBQWMsR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLDJCQUEyQixFQUFFO1lBQ3JFLFNBQVMsRUFBRSwyQkFBMkI7WUFDdEMsaUJBQWlCLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEVBQUUsc0NBQXNDO1lBQ2hGLGVBQWUsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7WUFDakMsZUFBZSxFQUFFO2dCQUNmLGVBQWUsRUFBRSxDQUFDLEVBQUUsMENBQTBDO2dCQUM5RCxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWU7YUFDNUI7WUFDRCxvRUFBb0U7U0FDckUsQ0FBQyxDQUFDO1FBRUg7O21GQUUyRTtRQUMzRSxJQUFJLENBQUMsZ0JBQWdCLEdBQUcsSUFBSSxZQUFZLENBQUMsY0FBYyxDQUFDLElBQUksRUFBRSwrQkFBK0IsRUFBRTtZQUM3RixZQUFZLEVBQUUsK0JBQStCLEVBQUUsbUNBQW1DO1lBQ2xGLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLGFBQWE7WUFDckMsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLG1CQUFtQixFQUFFLFVBQVUsQ0FBQyxFQUFFLGlCQUFpQjtZQUN2RyxPQUFPLEVBQUUsU0FBUztZQUNsQixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO1lBQzdCLFVBQVUsRUFBRSxHQUFHO1lBQ2YsV0FBVyxFQUFFO2dCQUNYLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxzQkFBc0I7YUFDekQ7WUFDRCxRQUFRLEVBQUU7Z0JBQ1IsTUFBTSxFQUFFLEtBQUs7Z0JBQ2IsU0FBUyxFQUFFLElBQUk7Z0JBQ2YsZUFBZSxFQUFFLENBQUMsWUFBWSxDQUFDLEVBQUUsaUNBQWlDO2FBQ25FO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsaUZBQWlGO1FBQ2pGLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxjQUFjLENBQUMsSUFBSSx5Q0FBYyxDQUFDLElBQUksQ0FBQyxjQUFjLEVBQUU7WUFDM0UsU0FBUyxFQUFFLENBQUM7WUFDWiw0RUFBNEU7U0FDN0UsQ0FBQyxDQUFDLENBQUM7UUFFSiw4RUFBOEU7UUFDOUUsSUFBSSxDQUFDLGdCQUFnQixDQUFDLGVBQWUsQ0FBQyxJQUFJLEdBQUcsQ0FBQyxlQUFlLENBQUM7WUFDNUQsTUFBTSxFQUFFLEdBQUcsQ0FBQyxNQUFNLENBQUMsS0FBSztZQUN4QixPQUFPLEVBQUUsQ0FBQyxrQkFBa0IsRUFBRSxxQkFBcUIsQ0FBQztZQUNwRCxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUMscUJBQXFCLENBQUM7U0FDekMsQ0FBQyxDQUFDLENBQUM7UUFFSjs7bUZBRTJFO1FBQzNFLE1BQU07UUFDTjs7bUZBRTJFO1FBQzNFLElBQUksQ0FBQyxrQkFBa0IsR0FBRyxJQUFJLFlBQVksQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLGlDQUFpQyxFQUFFO1lBQ2pHLFlBQVksRUFBRSxrQ0FBa0MsRUFBRSxtQ0FBbUM7WUFDckYsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPLENBQUMsYUFBYTtZQUNyQyx3QkFBd0I7WUFDeEIsS0FBSyxFQUFFLElBQUksQ0FBQyxJQUFJLENBQUMsU0FBUyxFQUFFLElBQUksRUFBRSxLQUFLLEVBQUUsU0FBUyxFQUFFLHFCQUFxQixFQUFFLFVBQVUsQ0FBQztZQUN0RixPQUFPLEVBQUUsU0FBUyxFQUFFLDZEQUE2RDtZQUNqRixPQUFPLEVBQUUsc0JBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1lBQzVCLFVBQVUsRUFBRSxHQUFHO1lBQ2YsV0FBVyxFQUFFO2dCQUNYLHdCQUF3QixFQUFFLEtBQUssQ0FBQyxxQkFBcUI7Z0JBQ3JELHVCQUF1QixFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUTthQUN0RDtZQUNELFFBQVEsRUFBRTtnQkFDUixNQUFNLEVBQUUsS0FBSztnQkFDYixTQUFTLEVBQUUsSUFBSTtnQkFDZixlQUFlLEVBQUUsQ0FBQyxZQUFZLENBQUMsRUFBRSxpQ0FBaUM7YUFDbkU7U0FDRixDQUFDLENBQUM7UUFDUCxNQUFNO1FBRUYsc0VBQXNFO1FBQ3RFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxlQUFlLENBQUMsSUFBSSxHQUFHLENBQUMsZUFBZSxDQUFDO1lBQzlELE1BQU0sRUFBRSxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUs7WUFDeEIsT0FBTyxFQUFFLENBQUMsZUFBZSxFQUFFLGdCQUFnQixDQUFDLEVBQUUsOEJBQThCO1lBQzVFLFNBQVMsRUFBRSxDQUFDLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQztTQUN4QyxDQUFDLENBQUMsQ0FBQztRQUVKLG1GQUFtRjtRQUNuRixJQUFJLENBQUMsY0FBYyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBRS9ELHVEQUF1RDtRQUN2RCxNQUFNLFlBQVksR0FBRyxJQUFJLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ3JFLFFBQVEsRUFBRSxrQ0FBa0MsRUFBRSxtQ0FBbUM7WUFDakYsUUFBUSxFQUFFLE1BQU0sQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLHNCQUFRLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsdUJBQXVCO1lBQzdFLDREQUE0RDtTQUM3RCxDQUFDLENBQUM7UUFDSCxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksWUFBWSxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDO1FBR2pGOzttRkFFMkU7UUFDM0UsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSx5QkFBeUIsRUFBRTtZQUNqRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGNBQWMsQ0FBQyxRQUFRO1NBQ3BDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUseUJBQXlCLEVBQUU7WUFDakQsS0FBSyxFQUFFLElBQUksQ0FBQyxjQUFjLENBQUMsUUFBUTtTQUNwQyxDQUFDLENBQUM7UUFDSCxJQUFJLEdBQUcsQ0FBQyxTQUFTLENBQUMsSUFBSSxFQUFFLDBCQUEwQixFQUFFO1lBQ2xELEtBQUssRUFBRSxJQUFJLENBQUMsZUFBZSxDQUFDLFFBQVE7U0FDckMsQ0FBQyxDQUFDO1FBQ0gsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSwwQkFBMEIsRUFBRTtZQUNsRCxLQUFLLEVBQUUsSUFBSSxDQUFDLGVBQWUsQ0FBQyxRQUFRO1NBQ3JDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNEJBQTRCLEVBQUU7WUFDcEQsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZO1NBQzFDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsMkJBQTJCLEVBQUU7WUFDbkQsS0FBSyxFQUFFLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXO1NBQ3pDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsOEJBQThCLEVBQUU7WUFDcEQsS0FBSyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxZQUFZO1NBQzlDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsNkJBQTZCLEVBQUU7WUFDbkQsS0FBSyxFQUFFLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxXQUFXO1NBQzdDLENBQUMsQ0FBQztRQUNILElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsb0NBQW9DLEVBQUU7WUFDMUQsS0FBSyxFQUFFLFlBQVksQ0FBQyxRQUFRO1NBQy9CLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQTlJRCw4Q0E4SUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgRHVyYXRpb24sIFN0YWNrUHJvcHMgYXMgQ2RrU3RhY2tQcm9wcyB9IGZyb20gJ2F3cy1jZGstbGliJzsgLy8gUmVuYW1lZCB0byBDZGtTdGFja1Byb3BzXG5pbXBvcnQgKiBhcyBzcXMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXNxcyc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBsYW1iZGFOb2RlanMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYS1ub2RlanMnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0IHsgU3FzRXZlbnRTb3VyY2UgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtbGFtYmRhLWV2ZW50LXNvdXJjZXMnO1xuaW1wb3J0ICogYXMgZXZlbnRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1ldmVudHMnOyAvLyBGb3IgRXZlbnRCcmlkZ2VcbmltcG9ydCAqIGFzIGV2ZW50VGFyZ2V0cyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZXZlbnRzLXRhcmdldHMnOyAvLyBGb3IgRXZlbnRCcmlkZ2UgTGFtYmRhIHRhcmdldFxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5pbXBvcnQgKiBhcyBwYXRoIGZyb20gJ3BhdGgnO1xuXG4vLyBJbnRlcmZhY2UgZm9yIHByb3BzIGV4cGVjdGVkIGJ5IHRoaXMgc3RhY2tcbmV4cG9ydCBpbnRlcmZhY2UgRGF0YVBpcGVsaW5lU3RhY2tQcm9wcyBleHRlbmRzIENka1N0YWNrUHJvcHMge1xuICBjb2xkU3RhcnREYXRhVGFibGVOYW1lOiBzdHJpbmc7XG4gIGNvbGRTdGFydERhdGFUYWJsZUFybjogc3RyaW5nO1xuICB0ZW5hbnRDb25maWdUYWJsZU5hbWU6IHN0cmluZzsgIC8vIEFkZGVkIGZvciBPcmNoZXN0cmF0b3IgTGFtYmRhXG4gIHRlbmFudENvbmZpZ1RhYmxlQXJuOiBzdHJpbmc7ICAgLy8gQWRkZWQgZm9yIE9yY2hlc3RyYXRvciBMYW1iZGFcbn1cblxuLyoqXG4gKiBEZXBsb3lzOlxuICogLSBMYW1iZGFQdWxzZUluZ2VzdGlvbkRMUSAoc3RhbmRhcmQgcXVldWUpXG4gKiAtIExhbWJkYVB1bHNlSW5nZXN0aW9uUXVldWUgKHN0YW5kYXJkIHF1ZXVlLCB3aXJlZCB0byB0aGUgRExRKVxuICogLSBMYW1iZGFQdWxzZVByb2Nlc3NpbmdGdW5jdGlvbiAoTGFtYmRhIHRvIHByb2Nlc3MgU1FTIG1lc3NhZ2VzIGFuZCB3cml0ZSB0byBEeW5hbW9EQilcbiAqIC0gTGFtYmRhUHVsc2VPcmNoZXN0cmF0b3JGdW5jdGlvbiAoTGFtYmRhIHRvIHNpbXVsYXRlIGRhdGEgZmV0Y2hpbmcgYW5kIHNlbmQgdG8gU1FTKVxuICogLSBFdmVudEJyaWRnZSBydWxlIHRvIHNjaGVkdWxlIHRoZSBPcmNoZXN0cmF0b3IgTGFtYmRhXG4gKlxuICogT3V0cHV0cyBVUkxzLCBBUk5zLCBhbmQgbmFtZXMgZm9yIHJlbGV2YW50IHJlc291cmNlcy5cbiAqL1xuZXhwb3J0IGNsYXNzIERhdGFQaXBlbGluZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IGluZ2VzdGlvblF1ZXVlOiBzcXMuUXVldWU7XG4gIHB1YmxpYyByZWFkb25seSBkZWFkTGV0dGVyUXVldWU6IHNxcy5RdWV1ZTtcbiAgcHVibGljIHJlYWRvbmx5IHByb2Nlc3NpbmdMYW1iZGE6IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbjtcbiAgcHVibGljIHJlYWRvbmx5IG9yY2hlc3RyYXRvckxhbWJkYTogbGFtYmRhTm9kZWpzLk5vZGVqc0Z1bmN0aW9uOyAvLyBBZGRlZCBmb3IgT3JjaGVzdHJhdG9yXG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IERhdGFQaXBlbGluZVN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIDEuIERlYWQtbGV0dGVyIHF1ZXVlXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gICAgdGhpcy5kZWFkTGV0dGVyUXVldWUgPSBuZXcgc3FzLlF1ZXVlKHRoaXMsICdMYW1iZGFQdWxzZUluZ2VzdGlvbkRMUScsIHtcbiAgICAgIHF1ZXVlTmFtZTogJ0xhbWJkYVB1bHNlSW5nZXN0aW9uRExRJyxcbiAgICAgIHJldGVudGlvblBlcmlvZDogRHVyYXRpb24uZGF5cygxNCksXG4gICAgICAvLyBlbmNyeXB0aW9uOiBzcXMuUXVldWVFbmNyeXB0aW9uLktNU19NQU5BR0VELCAvLyB1bmNvbW1lbnQgaW4gcHJvZFxuICAgIH0pO1xuXG4gICAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogMi4gTWFpbiBpbmdlc3Rpb24gcXVldWVcbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgICB0aGlzLmluZ2VzdGlvblF1ZXVlID0gbmV3IHNxcy5RdWV1ZSh0aGlzLCAnTGFtYmRhUHVsc2VJbmdlc3Rpb25RdWV1ZScsIHtcbiAgICAgIHF1ZXVlTmFtZTogJ0xhbWJkYVB1bHNlSW5nZXN0aW9uUXVldWUnLFxuICAgICAgdmlzaWJpbGl0eVRpbWVvdXQ6IER1cmF0aW9uLnNlY29uZHMoMzAwKSwgLy8gbXVzdCBleGNlZWQgTGFtYmRhIHRpbWVvdXQgKyBidWZmZXJcbiAgICAgIHJldGVudGlvblBlcmlvZDogRHVyYXRpb24uZGF5cyg0KSxcbiAgICAgIGRlYWRMZXR0ZXJRdWV1ZToge1xuICAgICAgICBtYXhSZWNlaXZlQ291bnQ6IDMsIC8vIE51bWJlciBvZiByZXRyaWVzIGJlZm9yZSBzZW5kaW5nIHRvIERMUVxuICAgICAgICBxdWV1ZTogdGhpcy5kZWFkTGV0dGVyUXVldWUsXG4gICAgICB9LFxuICAgICAgLy8gZW5jcnlwdGlvbjogc3FzLlF1ZXVlRW5jcnlwdGlvbi5LTVNfTUFOQUdFRCwgLy8gdW5jb21tZW50IGluIHByb2RcbiAgICB9KTtcblxuICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIDMuIFByb2Nlc3NpbmcgTGFtYmRhIEZ1bmN0aW9uXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gICAgdGhpcy5wcm9jZXNzaW5nTGFtYmRhID0gbmV3IGxhbWJkYU5vZGVqcy5Ob2RlanNGdW5jdGlvbih0aGlzLCAnTGFtYmRhUHVsc2VQcm9jZXNzaW5nRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6ICdMYW1iZGFQdWxzZS1Qcm9jZXNzQ29sZFN0YXJ0cycsIC8vIE9wdGlvbmFsOiBkZWZpbmUgYSBzcGVjaWZpYyBuYW1lXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfTEFURVNULFxuICAgICAgZW50cnk6IHBhdGguam9pbihfX2Rpcm5hbWUsICcuLicsICdzcmMnLCAnbGFtYmRhcycsICdwcm9jZXNzaW5nLWxhbWJkYScsICdpbmRleC50cycpLCAvLyBDb3JyZWN0ZWQgcGF0aFxuICAgICAgaGFuZGxlcjogJ2hhbmRsZXInLFxuICAgICAgdGltZW91dDogRHVyYXRpb24uc2Vjb25kcyg2MCksXG4gICAgICBtZW1vcnlTaXplOiAyNTYsXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBDT0xEX1NUQVJUX0RBVEFfVEFCTEVfTkFNRTogcHJvcHMuY29sZFN0YXJ0RGF0YVRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBtaW5pZnk6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sIC8vIEV4Y2x1ZGUgQVdTIFNESyB2MyBmcm9tIGJ1bmRsZVxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIEdyYW50IFByb2Nlc3NpbmcgTGFtYmRhIHBlcm1pc3Npb24gdG8gY29uc3VtZSBmcm9tIFNRUyBhbmQgc2V0IHVwIGV2ZW50IHNvdXJjZVxuICAgIHRoaXMucHJvY2Vzc2luZ0xhbWJkYS5hZGRFdmVudFNvdXJjZShuZXcgU3FzRXZlbnRTb3VyY2UodGhpcy5pbmdlc3Rpb25RdWV1ZSwge1xuICAgICAgYmF0Y2hTaXplOiA1LFxuICAgICAgLy8gcmVwb3J0QmF0Y2hJdGVtRmFpbHVyZXM6IHRydWUsIC8vIFJlY29tbWVuZGVkIGZvciBncmFudWxhciBlcnJvciBoYW5kbGluZ1xuICAgIH0pKTtcblxuICAgIC8vIEdyYW50IFByb2Nlc3NpbmcgTGFtYmRhIHBlcm1pc3Npb24gdG8gd3JpdGUgdG8gQ29sZFN0YXJ0RGF0YSBEeW5hbW9EQiB0YWJsZVxuICAgIHRoaXMucHJvY2Vzc2luZ0xhbWJkYS5hZGRUb1JvbGVQb2xpY3kobmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkFMTE9XLFxuICAgICAgYWN0aW9uczogWydkeW5hbW9kYjpQdXRJdGVtJywgJ2R5bmFtb2RiOlVwZGF0ZUl0ZW0nXSxcbiAgICAgIHJlc291cmNlczogW3Byb3BzLmNvbGRTdGFydERhdGFUYWJsZUFybl0sXG4gICAgfSkpO1xuXG4gICAgLyogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tXG4gICAgICogNC4gT3JjaGVzdHJhdG9yIExhbWJkYSBGdW5jdGlvblxuICAgICAqIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLSAqL1xuICAgIC8vIC4uLlxuICAgIC8qIC0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLVxuICAgICAqIDQuIE9yY2hlc3RyYXRvciBMYW1iZGEgRnVuY3Rpb25cbiAgICAgKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0gKi9cbiAgICB0aGlzLm9yY2hlc3RyYXRvckxhbWJkYSA9IG5ldyBsYW1iZGFOb2RlanMuTm9kZWpzRnVuY3Rpb24odGhpcywgJ0xhbWJkYVB1bHNlT3JjaGVzdHJhdG9yRnVuY3Rpb24nLCB7XG4gICAgICBmdW5jdGlvbk5hbWU6ICdMYW1iZGFQdWxzZS1PcmNoZXN0cmF0ZURhdGFGZXRjaCcsIC8vIE9wdGlvbmFsOiBkZWZpbmUgYSBzcGVjaWZpYyBuYW1lXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfTEFURVNULFxuICAgICAgLy8gQ29ycmVjdGVkIGVudHJ5IHBhdGg6XG4gICAgICBlbnRyeTogcGF0aC5qb2luKF9fZGlybmFtZSwgJy4uJywgJ3NyYycsICdsYW1iZGFzJywgJ29yY2hlc3RyYXRvci1sYW1iZGEnLCAnaW5kZXgudHMnKSxcbiAgICAgIGhhbmRsZXI6ICdoYW5kbGVyJywgLy8gRW5zdXJlIHRoaXMgaGFuZGxlciBleGlzdHMgaW4gb3JjaGVzdHJhdG9yLWxhbWJkYS9pbmRleC50c1xuICAgICAgdGltZW91dDogRHVyYXRpb24ubWludXRlcygxKSxcbiAgICAgIG1lbW9yeVNpemU6IDI1NixcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIFRFTkFOVF9DT05GSUdfVEFCTEVfTkFNRTogcHJvcHMudGVuYW50Q29uZmlnVGFibGVOYW1lLFxuICAgICAgICBJTkdFU1RJT05fU1FTX1FVRVVFX1VSTDogdGhpcy5pbmdlc3Rpb25RdWV1ZS5xdWV1ZVVybCxcbiAgICAgIH0sXG4gICAgICBidW5kbGluZzoge1xuICAgICAgICBtaW5pZnk6IGZhbHNlLFxuICAgICAgICBzb3VyY2VNYXA6IHRydWUsXG4gICAgICAgIGV4dGVybmFsTW9kdWxlczogWydAYXdzLXNkay8qJ10sIC8vIEV4Y2x1ZGUgQVdTIFNESyB2MyBmcm9tIGJ1bmRsZVxuICAgICAgfSxcbiAgICB9KTtcbi8vIC4uLlxuXG4gICAgLy8gR3JhbnQgT3JjaGVzdHJhdG9yIExhbWJkYSBwZXJtaXNzaW9uIHRvIHJlYWQgZnJvbSBUZW5hbnRDb25maWdUYWJsZVxuICAgIHRoaXMub3JjaGVzdHJhdG9yTGFtYmRhLmFkZFRvUm9sZVBvbGljeShuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XG4gICAgICBlZmZlY3Q6IGlhbS5FZmZlY3QuQUxMT1csXG4gICAgICBhY3Rpb25zOiBbJ2R5bmFtb2RiOlNjYW4nLCAnZHluYW1vZGI6UXVlcnknXSwgLy8gUXVlcnkgbWlnaHQgYmUgdXNlZnVsIGxhdGVyXG4gICAgICByZXNvdXJjZXM6IFtwcm9wcy50ZW5hbnRDb25maWdUYWJsZUFybl0sXG4gICAgfSkpO1xuXG4gICAgLy8gR3JhbnQgT3JjaGVzdHJhdG9yIExhbWJkYSBwZXJtaXNzaW9uIHRvIHNlbmQgbWVzc2FnZXMgdG8gdGhlIEluZ2VzdGlvbiBTUVMgcXVldWVcbiAgICB0aGlzLmluZ2VzdGlvblF1ZXVlLmdyYW50U2VuZE1lc3NhZ2VzKHRoaXMub3JjaGVzdHJhdG9yTGFtYmRhKTtcblxuICAgIC8vIFNjaGVkdWxlIHRoZSBPcmNoZXN0cmF0b3IgTGFtYmRhIHRvIHJ1biBwZXJpb2RpY2FsbHlcbiAgICBjb25zdCBzY2hlZHVsZVJ1bGUgPSBuZXcgZXZlbnRzLlJ1bGUodGhpcywgJ09yY2hlc3RyYXRvclNjaGVkdWxlUnVsZScsIHtcbiAgICAgIHJ1bGVOYW1lOiAnTGFtYmRhUHVsc2UtT3JjaGVzdHJhdG9yU2NoZWR1bGUnLCAvLyBPcHRpb25hbDogZGVmaW5lIGEgc3BlY2lmaWMgbmFtZVxuICAgICAgc2NoZWR1bGU6IGV2ZW50cy5TY2hlZHVsZS5yYXRlKER1cmF0aW9uLm1pbnV0ZXMoMTUpKSwgLy8gUnVuIGV2ZXJ5IDE1IG1pbnV0ZXNcbiAgICAgIC8vIEZvciB0ZXN0aW5nLCB5b3UgbWlnaHQgdXNlIER1cmF0aW9uLm1pbnV0ZXMoMikgb3Igc2ltaWxhclxuICAgIH0pO1xuICAgIHNjaGVkdWxlUnVsZS5hZGRUYXJnZXQobmV3IGV2ZW50VGFyZ2V0cy5MYW1iZGFGdW5jdGlvbih0aGlzLm9yY2hlc3RyYXRvckxhbWJkYSkpO1xuXG5cbiAgICAvKiAtLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS1cbiAgICAgKiA1LiBDbG91ZEZvcm1hdGlvbiBvdXRwdXRzXG4gICAgICogLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tLS0tICovXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0luZ2VzdGlvblF1ZXVlVXJsT3V0cHV0Jywge1xuICAgICAgdmFsdWU6IHRoaXMuaW5nZXN0aW9uUXVldWUucXVldWVVcmwsXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0luZ2VzdGlvblF1ZXVlQXJuT3V0cHV0Jywge1xuICAgICAgdmFsdWU6IHRoaXMuaW5nZXN0aW9uUXVldWUucXVldWVBcm4sXG4gICAgfSk7XG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ0RlYWRMZXR0ZXJRdWV1ZVVybE91dHB1dCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLmRlYWRMZXR0ZXJRdWV1ZS5xdWV1ZVVybCxcbiAgICB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnRGVhZExldHRlclF1ZXVlQXJuT3V0cHV0Jywge1xuICAgICAgdmFsdWU6IHRoaXMuZGVhZExldHRlclF1ZXVlLnF1ZXVlQXJuLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9jZXNzaW5nTGFtYmRhTmFtZU91dHB1dCcsIHtcbiAgICAgIHZhbHVlOiB0aGlzLnByb2Nlc3NpbmdMYW1iZGEuZnVuY3Rpb25OYW1lLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdQcm9jZXNzaW5nTGFtYmRhQXJuT3V0cHV0Jywge1xuICAgICAgdmFsdWU6IHRoaXMucHJvY2Vzc2luZ0xhbWJkYS5mdW5jdGlvbkFybixcbiAgICB9KTtcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnT3JjaGVzdHJhdG9yTGFtYmRhTmFtZU91dHB1dCcsIHsgLy8gQWRkZWQgZm9yIE9yY2hlc3RyYXRvclxuICAgICAgICB2YWx1ZTogdGhpcy5vcmNoZXN0cmF0b3JMYW1iZGEuZnVuY3Rpb25OYW1lLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdPcmNoZXN0cmF0b3JMYW1iZGFBcm5PdXRwdXQnLCB7IC8vIEFkZGVkIGZvciBPcmNoZXN0cmF0b3JcbiAgICAgICAgdmFsdWU6IHRoaXMub3JjaGVzdHJhdG9yTGFtYmRhLmZ1bmN0aW9uQXJuLFxuICAgIH0pO1xuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdPcmNoZXN0cmF0b3JTY2hlZHVsZVJ1bGVOYW1lT3V0cHV0JywgeyAvLyBBZGRlZCBmb3IgU2NoZWR1bGUgUnVsZVxuICAgICAgICB2YWx1ZTogc2NoZWR1bGVSdWxlLnJ1bGVOYW1lLFxuICAgIH0pO1xuICB9XG59XG4iXX0=