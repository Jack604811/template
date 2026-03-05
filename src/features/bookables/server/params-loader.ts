import { createLoader } from "nuqs/server";
import { bookablesParamsParser } from "../params";

export const bookablesParamsLoader = createLoader(bookablesParamsParser);

