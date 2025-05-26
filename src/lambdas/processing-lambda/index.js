"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Initialize DynamoDB Document Client
const client = new client_dynamodb_1.DynamoDBClient({});
const ddbDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
// Environment variable for the DynamoDB table name
const DYNAMODB_TABLE_NAME = process.env.COLD_START_DATA_TABLE_NAME;
// --- Pricing Constants (Illustrative - for x86 architecture, e.g., us-east-1) ---
// IMPORTANT: These are example prices. Check current AWS Lambda pricing for your region.
const COST_PER_REQUEST = 0.0000002; // $0.20 per 1 million requests
const COST_PER_GB_SECOND = 0.0000166667; // For x86. Arm is cheaper.
const CURRENCY = 'USD';
// --- End Pricing Constants ---
// Helper function to extract a numeric value for a given metric from log data
function extractMetric(logData, metricName) {
    // Example: "Metric Name: 123.45 ms" or "Metric Name: 128 MB"
    const regex = new RegExp(`${metricName}: ([\\d.]+)`);
    const match = logData.match(regex);
    if (match && match[1]) {
        return parseFloat(match[1]);
    }
    return null;
}
const handler = async (event) => {
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
            const logData = messageBody.logData; // Simulated raw log line
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
            let calculatedCost = null;
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
            }
            else {
                console.warn('Could not calculate cost due to missing Billed Duration or Memory Size.');
            }
            const itemToStore = {
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
            const putCommand = new lib_dynamodb_1.PutCommand({
                TableName: DYNAMODB_TABLE_NAME,
                Item: itemToStore,
            });
            await ddbDocClient.send(putCommand);
            console.log(`Successfully stored item for tenantId ${tenantId} and function ${functionName} to DynamoDB.`);
        }
        catch (error) {
            console.error('Error processing SQS record:', error);
            console.error('Problematic record body for error:', record.body);
            throw error; // Re-throw error to enable SQS redrive to DLQ
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRzNFLHNDQUFzQztBQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXpELG1EQUFtRDtBQUNuRCxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUM7QUFFbkUsbUZBQW1GO0FBQ25GLHlGQUF5RjtBQUN6RixNQUFNLGdCQUFnQixHQUFHLFNBQVMsQ0FBQyxDQUFDLCtCQUErQjtBQUNuRSxNQUFNLGtCQUFrQixHQUFHLFlBQVksQ0FBQyxDQUFDLDJCQUEyQjtBQUNwRSxNQUFNLFFBQVEsR0FBRyxLQUFLLENBQUM7QUFDdkIsZ0NBQWdDO0FBRWhDLDhFQUE4RTtBQUM5RSxTQUFTLGFBQWEsQ0FBQyxPQUFlLEVBQUUsVUFBa0I7SUFDeEQsNkRBQTZEO0lBQzdELE1BQU0sS0FBSyxHQUFHLElBQUksTUFBTSxDQUFDLEdBQUcsVUFBVSxhQUFhLENBQUMsQ0FBQztJQUNyRCxNQUFNLEtBQUssR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0lBQ25DLElBQUksS0FBSyxJQUFJLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO1FBQ3RCLE9BQU8sVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBQzlCLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNkLENBQUM7QUFFTSxNQUFNLE9BQU8sR0FBZSxLQUFLLEVBQUUsS0FBZSxFQUFFLEVBQUU7SUFDM0QsSUFBSSxDQUFDLG1CQUFtQixFQUFFLENBQUM7UUFDekIsT0FBTyxDQUFDLEtBQUssQ0FBQyww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RUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxFQUFFLGtDQUFrQztnQkFDM0gsUUFBUSxFQUFFLGNBQWMsS0FBSyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSTtnQkFDbkQsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3RDLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRyxJQUFJLHlCQUFVLENBQUM7Z0JBQ2hDLFNBQVMsRUFBRSxtQkFBbUI7Z0JBQzlCLElBQUksRUFBRSxXQUFXO2FBQ2xCLENBQUMsQ0FBQztZQUVILE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxRQUFRLGlCQUFpQixZQUFZLGVBQWUsQ0FBQyxDQUFDO1FBRTdHLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRCxPQUFPLENBQUMsS0FBSyxDQUFDLG9DQUFvQyxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUNqRSxNQUFNLEtBQUssQ0FBQyxDQUFDLDhDQUE4QztRQUM3RCxDQUFDO0lBQ0gsQ0FBQztBQUNILENBQUMsQ0FBQztBQTdFVyxRQUFBLE9BQU8sV0E2RWxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgUHV0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBTUVNFdmVudCwgU1FTSGFuZGxlciB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuXG4vLyBJbml0aWFsaXplIER5bmFtb0RCIERvY3VtZW50IENsaWVudFxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRkYkRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG4vLyBFbnZpcm9ubWVudCB2YXJpYWJsZSBmb3IgdGhlIER5bmFtb0RCIHRhYmxlIG5hbWVcbmNvbnN0IERZTkFNT0RCX1RBQkxFX05BTUUgPSBwcm9jZXNzLmVudi5DT0xEX1NUQVJUX0RBVEFfVEFCTEVfTkFNRTtcblxuLy8gLS0tIFByaWNpbmcgQ29uc3RhbnRzIChJbGx1c3RyYXRpdmUgLSBmb3IgeDg2IGFyY2hpdGVjdHVyZSwgZS5nLiwgdXMtZWFzdC0xKSAtLS1cbi8vIElNUE9SVEFOVDogVGhlc2UgYXJlIGV4YW1wbGUgcHJpY2VzLiBDaGVjayBjdXJyZW50IEFXUyBMYW1iZGEgcHJpY2luZyBmb3IgeW91ciByZWdpb24uXG5jb25zdCBDT1NUX1BFUl9SRVFVRVNUID0gMC4wMDAwMDAyOyAvLyAkMC4yMCBwZXIgMSBtaWxsaW9uIHJlcXVlc3RzXG5jb25zdCBDT1NUX1BFUl9HQl9TRUNPTkQgPSAwLjAwMDAxNjY2Njc7IC8vIEZvciB4ODYuIEFybSBpcyBjaGVhcGVyLlxuY29uc3QgQ1VSUkVOQ1kgPSAnVVNEJztcbi8vIC0tLSBFbmQgUHJpY2luZyBDb25zdGFudHMgLS0tXG5cbi8vIEhlbHBlciBmdW5jdGlvbiB0byBleHRyYWN0IGEgbnVtZXJpYyB2YWx1ZSBmb3IgYSBnaXZlbiBtZXRyaWMgZnJvbSBsb2cgZGF0YVxuZnVuY3Rpb24gZXh0cmFjdE1ldHJpYyhsb2dEYXRhOiBzdHJpbmcsIG1ldHJpY05hbWU6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICAvLyBFeGFtcGxlOiBcIk1ldHJpYyBOYW1lOiAxMjMuNDUgbXNcIiBvciBcIk1ldHJpYyBOYW1lOiAxMjggTUJcIlxuICBjb25zdCByZWdleCA9IG5ldyBSZWdFeHAoYCR7bWV0cmljTmFtZX06IChbXFxcXGQuXSspYCk7XG4gIGNvbnN0IG1hdGNoID0gbG9nRGF0YS5tYXRjaChyZWdleCk7XG4gIGlmIChtYXRjaCAmJiBtYXRjaFsxXSkge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KG1hdGNoWzFdKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXI6IFNRU0hhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IFNRU0V2ZW50KSA9PiB7XG4gIGlmICghRFlOQU1PREJfVEFCTEVfTkFNRSkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0NPTERfU1RBUlRfREFUQV9UQUJMRV9OQU1FIGVudmlyb25tZW50IHZhcmlhYmxlIG5vdCBzZXQuJyk7XG4gICAgLy8gQ29uc2lkZXIgdGhyb3dpbmcgYW4gZXJyb3IgdG8gcmV0cnkgb3Igc2VuZCB0byBETFEgaWYgY3JpdGljYWxcbiAgICByZXR1cm47XG4gIH1cbiAgY29uc29sZS5sb2coYFJlY2VpdmVkIFNRUyBldmVudCB3aXRoICR7ZXZlbnQuUmVjb3Jkcy5sZW5ndGh9IHJlY29yZHMuYCk7XG5cbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xuICAgIHRyeSB7XG4gICAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBTUVMgcmVjb3JkOicsIHJlY29yZC5tZXNzYWdlSWQpO1xuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSBKU09OLnBhcnNlKHJlY29yZC5ib2R5KTtcbiAgICAgIGNvbnNvbGUubG9nKCdNZXNzYWdlIGJvZHk6JywgbWVzc2FnZUJvZHkpO1xuXG4gICAgICBjb25zdCB0ZW5hbnRJZCA9IG1lc3NhZ2VCb2R5LnRlbmFudElkO1xuICAgICAgY29uc3QgbG9nRGF0YSA9IG1lc3NhZ2VCb2R5LmxvZ0RhdGEgYXMgc3RyaW5nOyAvLyBTaW11bGF0ZWQgcmF3IGxvZyBsaW5lXG4gICAgICBjb25zdCBmdW5jdGlvbk5hbWUgPSBtZXNzYWdlQm9keS5mdW5jdGlvbk5hbWUgfHwgJ3Vua25vd24tZnVuY3Rpb24nO1xuICAgICAgY29uc3QgdGltZXN0YW1wID0gbWVzc2FnZUJvZHkudGltZXN0YW1wIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAgICAgaWYgKCF0ZW5hbnRJZCB8fCAhbG9nRGF0YSkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdNaXNzaW5nIHRlbmFudElkIG9yIGxvZ0RhdGEgaW4gbWVzc2FnZSBib2R5OicsIG1lc3NhZ2VCb2R5KTtcbiAgICAgICAgY29udGludWU7IC8vIFNraXAgdGhpcyByZWNvcmRcbiAgICAgIH1cblxuICAgICAgLy8gRXh0cmFjdCBtZXRyaWNzIGZyb20gdGhlIHNpbXVsYXRlZCBsb2cgZGF0YVxuICAgICAgY29uc3QgaW5pdER1cmF0aW9uTXMgPSBleHRyYWN0TWV0cmljKGxvZ0RhdGEsICdJbml0IER1cmF0aW9uJyk7XG4gICAgICBjb25zdCBtZW1vcnlTaXplTWIgPSBleHRyYWN0TWV0cmljKGxvZ0RhdGEsICdNZW1vcnkgU2l6ZScpO1xuICAgICAgLy8gRm9yIGNvc3QgY2FsY3VsYXRpb24sIHdlIG5lZWQgdGhlIEJpbGxlZCBEdXJhdGlvbiBvZiB0aGUgaW52b2NhdGlvblxuICAgICAgLy8gTGV0J3MgYXNzdW1lIG91ciBzaW11bGF0ZWQgbG9nIHdpbGwgY29udGFpbiB0aGlzLlxuICAgICAgY29uc3QgYmlsbGVkRHVyYXRpb25NcyA9IGV4dHJhY3RNZXRyaWMobG9nRGF0YSwgJ0JpbGxlZCBEdXJhdGlvbicpO1xuXG4gICAgICBjb25zb2xlLmxvZyhgRXh0cmFjdGVkOiB0ZW5hbnRJZD0ke3RlbmFudElkfSwgaW5pdER1cmF0aW9uTXM9JHtpbml0RHVyYXRpb25Nc30sIG1lbW9yeVNpemVNYj0ke21lbW9yeVNpemVNYn0sIGJpbGxlZER1cmF0aW9uTXM9JHtiaWxsZWREdXJhdGlvbk1zfSwgZnVuY3Rpb25OYW1lPSR7ZnVuY3Rpb25OYW1lfWApO1xuXG4gICAgICBsZXQgY2FsY3VsYXRlZENvc3Q6IG51bWJlciB8IG51bGwgPSBudWxsO1xuICAgICAgaWYgKGJpbGxlZER1cmF0aW9uTXMgIT09IG51bGwgJiYgbWVtb3J5U2l6ZU1iICE9PSBudWxsKSB7XG4gICAgICAgIGNvbnN0IGJpbGxlZER1cmF0aW9uU2Vjb25kcyA9IGJpbGxlZER1cmF0aW9uTXMgLyAxMDAwLjA7XG4gICAgICAgIGNvbnN0IG1lbW9yeVNpemVHYiA9IG1lbW9yeVNpemVNYiAvIDEwMjQuMDtcblxuICAgICAgICAvLyBEdXJhdGlvbiBjb3N0IGNhbGN1bGF0aW9uXG4gICAgICAgIGNvbnN0IGR1cmF0aW9uQ29zdCA9IGJpbGxlZER1cmF0aW9uU2Vjb25kcyAqIG1lbW9yeVNpemVHYiAqIENPU1RfUEVSX0dCX1NFQ09ORDtcbiAgICAgICAgXG4gICAgICAgIC8vIFRvdGFsIGNvc3QgZm9yIHRoaXMgaW52b2NhdGlvblxuICAgICAgICBjYWxjdWxhdGVkQ29zdCA9IENPU1RfUEVSX1JFUVVFU1QgKyBkdXJhdGlvbkNvc3Q7XG4gICAgICAgIFxuICAgICAgICAvLyBBV1Mgcm91bmRzIGR1cmF0aW9uIHVwIHRvIHRoZSBuZWFyZXN0IDFtcywgYnV0IG91ciBjYWxjdWxhdGlvbiBpcyBvbiByZXBvcnRlZCBiaWxsZWQgbXMuXG4gICAgICAgIC8vIEZvciB1bHRyYS1wcmVjaXNpb24sIHlvdSBtaWdodCBuZWVkIG1vcmUgZGlyZWN0IGJpbGxpbmcgZGF0YSwgYnV0IHRoaXMgaXMgYSBnb29kIGVzdGltYXRlLlxuICAgICAgICBjb25zb2xlLmxvZyhgQ2FsY3VsYXRlZCBjb3N0IGZvciBpbnZvY2F0aW9uOiBSZXF1ZXN0Q29zdD0ke0NPU1RfUEVSX1JFUVVFU1R9LCBEdXJhdGlvbkNvc3Q9JHtkdXJhdGlvbkNvc3R9LCBUb3RhbENvc3Q9JHtjYWxjdWxhdGVkQ29zdH1gKTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIGNvbnNvbGUud2FybignQ291bGQgbm90IGNhbGN1bGF0ZSBjb3N0IGR1ZSB0byBtaXNzaW5nIEJpbGxlZCBEdXJhdGlvbiBvciBNZW1vcnkgU2l6ZS4nKTtcbiAgICAgIH1cblxuICAgICAgY29uc3QgaXRlbVRvU3RvcmU6IGFueSA9IHsgLy8gVXNpbmcgJ2FueScgZm9yIGZsZXhpYmlsaXR5LCBkZWZpbmUgYW4gaW50ZXJmYWNlIGZvciBwcm9kdWN0aW9uXG4gICAgICAgIHRlbmFudElkOiB0ZW5hbnRJZCxcbiAgICAgICAgWyd0aW1lc3RhbXAjZnVuY3Rpb25OYW1lJ106IGAke3RpbWVzdGFtcH0jJHtmdW5jdGlvbk5hbWV9YCxcbiAgICAgICAgcmF3TG9nRGF0YTogbG9nRGF0YSxcbiAgICAgICAgaW5pdER1cmF0aW9uTXM6IGluaXREdXJhdGlvbk1zLFxuICAgICAgICBtZW1vcnlTaXplTWI6IG1lbW9yeVNpemVNYixcbiAgICAgICAgYmlsbGVkRHVyYXRpb25NczogYmlsbGVkRHVyYXRpb25NcywgLy8gU3RvcmluZyBmb3IgcmVmZXJlbmNlXG4gICAgICAgIGNhbGN1bGF0ZWRDb3N0OiBjYWxjdWxhdGVkQ29zdCAhPT0gbnVsbCA/IHBhcnNlRmxvYXQoY2FsY3VsYXRlZENvc3QudG9GaXhlZCgxMCkpIDogbnVsbCwgLy8gU3RvcmUgY29zdCB3aXRoIGZpeGVkIHByZWNpc2lvblxuICAgICAgICBjdXJyZW5jeTogY2FsY3VsYXRlZENvc3QgIT09IG51bGwgPyBDVVJSRU5DWSA6IG51bGwsXG4gICAgICAgIHByb2Nlc3NlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG4gICAgICB9O1xuXG4gICAgICBjb25zdCBwdXRDb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IERZTkFNT0RCX1RBQkxFX05BTUUsXG4gICAgICAgIEl0ZW06IGl0ZW1Ub1N0b3JlLFxuICAgICAgfSk7XG5cbiAgICAgIGF3YWl0IGRkYkRvY0NsaWVudC5zZW5kKHB1dENvbW1hbmQpO1xuICAgICAgY29uc29sZS5sb2coYFN1Y2Nlc3NmdWxseSBzdG9yZWQgaXRlbSBmb3IgdGVuYW50SWQgJHt0ZW5hbnRJZH0gYW5kIGZ1bmN0aW9uICR7ZnVuY3Rpb25OYW1lfSB0byBEeW5hbW9EQi5gKTtcblxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwcm9jZXNzaW5nIFNRUyByZWNvcmQ6JywgZXJyb3IpO1xuICAgICAgY29uc29sZS5lcnJvcignUHJvYmxlbWF0aWMgcmVjb3JkIGJvZHkgZm9yIGVycm9yOicsIHJlY29yZC5ib2R5KTtcbiAgICAgIHRocm93IGVycm9yOyAvLyBSZS10aHJvdyBlcnJvciB0byBlbmFibGUgU1FTIHJlZHJpdmUgdG8gRExRXG4gICAgfVxuICB9XG59O1xuIl19