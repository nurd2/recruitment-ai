import { customAlphabet } from "nanoid";

const alphabet = "0123456789abcdefghijklmnopqrstuvwxyz";
const nano = customAlphabet(alphabet, 12);

/** Short id used for correlation ids and storage object names. */
export function shortId(prefix = ""): string {
  return prefix ? `${prefix}_${nano()}` : nano();
}
