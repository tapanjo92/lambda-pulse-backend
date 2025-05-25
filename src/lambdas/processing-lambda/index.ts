import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SQSEvent, SQSHandler } from 'aws-lambda';

// Initialize DynamoDB Document Client
const client = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(client);

// Environment variable for the DynamoDB table name (we'll set this in CDK)
const DYNAMODB_TABLE_NAME = process.env.COLD_START_DATA_TABLE_NAME;

// Simple function to extract Init Duration (very basic parsing)
function extractInitDuration(logData: string): number | null {
  const initDurationMatch = logData.match(/Init Duration: ([\d.]+) ms/);
  if (initDurationMatch && initDurationMatch[1]) {
    return parseFloat(initDurationMatch[1]);
  }
  return null;
}

// Simple function to extract Memory Size (very basic parsing)
function extractMemorySize(logData: string): number | null {
    const memorySizeMatch = logData.match(/Memory Size: (\d+) MB/);
    if (memorySizeMatch && memorySizeMatch[1]) {
      return parseInt(memorySizeMatch[1], 10);
    }
    return null;
}


export const handler: SQSHandler = async (event: SQSEvent) => {
  if (!DYNAMODB_TABLE_NAME) {
    console.error('COLD_START_DATA_TABLE_NAME environment variable not set.');
    return; // Or throw error
  }
  console.log(`Received SQS event with ${event.Records.length} records.`);

  for (const record of event.Records) {
    try {
      console.log('Processing SQS record:', record.messageId);
      const messageBody = JSON.parse(record.body);
      console.log('Message body:', messageBody);

      const tenantId = messageBody.tenantId;
      const logData = messageBody.logData; // This is our simulated raw log line
      const functionName = messageBody.functionName || 'unknown-function';
      const timestamp = messageBody.timestamp || new Date().toISOString(); // Or use record.attributes.SentTimestamp

      if (!tenantId || !logData) {
        console.error('Missing tenantId or logData in message body:', messageBody);
        continue; // Skip this record
      }

      const initDurationMs = extractInitDuration(logData);
      const memorySizeMb = extractMemorySize(logData);

      console.log(`Extracted: tenantId=${tenantId}, initDurationMs=${initDurationMs}, memorySizeMb=${memorySizeMb}, functionName=${functionName}`);

      const itemToStore = {
        tenantId: tenantId,
        ['timestamp#functionName']: `${timestamp}#${functionName}`, // Composite Sort Key
        rawLogData: logData, // Storing raw log for now
        initDurationMs: initDurationMs,
        memorySizeMb: memorySizeMb,
        // calculatedCost: will be added in Sprint 2
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
      console.error('Problematic record body:', record.body);
      // Message will be returned to queue if error is thrown, and eventually go to DLQ
      throw error; // Important for SQS redrive to DLQ
    }
  }
};
