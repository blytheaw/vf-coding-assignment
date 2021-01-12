import { CloudFormationCustomResourceDeleteEvent, Context } from "aws-lambda";
import { FAILED, send, SUCCESS } from "cfn-response-promise";
import { DeleteApiRequest } from "aws-sdk/clients/apigatewayv2";
import { DeleteFunctionRequest } from "aws-sdk/clients/lambda";
import { DeleteBucketRequest } from "aws-sdk/clients/s3";

import { apigw, lambda, s3, iam } from "./common";

export async function deleteResource(
  deleteEvent: CloudFormationCustomResourceDeleteEvent,
  context: Context
) {
  try {
    console.log("Looking up API ID...");
    const apis = (await apigw.getApis().promise()).Items;
    const api = apis.find(
      (api) => api.Name == `weather-api-${deleteEvent.PhysicalResourceId}`
    );

    if (api) {
      console.log("Deleting the API Gateway...");
      const deleteApiRequest: DeleteApiRequest = {
        ApiId: api.ApiId,
      };
      await apigw.deleteApi(deleteApiRequest).promise();
    } else {
      console.log("No API was found to delete");
    }

    const lambdaFunction = (
      await lambda.listFunctions().promise()
    ).Functions.find(
      (func) =>
        func.FunctionName ==
        `weather-function-${deleteEvent.PhysicalResourceId}`
    );

    if (lambdaFunction) {
      console.log("Deleting the Lambda function...");
      const deleteFunctionRequest: DeleteFunctionRequest = {
        FunctionName: lambdaFunction.FunctionName,
      };
      await lambda.deleteFunction(deleteFunctionRequest).promise();
    } else {
      console.log("No Lambda function to delete");
    }

    const bucket = (await s3.listBuckets().promise()).Buckets.find(
      (bucket) => bucket.Name == `weather-app-${deleteEvent.PhysicalResourceId}`
    );

    if (bucket) {
      console.log("Emptying the S3 Bucket...");
      await emptyS3Directory(bucket.Name);

      console.log("Deleting the S3 Bucket...");
      const deleteBucketRequest: DeleteBucketRequest = {
        Bucket: bucket.Name,
      };
      await s3.deleteBucket(deleteBucketRequest).promise();
    } else {
      console.log("No S3 Bucket to delete");
    }

    const role = (await iam.listRoles().promise()).Roles.find(
      (role) => role.RoleName == `lambda-role-${deleteEvent.PhysicalResourceId}`
    );

    if (role) {
      console.log("Detaching IAM policy...");
      await iam
        .detachRolePolicy({
          RoleName: role.RoleName,
          PolicyArn:
            "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
        })
        .promise();

      console.log("Deleting the IAM Role...");
      await iam
        .deleteRole({
          RoleName: role.RoleName,
        })
        .promise();
    } else {
      console.log("No IAM Role to delete");
    }

    await send(
      deleteEvent,
      context,
      SUCCESS,
      null,
      deleteEvent.PhysicalResourceId
    );
  } catch (e) {
    console.log(e.message);
    await send(
      deleteEvent,
      context,
      FAILED,
      null,
      deleteEvent.PhysicalResourceId
    );
  }
}

async function emptyS3Directory(bucket) {
  const listParams = {
    Bucket: bucket,
  };

  const listedObjects = await s3.listObjectsV2(listParams).promise();

  if (listedObjects.Contents.length === 0) {
    return;
  }

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await emptyS3Directory(bucket);
}
