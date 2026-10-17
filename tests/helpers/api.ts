import { expect, type APIRequestContext } from "@playwright/test";
import { loanSchema, userSchema, type LoanInput } from "../../shared/contracts";
import { data, pdf } from "./data";
export class LoanApi {
  constructor(readonly request: APIRequestContext) {}
  async login(id = "alice", role = "APPLICANT") {
    const r = await this.request.post("/api/login", {
      data: { id, role, password: "Demo123!" },
    });
    expect(r.status()).toBe(200);
    return userSchema.parse(await r.json());
  }
  async create(input: LoanInput = data()) {
    const r = await this.request.post("/api/loans", { data: input });
    expect(r.status()).toBe(201);
    return loanSchema.parse(await r.json());
  }
  async upload(id: string) {
    const r = await this.request.post(`/api/loans/${id}/document`, {
      multipart: { document: pdf },
    });
    expect(r.status()).toBe(200);
    return loanSchema.parse(await r.json());
  }
  async submit(id: string) {
    return this.request.post(`/api/loans/${id}/submit`);
  }
  async submitted(input: LoanInput = data()) {
    const l = await this.create(input);
    await this.upload(l.id);
    const r = await this.submit(l.id);
    expect(r.status()).toBe(200);
    loanSchema.parse(await r.json());
    return l;
  }
  async get(id: string) {
    const r = await this.request.get(`/api/loans/${id}`);
    expect(r.status()).toBe(200);
    return loanSchema.parse(await r.json());
  }
  async review(
    id: string,
    decision = "APPROVED",
    reason = "Synthetic review completed",
  ) {
    return this.request.post(`/api/loans/${id}/review`, {
      data: { decision, reason },
    });
  }
}
