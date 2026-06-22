import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";

export {
  OPENROUTER_KEY,
  SELECTED_MODEL_KEY,
  WORKSPACE_ID_KEY,
  WORKSPACE_SECRET_KEY,
} from "@/lib/workspace/keys";

const SALT_ROUNDS = 10;

export function generateWorkspaceSecret(): string {
  return randomBytes(32).toString("hex");
}

export async function hashSecret(secret: string): Promise<string> {
  return bcrypt.hash(secret, SALT_ROUNDS);
}

export async function verifySecret(
  secret: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(secret, hash);
}
