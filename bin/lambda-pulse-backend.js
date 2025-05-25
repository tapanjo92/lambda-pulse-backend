#!/usr/bin/env node
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
require("source-map-support/register");
const cdk = __importStar(require("aws-cdk-lib"));
const lambda_pulse_backend_stack_1 = require("../lib/lambda-pulse-backend-stack");
const tenant_config_stack_1 = require("../lib/tenant-config-stack");
const cold_start_data_stack_1 = require("../lib/cold-start-data-stack");
const data_pipeline_stack_1 = require("../lib/data-pipeline-stack");
const app = new cdk.App();
// Ensure your AWS Account ID and Region are correctly set here.
// Using environment variables is good, but ensure they are available in your EC2 execution environment.
// If not, you might need to hardcode them or use another method to retrieve them.
const region = process.env.CDK_DEFAULT_REGION || 'ap-south-1';
const account = process.env.CDK_DEFAULT_ACCOUNT || '809555764832'; // Make sure this is your correct AWS Account ID
if (!account || account === 'YOUR_ACCOUNT_ID_PLACEHOLDER' || account.length !== 12) {
    console.error("Error: AWS Account ID is not set correctly. Please update 'account' in bin/lambda-pulse-backend.ts");
    process.exit(1); // Exit if account ID is not valid
}
const defaultStackProps = {
    env: { account, region },
};
// This stack is currently empty but kept for potential future use or structure
new lambda_pulse_backend_stack_1.LambdaPulseBackendStack(app, 'LambdaPulseBackendStack', defaultStackProps);
// Instantiate TenantConfigStack
const tenantConfigStack = new tenant_config_stack_1.TenantConfigStack(app, 'LambdaPulseTenantConfigStack', defaultStackProps);
// Instantiate ColdStartDataStack
const coldStartDataStack = new cold_start_data_stack_1.ColdStartDataStack(app, 'LambdaPulseColdStartDataStack', defaultStackProps);
// Instantiate DataPipelineStack and pass all required props
new data_pipeline_stack_1.DataPipelineStack(app, 'LambdaPulseDataPipelineStack', {
    ...defaultStackProps, // Spread default props
    coldStartDataTableName: coldStartDataStack.coldStartDataTable.tableName,
    coldStartDataTableArn: coldStartDataStack.coldStartDataTable.tableArn,
    tenantConfigTableName: tenantConfigStack.tenantConfigTable.tableName, // <-- ADDED THIS
    tenantConfigTableArn: tenantConfigStack.tenantConfigTable.tableArn, // <-- ADDED THIS
});
cdk.Tags.of(app).add('Project', 'LambdaPulse');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXB1bHNlLWJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtcHVsc2UtYmFja2VuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsa0ZBQTRFO0FBQzVFLG9FQUErRDtBQUMvRCx3RUFBa0U7QUFDbEUsb0VBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBRTFCLGdFQUFnRTtBQUNoRSx3R0FBd0c7QUFDeEcsa0ZBQWtGO0FBQ2xGLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksWUFBWSxDQUFDO0FBQzlELE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksY0FBYyxDQUFDLENBQUMsZ0RBQWdEO0FBRW5ILElBQUksQ0FBQyxPQUFPLElBQUksT0FBTyxLQUFLLDZCQUE2QixJQUFJLE9BQU8sQ0FBQyxNQUFNLEtBQUssRUFBRSxFQUFFLENBQUM7SUFDakYsT0FBTyxDQUFDLEtBQUssQ0FBQyxvR0FBb0csQ0FBQyxDQUFDO0lBQ3BILE9BQU8sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxrQ0FBa0M7QUFDdkQsQ0FBQztBQUdELE1BQU0saUJBQWlCLEdBQUc7SUFDdEIsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtDQUMzQixDQUFDO0FBRUYsK0VBQStFO0FBQy9FLElBQUksb0RBQXVCLENBQUMsR0FBRyxFQUFFLHlCQUF5QixFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFFL0UsZ0NBQWdDO0FBQ2hDLE1BQU0saUJBQWlCLEdBQUcsSUFBSSx1Q0FBaUIsQ0FBQyxHQUFHLEVBQUUsOEJBQThCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUV4RyxpQ0FBaUM7QUFDakMsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLDBDQUFrQixDQUFDLEdBQUcsRUFBRSwrQkFBK0IsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBRTNHLDREQUE0RDtBQUM1RCxJQUFJLHVDQUFpQixDQUFDLEdBQUcsRUFBRSw4QkFBOEIsRUFBRTtJQUN6RCxHQUFHLGlCQUFpQixFQUFFLHVCQUF1QjtJQUM3QyxzQkFBc0IsRUFBRSxrQkFBa0IsQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTO0lBQ3ZFLHFCQUFxQixFQUFFLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLFFBQVE7SUFDckUscUJBQXFCLEVBQUUsaUJBQWlCLENBQUMsaUJBQWlCLENBQUMsU0FBUyxFQUFFLGlCQUFpQjtJQUN2RixvQkFBb0IsRUFBRSxpQkFBaUIsQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUksaUJBQWlCO0NBQ3hGLENBQUMsQ0FBQztBQUVILEdBQUcsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLEVBQUUsYUFBYSxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIjIS91c3IvYmluL2VudiBub2RlXG5pbXBvcnQgJ3NvdXJjZS1tYXAtc3VwcG9ydC9yZWdpc3Rlcic7XG5pbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgTGFtYmRhUHVsc2VCYWNrZW5kU3RhY2sgfSBmcm9tICcuLi9saWIvbGFtYmRhLXB1bHNlLWJhY2tlbmQtc3RhY2snO1xuaW1wb3J0IHsgVGVuYW50Q29uZmlnU3RhY2sgfSBmcm9tICcuLi9saWIvdGVuYW50LWNvbmZpZy1zdGFjayc7XG5pbXBvcnQgeyBDb2xkU3RhcnREYXRhU3RhY2sgfSBmcm9tICcuLi9saWIvY29sZC1zdGFydC1kYXRhLXN0YWNrJztcbmltcG9ydCB7IERhdGFQaXBlbGluZVN0YWNrIH0gZnJvbSAnLi4vbGliL2RhdGEtcGlwZWxpbmUtc3RhY2snO1xuXG5jb25zdCBhcHAgPSBuZXcgY2RrLkFwcCgpO1xuXG4vLyBFbnN1cmUgeW91ciBBV1MgQWNjb3VudCBJRCBhbmQgUmVnaW9uIGFyZSBjb3JyZWN0bHkgc2V0IGhlcmUuXG4vLyBVc2luZyBlbnZpcm9ubWVudCB2YXJpYWJsZXMgaXMgZ29vZCwgYnV0IGVuc3VyZSB0aGV5IGFyZSBhdmFpbGFibGUgaW4geW91ciBFQzIgZXhlY3V0aW9uIGVudmlyb25tZW50LlxuLy8gSWYgbm90LCB5b3UgbWlnaHQgbmVlZCB0byBoYXJkY29kZSB0aGVtIG9yIHVzZSBhbm90aGVyIG1ldGhvZCB0byByZXRyaWV2ZSB0aGVtLlxuY29uc3QgcmVnaW9uID0gcHJvY2Vzcy5lbnYuQ0RLX0RFRkFVTFRfUkVHSU9OIHx8ICdhcC1zb3V0aC0xJztcbmNvbnN0IGFjY291bnQgPSBwcm9jZXNzLmVudi5DREtfREVGQVVMVF9BQ0NPVU5UIHx8ICc4MDk1NTU3NjQ4MzInOyAvLyBNYWtlIHN1cmUgdGhpcyBpcyB5b3VyIGNvcnJlY3QgQVdTIEFjY291bnQgSURcblxuaWYgKCFhY2NvdW50IHx8IGFjY291bnQgPT09ICdZT1VSX0FDQ09VTlRfSURfUExBQ0VIT0xERVInIHx8IGFjY291bnQubGVuZ3RoICE9PSAxMikge1xuICAgIGNvbnNvbGUuZXJyb3IoXCJFcnJvcjogQVdTIEFjY291bnQgSUQgaXMgbm90IHNldCBjb3JyZWN0bHkuIFBsZWFzZSB1cGRhdGUgJ2FjY291bnQnIGluIGJpbi9sYW1iZGEtcHVsc2UtYmFja2VuZC50c1wiKTtcbiAgICBwcm9jZXNzLmV4aXQoMSk7IC8vIEV4aXQgaWYgYWNjb3VudCBJRCBpcyBub3QgdmFsaWRcbn1cblxuXG5jb25zdCBkZWZhdWx0U3RhY2tQcm9wcyA9IHtcbiAgICBlbnY6IHsgYWNjb3VudCwgcmVnaW9uIH0sXG59O1xuXG4vLyBUaGlzIHN0YWNrIGlzIGN1cnJlbnRseSBlbXB0eSBidXQga2VwdCBmb3IgcG90ZW50aWFsIGZ1dHVyZSB1c2Ugb3Igc3RydWN0dXJlXG5uZXcgTGFtYmRhUHVsc2VCYWNrZW5kU3RhY2soYXBwLCAnTGFtYmRhUHVsc2VCYWNrZW5kU3RhY2snLCBkZWZhdWx0U3RhY2tQcm9wcyk7XG5cbi8vIEluc3RhbnRpYXRlIFRlbmFudENvbmZpZ1N0YWNrXG5jb25zdCB0ZW5hbnRDb25maWdTdGFjayA9IG5ldyBUZW5hbnRDb25maWdTdGFjayhhcHAsICdMYW1iZGFQdWxzZVRlbmFudENvbmZpZ1N0YWNrJywgZGVmYXVsdFN0YWNrUHJvcHMpO1xuXG4vLyBJbnN0YW50aWF0ZSBDb2xkU3RhcnREYXRhU3RhY2tcbmNvbnN0IGNvbGRTdGFydERhdGFTdGFjayA9IG5ldyBDb2xkU3RhcnREYXRhU3RhY2soYXBwLCAnTGFtYmRhUHVsc2VDb2xkU3RhcnREYXRhU3RhY2snLCBkZWZhdWx0U3RhY2tQcm9wcyk7XG5cbi8vIEluc3RhbnRpYXRlIERhdGFQaXBlbGluZVN0YWNrIGFuZCBwYXNzIGFsbCByZXF1aXJlZCBwcm9wc1xubmV3IERhdGFQaXBlbGluZVN0YWNrKGFwcCwgJ0xhbWJkYVB1bHNlRGF0YVBpcGVsaW5lU3RhY2snLCB7XG4gIC4uLmRlZmF1bHRTdGFja1Byb3BzLCAvLyBTcHJlYWQgZGVmYXVsdCBwcm9wc1xuICBjb2xkU3RhcnREYXRhVGFibGVOYW1lOiBjb2xkU3RhcnREYXRhU3RhY2suY29sZFN0YXJ0RGF0YVRhYmxlLnRhYmxlTmFtZSxcbiAgY29sZFN0YXJ0RGF0YVRhYmxlQXJuOiBjb2xkU3RhcnREYXRhU3RhY2suY29sZFN0YXJ0RGF0YVRhYmxlLnRhYmxlQXJuLFxuICB0ZW5hbnRDb25maWdUYWJsZU5hbWU6IHRlbmFudENvbmZpZ1N0YWNrLnRlbmFudENvbmZpZ1RhYmxlLnRhYmxlTmFtZSwgLy8gPC0tIEFEREVEIFRISVNcbiAgdGVuYW50Q29uZmlnVGFibGVBcm46IHRlbmFudENvbmZpZ1N0YWNrLnRlbmFudENvbmZpZ1RhYmxlLnRhYmxlQXJuLCAgIC8vIDwtLSBBRERFRCBUSElTXG59KTtcblxuY2RrLlRhZ3Mub2YoYXBwKS5hZGQoJ1Byb2plY3QnLCAnTGFtYmRhUHVsc2UnKTtcblxuIl19