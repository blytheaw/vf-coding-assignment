Coding Assignment:

1. Create a simple API Gateway Lambda that returns today’s weather for Tulsa, OK using whatever weather service you choose.

2. Create a Single Page Application (SPA) that queries the API GW Lambda and displays the results.

3. Create a CloudFormation Custom Resource that will

- Deploy the API GW project

- Create an S3 bucket configured for static website hosting.

- CONFIGURE the SPA project to interact with the API GW. Deploy it to the S3 bucket.

- Return the S3 static website URL to CloudFormation as an output variable

Comments:
- The point of this exercise is to create a deployment process that is executable from CloudFormation. The API GW and SPA can be trivial.
- Focus on creating a robust CloudFormation Custom Resource that can deploy both project and wire them up correctly. Don’t forget to report errors back to CloudFormation. Make sure it handles creates/updates/deletes.
- SPA should be implemented in React or Angular
- The other resources can be implemented using AWS SAM, Serverless Framework, or CDK.
- Preferred language is TypeScript, but plain NodeJs and Python is also acceptable.
- Be creative. Show off. Make it interesting.