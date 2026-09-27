import { getPayload, type Payload } from "payload";
import config from "@payload-config";

let payloadPromise: Promise<Payload> | null = null;

/** Reuses a single initialized Payload instance across requests in the same process. */
export function getPayloadClient(): Promise<Payload> {
  if (!payloadPromise) {
    payloadPromise = getPayload({ config });
  }
  return payloadPromise;
}
