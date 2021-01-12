import { CloudFormationCustomResourceUpdateEvent, Context } from "aws-lambda";
import { FAILED, send, SUCCESS } from "cfn-response-promise";

import {
  apigw,
  lambda,
  downloadFileToBuffer,
  downloadAndExtract,
  configureApiEndpoint,
  uploadSpaToS3,
} from "./common";

export async function updateResource(
  updateEvent: CloudFormationCustomResourceUpdateEvent,
  context: Context
) {
  try {
    if (
      updateEvent.ResourceProperties.APICodeUrl !=
      updateEvent.OldResourceProperties.APICodeUrl
    ) {
      console.log("Updating Lambda function code...");
      const functionCode = await downloadFileToBuffer(
        updateEvent.ResourceProperties.APICodeUrl
      );

      await lambda
        .updateFunctionCode({
          FunctionName: `weather-function-${updateEvent.PhysicalResourceId}`,
          ZipFile: functionCode,
        })
        .promise();
    }

    if (
      updateEvent.ResourceProperties.OpenWeatherApiKey !=
      updateEvent.OldResourceProperties.OpenWeatherApiKey
    ) {
      console.log("Updating Lambda functioon environment variables...");
      await lambda
        .updateFunctionConfiguration({
          FunctionName: `weather-function-${updateEvent.PhysicalResourceId}`,
          Environment: {
            Variables: {
              OPENWEATHER_APIKEY:
                updateEvent.ResourceProperties.OpenWeatherApiKey,
            },
          },
        })
        .promise();
    }

    if (
      updateEvent.ResourceProperties.SPACodeUrl !=
      updateEvent.OldResourceProperties.SPACodeUrl
    ) {
      console.log("Updating SPA code in S3...");

      const outputDir = await downloadAndExtract(
        updateEvent.ResourceProperties.SPACodeUrl
      );

      console.log("Looking up API Endpoint...");
      const apis = (await apigw.getApis().promise()).Items;
      const apiEndpoint = apis.find(
        (api) => api.Name == `weather-api-${updateEvent.PhysicalResourceId}`
      ).ApiEndpoint;

      await configureApiEndpoint(
        `${outputDir}/assets/appConfig.json`,
        apiEndpoint
      );

      await uploadSpaToS3(
        outputDir,
        `weather-app-${updateEvent.PhysicalResourceId}`
      );

      const websiteUrl = `http://weather-app-${updateEvent.PhysicalResourceId}.s3-website-${updateEvent.ResourceProperties.Region}.amazonaws.com`;
      await send(
        updateEvent,
        context,
        SUCCESS,
        { s3WebsiteUrl: websiteUrl },
        updateEvent.PhysicalResourceId
      );
    }
  } catch (e) {
    console.log(e.message);
    send(updateEvent, context, FAILED);
  }
}
