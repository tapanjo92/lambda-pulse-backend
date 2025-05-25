"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
// Initialize DynamoDB Document Client
const client = new client_dynamodb_1.DynamoDBClient({});
const ddbDocClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
// Environment variable for the DynamoDB table name (we'll set this in CDK)
const DYNAMODB_TABLE_NAME = process.env.COLD_START_DATA_TABLE_NAME;
// Simple function to extract Init Duration (very basic parsing)
function extractInitDuration(logData) {
    const initDurationMatch = logData.match(/Init Duration: ([\d.]+) ms/);
    if (initDurationMatch && initDurationMatch[1]) {
        return parseFloat(initDurationMatch[1]);
    }
    return null;
}
// Simple function to extract Memory Size (very basic parsing)
function extractMemorySize(logData) {
    const memorySizeMatch = logData.match(/Memory Size: (\d+) MB/);
    if (memorySizeMatch && memorySizeMatch[1]) {
        return parseInt(memorySizeMatch[1], 10);
    }
    return null;
}
const handler = async (event) => {
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
            const putCommand = new lib_dynamodb_1.PutCommand({
                TableName: DYNAMODB_TABLE_NAME,
                Item: itemToStore,
            });
            await ddbDocClient.send(putCommand);
            console.log(`Successfully stored item for tenantId ${tenantId} and function ${functionName} to DynamoDB.`);
        }
        catch (error) {
            console.error('Error processing SQS record:', error);
            console.error('Problematic record body:', record.body);
            // Message will be returned to queue if error is thrown, and eventually go to DLQ
            throw error; // Important for SQS redrive to DLQ
        }
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRzNFLHNDQUFzQztBQUN0QyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxZQUFZLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRXpELDJFQUEyRTtBQUMzRSxNQUFNLG1CQUFtQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsMEJBQTBCLENBQUM7QUFFbkUsZ0VBQWdFO0FBQ2hFLFNBQVMsbUJBQW1CLENBQUMsT0FBZTtJQUMxQyxNQUFNLGlCQUFpQixHQUFHLE9BQU8sQ0FBQyxLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQztJQUN0RSxJQUFJLGlCQUFpQixJQUFJLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDOUMsT0FBTyxVQUFVLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUMxQyxDQUFDO0lBQ0QsT0FBTyxJQUFJLENBQUM7QUFDZCxDQUFDO0FBRUQsOERBQThEO0FBQzlELFNBQVMsaUJBQWlCLENBQUMsT0FBZTtJQUN0QyxNQUFNLGVBQWUsR0FBRyxPQUFPLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDLENBQUM7SUFDL0QsSUFBSSxlQUFlLElBQUksZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDMUMsT0FBTyxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFDRCxPQUFPLElBQUksQ0FBQztBQUNoQixDQUFDO0FBR00sTUFBTSxPQUFPLEdBQWUsS0FBSyxFQUFFLEtBQWUsRUFBRSxFQUFFO0lBQzNELElBQUksQ0FBQyxtQkFBbUIsRUFBRSxDQUFDO1FBQ3pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsMERBQTBELENBQUMsQ0FBQztRQUMxRSxPQUFPLENBQUMsaUJBQWlCO0lBQzNCLENBQUM7SUFDRCxPQUFPLENBQUMsR0FBRyxDQUFDLDJCQUEyQixLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sV0FBVyxDQUFDLENBQUM7SUFFeEUsS0FBSyxNQUFNLE1BQU0sSUFBSSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUM7UUFDbkMsSUFBSSxDQUFDO1lBQ0gsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsRUFBRSxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUM7WUFDeEQsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUM7WUFDNUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxlQUFlLEVBQUUsV0FBVyxDQUFDLENBQUM7WUFFMUMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQVEsQ0FBQztZQUN0QyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMscUNBQXFDO1lBQzFFLE1BQU0sWUFBWSxHQUFHLFdBQVcsQ0FBQyxZQUFZLElBQUksa0JBQWtCLENBQUM7WUFDcEUsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsSUFBSSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLENBQUMseUNBQXlDO1lBRTlHLElBQUksQ0FBQyxRQUFRLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztnQkFDMUIsT0FBTyxDQUFDLEtBQUssQ0FBQyw4Q0FBOEMsRUFBRSxXQUFXLENBQUMsQ0FBQztnQkFDM0UsU0FBUyxDQUFDLG1CQUFtQjtZQUMvQixDQUFDO1lBRUQsTUFBTSxjQUFjLEdBQUcsbUJBQW1CLENBQUMsT0FBTyxDQUFDLENBQUM7WUFDcEQsTUFBTSxZQUFZLEdBQUcsaUJBQWlCLENBQUMsT0FBTyxDQUFDLENBQUM7WUFFaEQsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsUUFBUSxvQkFBb0IsY0FBYyxrQkFBa0IsWUFBWSxrQkFBa0IsWUFBWSxFQUFFLENBQUMsQ0FBQztZQUU3SSxNQUFNLFdBQVcsR0FBRztnQkFDbEIsUUFBUSxFQUFFLFFBQVE7Z0JBQ2xCLENBQUMsd0JBQXdCLENBQUMsRUFBRSxHQUFHLFNBQVMsSUFBSSxZQUFZLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ2pGLFVBQVUsRUFBRSxPQUFPLEVBQUUsMEJBQTBCO2dCQUMvQyxjQUFjLEVBQUUsY0FBYztnQkFDOUIsWUFBWSxFQUFFLFlBQVk7Z0JBQzFCLDRDQUE0QztnQkFDNUMsV0FBVyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2FBQ3RDLENBQUM7WUFFRixNQUFNLFVBQVUsR0FBRyxJQUFJLHlCQUFVLENBQUM7Z0JBQ2hDLFNBQVMsRUFBRSxtQkFBbUI7Z0JBQzlCLElBQUksRUFBRSxXQUFXO2FBQ2xCLENBQUMsQ0FBQztZQUVILE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztZQUNwQyxPQUFPLENBQUMsR0FBRyxDQUFDLHlDQUF5QyxRQUFRLGlCQUFpQixZQUFZLGVBQWUsQ0FBQyxDQUFDO1FBRTdHLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyw4QkFBOEIsRUFBRSxLQUFLLENBQUMsQ0FBQztZQUNyRCxPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2RCxpRkFBaUY7WUFDakYsTUFBTSxLQUFLLENBQUMsQ0FBQyxtQ0FBbUM7UUFDbEQsQ0FBQztJQUNILENBQUM7QUFDSCxDQUFDLENBQUM7QUFyRFcsUUFBQSxPQUFPLFdBcURsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgU1FTRXZlbnQsIFNRU0hhbmRsZXIgfSBmcm9tICdhd3MtbGFtYmRhJztcblxuLy8gSW5pdGlhbGl6ZSBEeW5hbW9EQiBEb2N1bWVudCBDbGllbnRcbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkZGJEb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcblxuLy8gRW52aXJvbm1lbnQgdmFyaWFibGUgZm9yIHRoZSBEeW5hbW9EQiB0YWJsZSBuYW1lICh3ZSdsbCBzZXQgdGhpcyBpbiBDREspXG5jb25zdCBEWU5BTU9EQl9UQUJMRV9OQU1FID0gcHJvY2Vzcy5lbnYuQ09MRF9TVEFSVF9EQVRBX1RBQkxFX05BTUU7XG5cbi8vIFNpbXBsZSBmdW5jdGlvbiB0byBleHRyYWN0IEluaXQgRHVyYXRpb24gKHZlcnkgYmFzaWMgcGFyc2luZylcbmZ1bmN0aW9uIGV4dHJhY3RJbml0RHVyYXRpb24obG9nRGF0YTogc3RyaW5nKTogbnVtYmVyIHwgbnVsbCB7XG4gIGNvbnN0IGluaXREdXJhdGlvbk1hdGNoID0gbG9nRGF0YS5tYXRjaCgvSW5pdCBEdXJhdGlvbjogKFtcXGQuXSspIG1zLyk7XG4gIGlmIChpbml0RHVyYXRpb25NYXRjaCAmJiBpbml0RHVyYXRpb25NYXRjaFsxXSkge1xuICAgIHJldHVybiBwYXJzZUZsb2F0KGluaXREdXJhdGlvbk1hdGNoWzFdKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuLy8gU2ltcGxlIGZ1bmN0aW9uIHRvIGV4dHJhY3QgTWVtb3J5IFNpemUgKHZlcnkgYmFzaWMgcGFyc2luZylcbmZ1bmN0aW9uIGV4dHJhY3RNZW1vcnlTaXplKGxvZ0RhdGE6IHN0cmluZyk6IG51bWJlciB8IG51bGwge1xuICAgIGNvbnN0IG1lbW9yeVNpemVNYXRjaCA9IGxvZ0RhdGEubWF0Y2goL01lbW9yeSBTaXplOiAoXFxkKykgTUIvKTtcbiAgICBpZiAobWVtb3J5U2l6ZU1hdGNoICYmIG1lbW9yeVNpemVNYXRjaFsxXSkge1xuICAgICAgcmV0dXJuIHBhcnNlSW50KG1lbW9yeVNpemVNYXRjaFsxXSwgMTApO1xuICAgIH1cbiAgICByZXR1cm4gbnVsbDtcbn1cblxuXG5leHBvcnQgY29uc3QgaGFuZGxlcjogU1FTSGFuZGxlciA9IGFzeW5jIChldmVudDogU1FTRXZlbnQpID0+IHtcbiAgaWYgKCFEWU5BTU9EQl9UQUJMRV9OQU1FKSB7XG4gICAgY29uc29sZS5lcnJvcignQ09MRF9TVEFSVF9EQVRBX1RBQkxFX05BTUUgZW52aXJvbm1lbnQgdmFyaWFibGUgbm90IHNldC4nKTtcbiAgICByZXR1cm47IC8vIE9yIHRocm93IGVycm9yXG4gIH1cbiAgY29uc29sZS5sb2coYFJlY2VpdmVkIFNRUyBldmVudCB3aXRoICR7ZXZlbnQuUmVjb3Jkcy5sZW5ndGh9IHJlY29yZHMuYCk7XG5cbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xuICAgIHRyeSB7XG4gICAgICBjb25zb2xlLmxvZygnUHJvY2Vzc2luZyBTUVMgcmVjb3JkOicsIHJlY29yZC5tZXNzYWdlSWQpO1xuICAgICAgY29uc3QgbWVzc2FnZUJvZHkgPSBKU09OLnBhcnNlKHJlY29yZC5ib2R5KTtcbiAgICAgIGNvbnNvbGUubG9nKCdNZXNzYWdlIGJvZHk6JywgbWVzc2FnZUJvZHkpO1xuXG4gICAgICBjb25zdCB0ZW5hbnRJZCA9IG1lc3NhZ2VCb2R5LnRlbmFudElkO1xuICAgICAgY29uc3QgbG9nRGF0YSA9IG1lc3NhZ2VCb2R5LmxvZ0RhdGE7IC8vIFRoaXMgaXMgb3VyIHNpbXVsYXRlZCByYXcgbG9nIGxpbmVcbiAgICAgIGNvbnN0IGZ1bmN0aW9uTmFtZSA9IG1lc3NhZ2VCb2R5LmZ1bmN0aW9uTmFtZSB8fCAndW5rbm93bi1mdW5jdGlvbic7XG4gICAgICBjb25zdCB0aW1lc3RhbXAgPSBtZXNzYWdlQm9keS50aW1lc3RhbXAgfHwgbmV3IERhdGUoKS50b0lTT1N0cmluZygpOyAvLyBPciB1c2UgcmVjb3JkLmF0dHJpYnV0ZXMuU2VudFRpbWVzdGFtcFxuXG4gICAgICBpZiAoIXRlbmFudElkIHx8ICFsb2dEYXRhKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ01pc3NpbmcgdGVuYW50SWQgb3IgbG9nRGF0YSBpbiBtZXNzYWdlIGJvZHk6JywgbWVzc2FnZUJvZHkpO1xuICAgICAgICBjb250aW51ZTsgLy8gU2tpcCB0aGlzIHJlY29yZFxuICAgICAgfVxuXG4gICAgICBjb25zdCBpbml0RHVyYXRpb25NcyA9IGV4dHJhY3RJbml0RHVyYXRpb24obG9nRGF0YSk7XG4gICAgICBjb25zdCBtZW1vcnlTaXplTWIgPSBleHRyYWN0TWVtb3J5U2l6ZShsb2dEYXRhKTtcblxuICAgICAgY29uc29sZS5sb2coYEV4dHJhY3RlZDogdGVuYW50SWQ9JHt0ZW5hbnRJZH0sIGluaXREdXJhdGlvbk1zPSR7aW5pdER1cmF0aW9uTXN9LCBtZW1vcnlTaXplTWI9JHttZW1vcnlTaXplTWJ9LCBmdW5jdGlvbk5hbWU9JHtmdW5jdGlvbk5hbWV9YCk7XG5cbiAgICAgIGNvbnN0IGl0ZW1Ub1N0b3JlID0ge1xuICAgICAgICB0ZW5hbnRJZDogdGVuYW50SWQsXG4gICAgICAgIFsndGltZXN0YW1wI2Z1bmN0aW9uTmFtZSddOiBgJHt0aW1lc3RhbXB9IyR7ZnVuY3Rpb25OYW1lfWAsIC8vIENvbXBvc2l0ZSBTb3J0IEtleVxuICAgICAgICByYXdMb2dEYXRhOiBsb2dEYXRhLCAvLyBTdG9yaW5nIHJhdyBsb2cgZm9yIG5vd1xuICAgICAgICBpbml0RHVyYXRpb25NczogaW5pdER1cmF0aW9uTXMsXG4gICAgICAgIG1lbW9yeVNpemVNYjogbWVtb3J5U2l6ZU1iLFxuICAgICAgICAvLyBjYWxjdWxhdGVkQ29zdDogd2lsbCBiZSBhZGRlZCBpbiBTcHJpbnQgMlxuICAgICAgICBwcm9jZXNzZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxuICAgICAgfTtcblxuICAgICAgY29uc3QgcHV0Q29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBEWU5BTU9EQl9UQUJMRV9OQU1FLFxuICAgICAgICBJdGVtOiBpdGVtVG9TdG9yZSxcbiAgICAgIH0pO1xuXG4gICAgICBhd2FpdCBkZGJEb2NDbGllbnQuc2VuZChwdXRDb21tYW5kKTtcbiAgICAgIGNvbnNvbGUubG9nKGBTdWNjZXNzZnVsbHkgc3RvcmVkIGl0ZW0gZm9yIHRlbmFudElkICR7dGVuYW50SWR9IGFuZCBmdW5jdGlvbiAke2Z1bmN0aW9uTmFtZX0gdG8gRHluYW1vREIuYCk7XG5cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgcHJvY2Vzc2luZyBTUVMgcmVjb3JkOicsIGVycm9yKTtcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1Byb2JsZW1hdGljIHJlY29yZCBib2R5OicsIHJlY29yZC5ib2R5KTtcbiAgICAgIC8vIE1lc3NhZ2Ugd2lsbCBiZSByZXR1cm5lZCB0byBxdWV1ZSBpZiBlcnJvciBpcyB0aHJvd24sIGFuZCBldmVudHVhbGx5IGdvIHRvIERMUVxuICAgICAgdGhyb3cgZXJyb3I7IC8vIEltcG9ydGFudCBmb3IgU1FTIHJlZHJpdmUgdG8gRExRXG4gICAgfVxuICB9XG59O1xuIl19