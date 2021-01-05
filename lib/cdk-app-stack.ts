import * as cdk from '@aws-cdk/core';
import s3 = require('@aws-cdk/aws-s3');
import iam = require('@aws-cdk/aws-iam');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import lambda = require('@aws-cdk/aws-lambda');
import event_sources = require('@aws-cdk/aws-lambda-event-sources');

export class CdkAppStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const bucket = new s3.Bucket(this, 'cdk-rekn-imagebucket');
    new cdk.CfnOutput(this, 'Bucket', { value: bucket.bucketName })

    // Dynamo table for image labels
    const table = new dynamodb.Table(this, 'ImageLabels', {
      partitionKey: { name: 'image', type: dynamodb.AttributeType.STRING }
    });
    new cdk.CfnOutput(this, 'Table', { value: table.tableName });

    // Role for lambda
    const role = new iam.Role(this, 'rekognitionRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com')
    });
    // Attach a policy to the lambda role to allow access to Rekognition and log
    role.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['rekognition:*', 'logs:CreateLogGroup', 'logs:CreateLogStream', 'logs:PutLogEvents'],
      resources: [ '*' ]
    }));
    // Lambda
    const rekFn = new lambda.Function(this, 'rekognitionFunction', {
      code: lambda.Code.fromAsset('lambda'),
      runtime: lambda.Runtime.PYTHON_3_7,
      handler: 'index.handler',
      role,
      environment: {
        TABLE: table.tableName,
        BUCKET: bucket.bucketName,
      },
    });
    rekFn.addEventSource(new event_sources.S3EventSource(bucket, { events: [ s3.EventType.OBJECT_CREATED ]}));
    bucket.grantRead(rekFn);
    table.grantFullAccess(rekFn);


  }
}
