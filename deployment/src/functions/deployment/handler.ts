import { CloudFormationCustomResourceEvent, Context } from "aws-lambda";

import { createResource } from "./create";
import { updateResource } from "./update";
import { deleteResource } from "./delete";
import { configureClients } from "./common";

const handler = async (
  event: CloudFormationCustomResourceEvent,
  context: Context
) => {
  console.log("RequestType: " + event.RequestType);
  console.log("ResponseURL: " + event.ResponseURL);

  configureClients(event.ResourceProperties.Region);

  if (event.RequestType == "Create") {
    await createResource(event, context);
  }

  if (event.RequestType == "Update") {
    await updateResource(event, context);
  }

  if (event.RequestType == "Delete") {
    await deleteResource(event, context);
  }
};

export const main = handler;
