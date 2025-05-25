import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { NodejsFunction } from 'aws-cdk-lib/aws-lambda-nodejs';
import * as events from 'aws-cdk-lib/aws-events';
import * as targets from 'aws-cdk-lib/aws-events-targets';
import * as path from 'path';
import * as dotenv from 'dotenv';

// .envファイルを読み込み
dotenv.config();

export class SwitchbotLightMonitorMainStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // 環境変数から値を取得（フォールバック値付き）
    const switchbotTokenValue = process.env.SWITCHBOT_TOKEN || 'PLACEHOLDER_TOKEN';
    const deviceIdValue = process.env.SWITCHBOT_DEVICE_ID || 'PLACEHOLDER_DEVICE_ID';
    const sheetIdValue = process.env.GOOGLE_SHEET_ID || 'PLACEHOLDER_SHEET_ID';
    const serviceAccountValue = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '{}';

    // Lambda関数（TypeScriptを自動ビルド）
    const fn = new NodejsFunction(this, 'SwitchbotLightMonitorLambda', {
      runtime: lambda.Runtime.NODEJS_18_X,
      entry: path.join(__dirname, '../src/lambda/handler.ts'),
      handler: 'handler',
      timeout: cdk.Duration.seconds(30),
      environment: {
        REGION: cdk.Stack.of(this).region,
        SWITCHBOT_TOKEN: switchbotTokenValue,
        SWITCHBOT_DEVICE_ID: deviceIdValue,
        GOOGLE_SHEET_ID: sheetIdValue,
        GOOGLE_SERVICE_ACCOUNT_JSON: serviceAccountValue,
      },
      bundling: {
        forceDockerBundling: false,
        nodeModules: [
          'googleapis',
          'axios',
        ],
      },
    });

    // EventBridge スケジュールルール（15分ごと）
    new events.Rule(this, 'SwitchbotLightMonitorSchedule', {
      schedule: events.Schedule.cron({
        minute: '0/15',  // 0, 15, 30, 45分
        hour: '*',
        day: '*',
        month: '*',
        year: '*'
      }),
      targets: [new targets.LambdaFunction(fn)],
    });
  }
}
