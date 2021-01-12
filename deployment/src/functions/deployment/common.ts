import { ApiGatewayV2, Lambda, S3, IAM } from "aws-sdk";
import { PutObjectRequest } from "aws-sdk/clients/s3";
import got from "got";
import * as fs from "fs";
import { pipeline } from "stream";
import { promisify } from "util";
import * as extract from "extract-zip";
import * as globby from "globby";

export const streamPipeline = promisify(pipeline);

export const apigw = new ApiGatewayV2();
export const lambda = new Lambda();
export const s3 = new S3();
export const iam = new IAM();

export const configureClients = (region: string) => {
  apigw.config.region = region;
  lambda.config.region = region;
  s3.config.region = region;
};

export const downloadFileToBuffer = async (url: string) => {
  return await got(url).buffer();
};

export const downloadAndExtract = async (url: string) => {
  let dir = "/tmp/weather-app";

  console.log(`Downloading code from ${url}...`);
  await streamPipeline(got.stream(url), fs.createWriteStream(`${dir}.zip`));

  console.log("Extracing SPA code...");
  await extract(`${dir}.zip`, {
    dir: dir,
  });

  return dir;
};

export const configureApiEndpoint = async (path: string, endpoint: string) => {
  console.log("Configuring APIGW endpoint...");
  const appConfig = JSON.parse(fs.readFileSync(path).toString());
  appConfig.apiUrl = endpoint;
  fs.writeFileSync(path, JSON.stringify(appConfig));
};

export const uploadSpaToS3 = async (dir: string, bucket: string) => {
  console.log("Uploading SPA to S3...");
  const result = await globby("**", { cwd: dir });
  const s3UploadParams: PutObjectRequest[] = [];
  for (const file of result) {
    const splitFile = file.split(".");
    const fileExtension = splitFile[splitFile.length - 1];
    let contentType;
    switch (fileExtension) {
      case "html":
        contentType = "text/html";
        break;
      case "css":
        contentType = "text/css";
        break;
      case "js":
        contentType = "text/javascript";
        break;
      case "ico":
        contentType = "image/x-icon";
        break;
      case "txt":
        contentType = "text/plain";
        break;
      case "json":
        contentType = "application/json";
        break;
      default:
        contentType = "application/octet-stream";
    }

    s3UploadParams.push({
      Bucket: bucket,
      Key: file,
      Body: await fs.promises.readFile(`${dir}/${file}`),
      ContentType: contentType,
    });
  }

  await Promise.all(
    s3UploadParams.map((params) => s3.putObject(params).promise())
  );
};
