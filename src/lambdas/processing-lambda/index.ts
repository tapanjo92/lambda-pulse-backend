import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSEvent, SQSHandler } from 'aws-lambda';

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Environment variable for the DynamoDB table name
const DYNAMODB_TABLE_NAME = process.env.COLD_START_DATA_TABLE_NAME;

// --- Pricing Constants (Illustrative - for x86 architecture, e.g., us-east-1) ---
// IMPORTANT: These are example prices. Check current AWS Lambda pricing for your region.
const COST_PER_REQUEST = 0.0000002; // $0.20 per 1 million requests
const COST_PER_GB_SECOND = 0.0000166667; // For x86. Arm is cheaper.
const CURRENCY = 'USD';
// --- End Pricing Constants ---

// Helper function to extract a numeric value for a given metric from log data
function extractMetric(logData: string, metricName: string): number | null {
  // Example: "Metric Name: 123.45 ms" or "Metric Name: 128 MB"
  const regex = new RegExp(`${metricName}: ([\\d.]+)`);
  const match = logData.match(regex);
  if (match && match[1]) {
    return parseFloat(match[1]);
  }
  return null;
}

export const handler: SQSHandler = async (event: SQSEvent) => {
  if (!DYNAMODB_TABLE_NAME) {
    console.error('COLD_START_DATA_TABLE_NAME environment variable not set.');
    // Consider throwing an error to retry or send to DLQ if critical
    return;
  }
  console.log(`Received SQS event with ${event.Records.length} records.`);

  for (const record of event.Records) {
    try {
      console.log('Processing SQS record:', record.messageId);
      const messageBody = JSON.parse(record.body);
      console.log('Message body:', messageBody);

      const tenantId = messageBody.tenantId;
      const logData = messageBody.logData as string; // Simulated raw log line
      const functionName = messageBody.functionName || 'unknown-function';
      const timestamp = messageBody.timestamp || new Date().toISOString();

      if (!tenantId || !logData) {
        console.error('Missing tenantId or logData in message body:', messageBody);
        continue; // Skip this record
      }

      // Extract metrics from the simulated log data
      const initDurationMs = extractMetric(logData, 'Init Duration');
      const memorySizeMb = extractMetric(logData, 'Memory Size');
      // For cost calculation, we need the Billed Duration of the invocation
      // Let's assume our simulated log will contain this.
      const billedDurationMs = extractMetric(logData, 'Billed Duration');

      console.log(`Extracted: tenantId=${tenantId}, initDurationMs=${initDurationMs}, memorySizeMb=${memorySizeMb}, billedDurationMs=${billedDurationMs}, functionName=${functionName}`);

      let calculatedCost: number | null = null;
      if (billedDurationMs !== null && memorySizeMb !== null) {
        const billedDurationSeconds = billedDurationMs / 1000.0;
        const memorySizeGb = memorySizeMb / 1024.0;

        // Duration cost calculation
        const durationCost = billedDurationSeconds * memorySizeGb * COST_PER_GB_SECOND;
        
        // Total cost for this invocation
        calculatedCost = COST_PER_REQUEST + durationCost;
        
        // AWS rounds duration up to the nearest 1ms, but our calculation is on reported billed ms.
        // For ultra-precision, you might need more direct billing data, but this is a good estimate.
        console.log(`Calculated cost for invocation: RequestCost=${COST_PER_REQUEST}, DurationCost=${durationCost}, TotalCost=${calculatedCost}`);
      } else {
        console.warn('Could not calculate cost due to missing Billed Duration or Memory Size.');
      }

      const itemToStore: any = { // Using 'any' for flexibility, define an interface for production
        tenantId: tenantId,
        ['timestamp#functionName']: `${timestamp}#${functionName}`,
        rawLogData: logData,
        initDurationMs: initDurationMs,
        memorySizeMb: memorySizeMb,
        billedDurationMs: billedDurationMs, // Storing for reference
        calculatedCost: calculatedCost !== null ? parseFloat(calculatedCost.toFixed(10)) : null, // Store cost with fixed precision
        currency: calculatedCost !== null ? CURRENCY : null,
        processedAt: new Date().toISOString(),
      };

      const putCommand = new PutCommand({
        TableName: DYNAMODB_TABLE_NAME,
        Item: itemToStore,
      });

      await ddbDocClient.send(putCommand);
      console.log(`Successfully stored item for tenantId ${tenantId} and function ${functionName} to DynamoDB.`);

    } catch (error) {
      console.error('Error processing SQS record:', error);
      console.error('Problematic record body for error:', record.body);
      throw error; // Re-throw error to enable SQS redrive to DLQ
    }
  }
};
