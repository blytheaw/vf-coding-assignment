import type { AWS } from "@serverless/typescript";

import { deployment } from "./src/functions";

const serverlessConfiguration: AWS = {
  service: "deployment",
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
    timeout: 30,
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: "1",
    },
    lambdaHashingVersion: "20201221",
    iamRoleStatements: [
      {
        Effect: "Allow",
        Action: [
          "iam:CreateRole",
          "iam:AttachRolePolicy",
          "iam:DetachRolePolicy",
          "iam:DeleteRole",
          "iam:PassRole",
          "iam:ListRoles",
        ],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: [
          "lambda:CreateFunction",
          "lambda:AddPermission",
          "lambda:DeleteFunction",
          "lambda:UpdateFunctionCode",
          "lambda:UpdateFunctionConfiguration",
          "lambda:ListFunctions",
        ],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: [
          "s3:CreateBucket",
          "s3:PutBucketWebsite",
          "s3:PutBucketPolicy",
          "s3:PutObject",
          "s3:DeleteObject",
          "s3:DeleteBucket",
          "s3:ListBucket",
          "s3:ListAllMyBuckets",
        ],
        Resource: "*",
      },
      {
        Effect: "Allow",
        Action: ["apigateway:GET", "apigateway:POST", "apigateway:DELETE"],
        Resource: "*",
      },
    ],
  },
  functions: { deployment },
};

module.exports = serverlessConfiguration;
