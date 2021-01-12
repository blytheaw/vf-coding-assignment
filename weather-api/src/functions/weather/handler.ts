import {
  formatJSONResponse,
  ValidatedEventAPIGatewayProxyEvent,
} from "@libs/apiGateway";
import { middyfy } from "@libs/lambda";

import schema from "./schema";

import got, { Response } from "got";

const handler: ValidatedEventAPIGatewayProxyEvent<typeof schema> = async (
  event
) => {
  const apiKey = process.env.OPENWEATHER_APIKEY;
  const response: Response<string> = await got.get(
    `https://api.openweathermap.org/data/2.5/weather?id=4553433&appid=${apiKey}&units=imperial`
  );

  return formatJSONResponse(JSON.parse(response.body));
};

export const main = middyfy(handler);
