# CloudFormation Custom Resource Deployment Process

This project is meant to demonstrate a multi-project deployment process using a CloudFront Custom Resource. The specific requirements are found in `INSTRUCTIONS.md` within this repo. The project is broken up into three primary components:

- `weather-api/` - Lambda Function to be used with API Gateway that returns weather for Tulsa, OK from the OpenWeatherMap API
- `weather-app/` - Simple Angular SPA that retrieves the weather data from the API and displays a subset of it on a page
- `deployment/` - The CloudFront Custom Resource that deploys both projects and wires them up. The bulk of the code is here.

In addition, there is a GitHub Actions workflow defined under `./github/workflows` that builds the code artifacts, creates a GitHub Release, and uploads the artifacts to the release. The deployment CloudFront resource downloads these artifacts for deployment.

## Setup

### Prerequisites:

- You will need an AWS account with sufficient IAM permissions to build the resources in this project. Deploying the CloudFront Custom Resource requires the following high level permissions:
  - Create CloudFront Stacks
  - Create IAM roles and pass them to Lambda functions
  - Create S3 Buckets and upload objects
  - Create and invoke Lambda Functionos
  - Create and view CloudWatch Logs
- You will need NodeJS installed. Everything in this project was built using Node 10. Other versions may work as well. You will need the following CLI tools installed as well for local development.
  - `npm install -g @angular/cli`
  - `npm install -g serverless`
- Lastly, you will need an API Key for OpenWeatherMap API. You can create a free account and generate a key here: https://home.openweathermap.org/users/sign_up

### Deploy the ClouodFront Custom Resource

1. Navigate to the `deployment/` directory in a terminal
2. Run `npm install` to download dependencies
3. Run `serverless deploy` to deploy the Custom Resource to your AWS Account
4. In CloudFormation, there should be a new stack deployed. Under Outputs, you can find the Lambda ARN for the custom resource. You will need this to use the custom resource.

## Usage

In order to use the custom resource, create a new stack that uses a custom resource, and use the Lambda ARN from the above step as the ServiceToken. This resource also requires a few properties. You can use `stack.yml` at the root of this repo as a template.

```
AWSTemplateFormatVersion: "2010-09-09"
Resources:
  MyCustomResource:
    Type: "Custom::WeatherAppDeployment"
    Properties:
      ServiceToken: LAMBDA_ARN
      Region: !Ref AWS::Region
      AccountId: !Ref AWS::AccountId
      APICodeUrl: https://github.com/blytheaw/vf-coding-assignment/releases/download/1/weather-api-function.zip
      SPACodeUrl: https://github.com/blytheaw/vf-coding-assignment/releases/download/1/weather-app.zip
      OpenWeatherApiKey: YOUR_OPENWEATHER_APIKEY
Outputs:
  S3WebsiteUrl:
    Description: S3 Static Website URL
    Value: !GetAtt MyCustomResource.s3WebsiteUrl
```

### Properties

The only values you should need to update are:

- ServiceToken: set this to the Lambda ARN of your custom resource function
- OpenWeatherApiKey: set this to the API you generated with OpenWeatherMap

The other properties can be left alone, but here is an explanation:

- Region: this configures the AWS SDK clients to create resources in this region. Leave as default to use the CloudFormation stack's region.
- AccountId: this is used to populate some ARN's in the custom resource that require the accountId. Again, it is passed through via CloudFormation.
- APICodeUrl/SPACodeUrl: these are URLs to download the code artifacts from GitHub.

### Outputs

This stack outputs one value:

S3WebsiteUrl: the S3 static website URL to view the running applicatioon

### Creating the Stack

After updating the values in `stack.yml`, go to CloudFormation and create a new stack using this template. The stack will only show one resource, but once it is successfully created, the outputs section should have the S3WebsiteUrl available. This will be a public website on S3 that you can view directly in a browser.

## Custom Resource Operations

### Create

Upon stack creation, the custom resource will create an API Gateway, a Lambda function with the Weather API code, an S3 bucket, and support IAM resources. It will update the configuration for the Angular SPA to point to the newly created API Gateway and then finally deploy the SPA to S3.

### Update

Currently the update only supports updating the API code, the SPA code, and the OpenWeatherMap API Key. When any of these properties are updated on an existing stack, the custom resource will deploy the new code and/or update the API Key, which is set as an environment variable on the Lambda function.

### Delete

When CloudFormation sends a delete request to the custom resource, it will attempt to delete any resources that still exist. It is idempotent, meaning if the stack gets in a weird state, it should always be able to delete whatever resources are left.

## Lessons Learned

1. CloudFront Custom Resources are very powerful, but they can also be tricky to test and debug due to how they work.
2. I learned a pretty clean way to do a sleep timer in NodeJS:
   ```
   const promisify = require('promisify');
   const sleep = promisify(setTimeout);
   await sleep(1000);
   ```
3. `cfn-response` and similar libraries are helpful when dealing with CloudFront Custom Resources, but in some cases lack flexibility to modify the responses send to CloudFront.
4. Loading Angular configuration at runtime when the app initializes.

## Enhancements

This project could be improved with the following:

1. Improved error handling/messaging when failures happen. This would require finding a different library for sending CloudFormation responses or doing it manually as the library I used didn't let you modify the failure reason.
2. Possibly looking at moving the deployment logic to other AWS services like AWS Step Functions or AWS CodePipeline. Doing everything in code inside of a Lambda function is probably more complicated than it needs to be to deploy a simple wep app and an API together.
3. Better local testing capabilities. Serverless Framework provides some local invocation capabilities, but it is hard to get realistic CloudFormation requests as they are very dynamic.
4. Some style on the front end.
5. More flexibility in what can be configured when using the custom resource.
