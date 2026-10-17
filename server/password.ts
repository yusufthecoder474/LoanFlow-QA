import { scryptSync, timingSafeEqual } from "node:crypto";
export const hash = (password: string, id: string) =>
  scryptSync(password, `loanflow-demo-${id}`, 64).toString("hex");
export const matches = (password: string, id: string, stored: string) =>
  timingSafeEqual(
    Buffer.from(hash(password, id), "hex"),
    Buffer.from(stored, "hex"),
  );
