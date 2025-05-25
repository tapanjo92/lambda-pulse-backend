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
exports.TenantConfigStack = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
class TenantConfigStack extends cdk.Stack {
    tenantConfigTable;
    constructor(scope, id, props) {
        super(scope, id, props);
        this.tenantConfigTable = new dynamodb.Table(this, 'TenantConfigurationTable', {
            tableName: 'LambdaPulseTenantConfig', // Optional: set a specific physical name
            partitionKey: {
                name: 'tenantId',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST, // Good for starting, cost-effective for unpredictable workloads
            removalPolicy: cdk.RemovalPolicy.DESTROY, // IMPORTANT: This will delete the table if you destroy the stack. Good for dev, use RETAIN for prod.
        });
        // Output the table name for easy reference
        new cdk.CfnOutput(this, 'TenantConfigTableName', {
            value: this.tenantConfigTable.tableName,
        });
    }
}
exports.TenantConfigStack = TenantConfigStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVuYW50LWNvbmZpZy1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInRlbmFudC1jb25maWctc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBR3JELE1BQWEsaUJBQWtCLFNBQVEsR0FBRyxDQUFDLEtBQUs7SUFDOUIsaUJBQWlCLENBQWlCO0lBRWxELFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsSUFBSSxDQUFDLGlCQUFpQixHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsMEJBQTBCLEVBQUU7WUFDNUUsU0FBUyxFQUFFLHlCQUF5QixFQUFFLHlDQUF5QztZQUMvRSxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFVBQVU7Z0JBQ2hCLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU07YUFDcEM7WUFDRCxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsZ0VBQWdFO1lBQ25ILGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxxR0FBcUc7U0FDaEosQ0FBQyxDQUFDO1FBRUgsMkNBQTJDO1FBQzNDLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsdUJBQXVCLEVBQUU7WUFDL0MsS0FBSyxFQUFFLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTO1NBQ3hDLENBQUMsQ0FBQztJQUNMLENBQUM7Q0FDRjtBQXJCRCw4Q0FxQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgY2xhc3MgVGVuYW50Q29uZmlnU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBwdWJsaWMgcmVhZG9ubHkgdGVuYW50Q29uZmlnVGFibGU6IGR5bmFtb2RiLlRhYmxlO1xuXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIHRoaXMudGVuYW50Q29uZmlnVGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ1RlbmFudENvbmZpZ3VyYXRpb25UYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ0xhbWJkYVB1bHNlVGVuYW50Q29uZmlnJywgLy8gT3B0aW9uYWw6IHNldCBhIHNwZWNpZmljIHBoeXNpY2FsIG5hbWVcbiAgICAgIHBhcnRpdGlvbktleToge1xuICAgICAgICBuYW1lOiAndGVuYW50SWQnLFxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcbiAgICAgIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULCAvLyBHb29kIGZvciBzdGFydGluZywgY29zdC1lZmZlY3RpdmUgZm9yIHVucHJlZGljdGFibGUgd29ya2xvYWRzXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLCAvLyBJTVBPUlRBTlQ6IFRoaXMgd2lsbCBkZWxldGUgdGhlIHRhYmxlIGlmIHlvdSBkZXN0cm95IHRoZSBzdGFjay4gR29vZCBmb3IgZGV2LCB1c2UgUkVUQUlOIGZvciBwcm9kLlxuICAgIH0pO1xuXG4gICAgLy8gT3V0cHV0IHRoZSB0YWJsZSBuYW1lIGZvciBlYXN5IHJlZmVyZW5jZVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUZW5hbnRDb25maWdUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogdGhpcy50ZW5hbnRDb25maWdUYWJsZS50YWJsZU5hbWUsXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==