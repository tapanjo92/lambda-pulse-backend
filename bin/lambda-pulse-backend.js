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
const region = process.env.CDK_DEFAULT_REGION || 'ap-south-1'; // Define region, or use your specific one
const account = process.env.CDK_DEFAULT_ACCOUNT || '809555764832'; // Define account, or use your specific one
const defaultStackProps = {
    env: { account, region },
};
new lambda_pulse_backend_stack_1.LambdaPulseBackendStack(app, 'LambdaPulseBackendStack', defaultStackProps);
new tenant_config_stack_1.TenantConfigStack(app, 'LambdaPulseTenantConfigStack', defaultStackProps);
// Instantiate ColdStartDataStack
const coldStartDataStack = new cold_start_data_stack_1.ColdStartDataStack(app, 'LambdaPulseColdStartDataStack', defaultStackProps);
// Instantiate DataPipelineStack and pass the table details
new data_pipeline_stack_1.DataPipelineStack(app, 'LambdaPulseDataPipelineStack', {
    ...defaultStackProps, // Spread default props
    coldStartDataTableName: coldStartDataStack.coldStartDataTable.tableName,
    coldStartDataTableArn: coldStartDataStack.coldStartDataTable.tableArn,
});
cdk.Tags.of(app).add('Project', 'LambdaPulse');
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibGFtYmRhLXB1bHNlLWJhY2tlbmQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsYW1iZGEtcHVsc2UtYmFja2VuZC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUNBLHVDQUFxQztBQUNyQyxpREFBbUM7QUFDbkMsa0ZBQTRFO0FBQzVFLG9FQUErRDtBQUMvRCx3RUFBa0U7QUFDbEUsb0VBQStEO0FBRS9ELE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsRUFBRSxDQUFDO0FBQzFCLE1BQU0sTUFBTSxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0JBQWtCLElBQUksWUFBWSxDQUFDLENBQUMsMENBQTBDO0FBQ3pHLE1BQU0sT0FBTyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLElBQUksY0FBYyxDQUFDLENBQUMsMkNBQTJDO0FBRTlHLE1BQU0saUJBQWlCLEdBQUc7SUFDdEIsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtDQUMzQixDQUFDO0FBRUYsSUFBSSxvREFBdUIsQ0FBQyxHQUFHLEVBQUUseUJBQXlCLEVBQUUsaUJBQWlCLENBQUMsQ0FBQztBQUUvRSxJQUFJLHVDQUFpQixDQUFDLEdBQUcsRUFBRSw4QkFBOEIsRUFBRSxpQkFBaUIsQ0FBQyxDQUFDO0FBRTlFLGlDQUFpQztBQUNqQyxNQUFNLGtCQUFrQixHQUFHLElBQUksMENBQWtCLENBQUMsR0FBRyxFQUFFLCtCQUErQixFQUFFLGlCQUFpQixDQUFDLENBQUM7QUFFM0csMkRBQTJEO0FBQzNELElBQUksdUNBQWlCLENBQUMsR0FBRyxFQUFFLDhCQUE4QixFQUFFO0lBQ3pELEdBQUcsaUJBQWlCLEVBQUUsdUJBQXVCO0lBQzdDLHNCQUFzQixFQUFFLGtCQUFrQixDQUFDLGtCQUFrQixDQUFDLFNBQVM7SUFDdkUscUJBQXFCLEVBQUUsa0JBQWtCLENBQUMsa0JBQWtCLENBQUMsUUFBUTtDQUN0RSxDQUFDLENBQUM7QUFFSCxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxFQUFFLGFBQWEsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiIyEvdXNyL2Jpbi9lbnYgbm9kZVxuaW1wb3J0ICdzb3VyY2UtbWFwLXN1cHBvcnQvcmVnaXN0ZXInO1xuaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IExhbWJkYVB1bHNlQmFja2VuZFN0YWNrIH0gZnJvbSAnLi4vbGliL2xhbWJkYS1wdWxzZS1iYWNrZW5kLXN0YWNrJztcbmltcG9ydCB7IFRlbmFudENvbmZpZ1N0YWNrIH0gZnJvbSAnLi4vbGliL3RlbmFudC1jb25maWctc3RhY2snO1xuaW1wb3J0IHsgQ29sZFN0YXJ0RGF0YVN0YWNrIH0gZnJvbSAnLi4vbGliL2NvbGQtc3RhcnQtZGF0YS1zdGFjayc7XG5pbXBvcnQgeyBEYXRhUGlwZWxpbmVTdGFjayB9IGZyb20gJy4uL2xpYi9kYXRhLXBpcGVsaW5lLXN0YWNrJztcblxuY29uc3QgYXBwID0gbmV3IGNkay5BcHAoKTtcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX1JFR0lPTiB8fCAnYXAtc291dGgtMSc7IC8vIERlZmluZSByZWdpb24sIG9yIHVzZSB5b3VyIHNwZWNpZmljIG9uZVxuY29uc3QgYWNjb3VudCA9IHByb2Nlc3MuZW52LkNES19ERUZBVUxUX0FDQ09VTlQgfHwgJzgwOTU1NTc2NDgzMic7IC8vIERlZmluZSBhY2NvdW50LCBvciB1c2UgeW91ciBzcGVjaWZpYyBvbmVcblxuY29uc3QgZGVmYXVsdFN0YWNrUHJvcHMgPSB7XG4gICAgZW52OiB7IGFjY291bnQsIHJlZ2lvbiB9LFxufTtcblxubmV3IExhbWJkYVB1bHNlQmFja2VuZFN0YWNrKGFwcCwgJ0xhbWJkYVB1bHNlQmFja2VuZFN0YWNrJywgZGVmYXVsdFN0YWNrUHJvcHMpO1xuXG5uZXcgVGVuYW50Q29uZmlnU3RhY2soYXBwLCAnTGFtYmRhUHVsc2VUZW5hbnRDb25maWdTdGFjaycsIGRlZmF1bHRTdGFja1Byb3BzKTtcblxuLy8gSW5zdGFudGlhdGUgQ29sZFN0YXJ0RGF0YVN0YWNrXG5jb25zdCBjb2xkU3RhcnREYXRhU3RhY2sgPSBuZXcgQ29sZFN0YXJ0RGF0YVN0YWNrKGFwcCwgJ0xhbWJkYVB1bHNlQ29sZFN0YXJ0RGF0YVN0YWNrJywgZGVmYXVsdFN0YWNrUHJvcHMpO1xuXG4vLyBJbnN0YW50aWF0ZSBEYXRhUGlwZWxpbmVTdGFjayBhbmQgcGFzcyB0aGUgdGFibGUgZGV0YWlsc1xubmV3IERhdGFQaXBlbGluZVN0YWNrKGFwcCwgJ0xhbWJkYVB1bHNlRGF0YVBpcGVsaW5lU3RhY2snLCB7XG4gIC4uLmRlZmF1bHRTdGFja1Byb3BzLCAvLyBTcHJlYWQgZGVmYXVsdCBwcm9wc1xuICBjb2xkU3RhcnREYXRhVGFibGVOYW1lOiBjb2xkU3RhcnREYXRhU3RhY2suY29sZFN0YXJ0RGF0YVRhYmxlLnRhYmxlTmFtZSxcbiAgY29sZFN0YXJ0RGF0YVRhYmxlQXJuOiBjb2xkU3RhcnREYXRhU3RhY2suY29sZFN0YXJ0RGF0YVRhYmxlLnRhYmxlQXJuLFxufSk7XG5cbmNkay5UYWdzLm9mKGFwcCkuYWRkKCdQcm9qZWN0JywgJ0xhbWJkYVB1bHNlJyk7XG4iXX0=