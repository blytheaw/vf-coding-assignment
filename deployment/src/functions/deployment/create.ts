import { FAILED, send, SUCCESS } from "cfn-response-promise";
import { CloudFormationCustomResourceCreateEvent, Context } from "aws-lambda";
import { CreateApiRequest } from "aws-sdk/clients/apigatewayv2";
import { CreateFunctionRequest } from "aws-sdk/clients/lambda";
import {
  CreateBucketRequest,
  PutBucketWebsiteRequest,
} from "aws-sdk/clients/s3";
import { CreateRoleRequest } from "aws-sdk/clients/iam";
import { promisify } from "util";

import {
  apigw,
  lambda,
  s3,
  iam,
  downloadFileToBuffer,
  downloadAndExtract,
  configureApiEndpoint,
  uploadSpaToS3,
} from "./common";

const sleep = promisify(setTimeout);

export async function createResource(
  createEvent: CloudFormationCustomResourceCreateEvent,
  context: Context
) {
  const resourceSuffix = createEvent.StackId.split("/")[2];
  const bucketName = `weather-app-${resourceSuffix}`;
  console.log("Stack ID: " + resourceSuffix);

  try {
    console.log("Creating Lambda Execution Role...");
    const lambdaTrustPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Effect: "Allow",
          Principal: {
            Service: "lambda.amazonaws.com",
          },
          Action: "sts:AssumeRole",
        },
      ],
    };
    const createRoleRequest: CreateRoleRequest = {
      AssumeRolePolicyDocument: JSON.stringify(lambdaTrustPolicy),
      RoleName: `lambda-role-${resourceSuffix}`,
    };
    const createRoleResponse = await iam
      .createRole(createRoleRequest)
      .promise();

    // There appears to be some delay after role creation before a Lambda function can be created using the role.
    // THe sleep is not ideal, but solves the issue for now.
    // The waitFor() function in the aws-sdk also does not seem to solve it.
    console.log("Waiting for role to finish creating...");
    await sleep(10000);

    console.log("Attaching managed policy to Lambda execution role...");
    await iam
      .attachRolePolicy({
        RoleName: createRoleResponse.Role.RoleName,
        PolicyArn:
          "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
      })
      .promise();

    console.log("Downloading Lambda functiono code...");
    const functionCode = await downloadFileToBuffer(
      createEvent.ResourceProperties.APICodeUrl
    );

    console.log("Creating Lambda functioon...");
    const createFunctionRequest: CreateFunctionRequest = {
      Code: {
        ZipFile: functionCode,
      },
      Environment: {
        Variables: {
          OPENWEATHER_APIKEY: createEvent.ResourceProperties.OpenWeatherApiKey,
        },
      },
      FunctionName: `weather-function-${resourceSuffix}`,
      Handler: "src/functions/weather/handler.main",
      MemorySize: 256,
      Publish: true,
      Role: createRoleResponse.Role.Arn,
      Runtime: "nodejs12.x",
    };

    const createFunctionResponse = await lambda
      .createFunction(createFunctionRequest)
      .promise();

    console.log("Creating API Gateway...");
    const createApiRequest: CreateApiRequest = {
      Name: `weather-api-${resourceSuffix}`,
      ProtocolType: "HTTP",
      CorsConfiguration: {
        AllowOrigins: ["*"],
      },
      Target: createFunctionResponse.FunctionArn,
    };
    const createApiResponse = await apigw.createApi(createApiRequest).promise();

    console.log("Granting permission for APIGW to invoke Lambda function...");
    await lambda
      .addPermission({
        SourceArn: `arn:aws:execute-api:${createEvent.ResourceProperties.Region}:${createEvent.ResourceProperties.AccountId}:${createApiResponse.ApiId}/*/*`,
        Principal: "apigateway.amazonaws.com",
        Action: "lambda:invokeFunction",
        FunctionName: createFunctionResponse.FunctionName,
        StatementId: "apigw",
      })
      .promise();

    console.log("Creating S3 Bucket...");
    const createBucketRequest: CreateBucketRequest = {
      Bucket: bucketName,
    };
    await s3.createBucket(createBucketRequest).promise();

    console.log("Configuring S3 static website configuration...");
    const putBucketWebsiteRequest: PutBucketWebsiteRequest = {
      Bucket: bucketName,
      WebsiteConfiguration: {
        IndexDocument: {
          Suffix: "index.html",
        },
        ErrorDocument: {
          Key: "index.html",
        },
      },
    };
    await s3.putBucketWebsite(putBucketWebsiteRequest).promise();

    console.log("Adding bucket policy...");
    const bucketPolicy = {
      Version: "2012-10-17",
      Statement: [
        {
          Sid: "PublicReadGetObject",
          Effect: "Allow",
          Principal: "*",
          Action: "s3:GetObject",
          Resource: `arn:aws:s3:::${bucketName}/*`,
        },
      ],
    };
    await s3
      .putBucketPolicy({
        Policy: JSON.stringify(bucketPolicy),
        Bucket: bucketName,
      })
      .promise();

    const outputDir = await downloadAndExtract(
      createEvent.ResourceProperties.SPACodeUrl
    );

    await configureApiEndpoint(
      `${outputDir}/assets/appConfig.json`,
      createApiResponse.ApiEndpoint
    );

    await uploadSpaToS3(outputDir, bucketName);

    const websiteUrl = `http://${bucketName}.s3-website-${createEvent.ResourceProperties.Region}.amazonaws.com`;
    await send(
      createEvent,
      context,
      SUCCESS,
      { s3WebsiteUrl: websiteUrl },
      resourceSuffix
    );
  } catch (e) {
    console.log(e.message);
    await send(createEvent, context, FAILED, null, resourceSuffix);
  }
}
