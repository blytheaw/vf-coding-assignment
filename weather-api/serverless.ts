import type { AWS } from "@serverless/typescript";

import { weather } from "./src/functions";

const serverlessConfiguration: AWS = {
  service: "weather-api",
  frameworkVersion: "2",
  custom: {
    webpack: {
      webpackConfig: "./webpack.config.js",
      includeModules: true,
    },
  },
  plugins: ["serverless-webpack"],
  provider: {
    name: "aws",
    runtime: "nodejs12.x",
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    },
    lambdaHashingVersion: "20201221",
  },
  functions: { weather },
};

module.exports = serverlessConfiguration;
