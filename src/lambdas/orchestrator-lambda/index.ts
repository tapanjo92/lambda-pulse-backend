import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { ScheduledEvent } from 'aws-lambda'; // For EventBridge scheduled events

// Initialize AWS SDK Clients
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);
const sqsClient = new SQSClient({});

// Environment variables (we'll set these in CDK)
const TENANT_CONFIG_TABLE_NAME = process.env.TENANT_CONFIG_TABLE_NAME;
const INGESTION_SQS_QUEUE_URL = process.env.INGESTION_SQS_QUEUE_URL;

export const handler = async (event: ScheduledEvent): Promise<void> => {
  console.log('Orchestrator Lambda triggered by EventBridge:', JSON.stringify(event));

  if (!TENANT_CONFIG_TABLE_NAME || !INGESTION_SQS_QUEUE_URL) {
    console.error('Missing required environment variables: TENANT_CONFIG_TABLE_NAME or INGESTION_SQS_QUEUE_URL');
    return;
  }

  try {
    // 1. Scan the TenantConfigurationTable to get all tenants
    const scanCommand = new ScanCommand({
      TableName: TENANT_CONFIG_TABLE_NAME,
    });
    const scanResult = await ddbDocClient.send(scanCommand);
    const tenants = scanResult.Items || [];

    if (tenants.length === 0) {
      console.log('No tenants found in the configuration table.');
      return;
    }

    console.log(`Found ${tenants.length} tenants. Simulating data ingestion...`);

    for (const tenant of tenants) {
      const tenantId = tenant.tenantId;
      // In a real scenario, we'd use tenant.customerAccountId and tenant.crossAccountRoleArn here
      // to assume role and fetch actual CloudWatch Logs.

      // 2. Simulate finding a cold start log entry for this tenant
      const simulatedLogData = `SIMULATED: REPORT RequestId: sim-${Math.random().toString(36).substring(2, 15)} Init Duration: ${(Math.random() * 300 + 50).toFixed(2)} ms Duration: ${(Math.random() * 350 + 60).toFixed(2)} ms Billed Duration: ${Math.floor(Math.random() * 360 + 60)} ms Memory Size: ${[128, 256, 512][Math.floor(Math.random()*3)]} MB Max Memory Used: ${Math.floor(Math.random()*100 + 20)} MB`;
      const simulatedFunctionName = `simulated-function-${['alpha', 'beta', 'gamma'][Math.floor(Math.random()*3)]}`;
      const simulatedTimestamp = new Date().toISOString();

      const messagePayload = {
        tenantId: tenantId,
        logData: simulatedLogData,
        functionName: simulatedFunctionName,
        timestamp: simulatedTimestamp,
      };

      // 3. Send this simulated data to the SQS Ingestion Queue
      const sendMessageCommand = new SendMessageCommand({
        QueueUrl: INGESTION_SQS_QUEUE_URL,
        MessageBody: JSON.stringify(messagePayload),
        MessageAttributes: { // Optional: if you want to add message attributes
            'TenantID': { DataType: 'String', StringValue: tenantId }
        }
      });

      await sqsClient.send(sendMessageCommand);
      console.log(`Successfully sent simulated cold start data for tenant ${tenantId} to SQS queue.`);
    }

    console.log('Orchestrator Lambda finished processing all tenants.');

  } catch (error) {
    console.error('Error in Orchestrator Lambda:', error);
    // Depending on the error, you might want to throw it to indicate failure for monitoring
    // For a scheduled task, just logging might be sufficient if it can recover on next run
  }
};
