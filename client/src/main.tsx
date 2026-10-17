import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { z } from "zod";
import {
  loanSchema,
  userSchema,
  type Loan,
  type User,
} from "../../shared/contracts";
import "./style.css";
async function api(path: string, init: RequestInit = {}) {
  const r = await fetch(`/api${path}`, {
    ...init,
    headers:
      init.body instanceof FormData
        ? {}
        : { "Content-Type": "application/json", ...init.headers },
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error ?? "Request failed");
  return data;
}
function App() {
  const [user, setUser] = useState<User | null>(null),
    [loans, setLoans] = useState<Loan[]>([]),
    [message, setMessage] = useState(""),
    [wrong, setWrong] = useState(false),
    [busy, setBusy] = useState(false);
  async function refresh() {
    setLoans(z.array(loanSchema).parse(await api("/loans")));
  }
  useEffect(() => {
    api("/me")
      .then((d) => setUser(userSchema.parse(d)))
      .catch(() => {});
  }, []);
  useEffect(() => {
    if (user) {
      refresh().catch((e) => setMessage(e.message));
      api("/config").then((d) => setWrong(d.wrongUiStatus));
    }
  }, [user]);
  async function act(job: () => Promise<void>) {
    setBusy(true);
    setMessage("");
    try {
      await job();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Unexpected error");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main>
      <header>
        <span className="mark">LF</span>
        <div>
          <p className="eyebrow">QA ENGINEERING LAB</p>
          <h1>LoanFlow QA</h1>
        </div>
        {user && (
          <button
            onClick={() =>
              act(async () => {
                await api("/logout", { method: "POST" });
                setUser(null);
                setLoans([]);
              })
            }
          >
            Sign out
          </button>
        )}
      </header>
      <p className="notice">
        Synthetic data only. These are fictional educational rules, not mortgage
        underwriting policies.
      </p>
      {message && <p role="alert">{message}</p>}
      {!user ? (
        <section className="login">
          <p className="eyebrow">WELCOME TO THE DEMO</p>
          <h2>Sign in to your workspace</h2>
          <p>Explore a loan from draft to decision.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void act(async () => {
                setUser(
                  userSchema.parse(
                    await api("/login", {
                      method: "POST",
                      body: JSON.stringify(Object.fromEntries(d)),
                    }),
                  ),
                );
              });
            }}
          >
            <label>
              Account
              <select name="id">
                <option value="alice">Alice · North applicant</option>
                <option value="bob">Bob · South applicant</option>
                <option value="officer-north">North loan officer</option>
                <option value="officer-south">South loan officer</option>
              </select>
            </label>
            <label>
              Role
              <select name="role">
                <option value="APPLICANT">Applicant</option>
                <option value="OFFICER">Loan Officer</option>
              </select>
            </label>
            <label>
              Password
              <input
                type="password"
                name="password"
                required
                defaultValue="Demo123!"
              />
            </label>
            <button disabled={busy}>Sign in</button>
          </form>
          <small>Demo password: Demo123! · No real accounts</small>
        </section>
      ) : (
        <>
          <div className="title">
            <div>
              <p className="eyebrow">
                {user.scope} WORKSPACE · {user.name}
              </p>
              <h2>
                {user.role === "APPLICANT"
                  ? "Applicant dashboard"
                  : "Loan Officer dashboard"}
              </h2>
            </div>
            <button onClick={() => act(refresh)}>Refresh applications</button>
          </div>
          <div className={user.role === "APPLICANT" ? "workspace" : "reviews"}>
            {user.role === "APPLICANT" && (
              <section>
                <h3>New application</h3>
                <p>Save a draft, attach a PDF, then submit.</p>
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const d = new FormData(e.currentTarget);
                    const body = Object.fromEntries(d);
                    const numeric = {
                      ...body,
                      monthlyIncome: Number(body.monthlyIncome),
                      requestedLoan: Number(body.requestedLoan),
                      propertyValue: Number(body.propertyValue),
                    };
                    void act(async () => {
                      await api("/loans", {
                        method: "POST",
                        body: JSON.stringify(numeric),
                      });
                      await refresh();
                      setMessage("Draft created");
                    });
                  }}
                >
                  <label>
                    Applicant name
                    <input name="applicantName" />
                  </label>
                  <label>
                    Monthly income
                    <input name="monthlyIncome" type="number" step="0.01" />
                  </label>
                  <label>
                    Requested loan amount
                    <input name="requestedLoan" type="number" step="0.01" />
                  </label>
                  <label>
                    Property value
                    <input name="propertyValue" type="number" step="0.01" />
                  </label>
                  <label>
                    Loan purpose
                    <input name="purpose" />
                  </label>
                  <button disabled={busy}>Create draft</button>
                </form>
              </section>
            )}
            <section>
              <h3>
                {user.role === "APPLICANT"
                  ? "Your applications"
                  : "Assigned applications"}
              </h3>
              {loans.length === 0 && <p>No applications yet.</p>}
              {loans.map((l) => (
                <article
                  key={l.id}
                  aria-label={`Application ${l.applicantName}`}
                >
                  <div className="cardtitle">
                    <h4>{l.applicantName}</h4>
                    <span
                      role="status"
                      className={`badge ${l.status.toLowerCase()}`}
                    >
                      {wrong && l.status === "APPROVED"
                        ? "SUBMITTED"
                        : l.status}
                    </span>
                  </div>
                  <p>{l.purpose}</p>
                  <dl>
                    <dt>Requested</dt>
                    <dd>{l.requestedLoan.toLocaleString()}</dd>
                    <dt>Property value</dt>
                    <dd>{l.propertyValue.toLocaleString()}</dd>
                    <dt>Document</dt>
                    <dd>{l.documentName ?? "Not uploaded"}</dd>
                  </dl>
                  {l.reason && <p>Decision reason: {l.reason}</p>}
                  {user.role === "APPLICANT" && l.status === "DRAFT" && (
                    <>
                      <label>
                        Supporting PDF
                        <input
                          type="file"
                          accept="application/pdf"
                          disabled={busy}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file)
                              void act(async () => {
                                const body = new FormData();
                                body.set("document", file);
                                await api(`/loans/${l.id}/document`, {
                                  method: "POST",
                                  body,
                                });
                                await refresh();
                                setMessage("Document uploaded");
                              });
                          }}
                        />
                      </label>
                      <button
                        disabled={busy}
                        onClick={() =>
                          act(async () => {
                            await api(`/loans/${l.id}/submit`, {
                              method: "POST",
                            });
                            await refresh();
                          })
                        }
                      >
                        Submit application
                      </button>
                    </>
                  )}
                  {user.role === "OFFICER" && l.status === "SUBMITTED" && (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const form = e.currentTarget;
                        const reason = new FormData(form).get("reason");
                        const decision = (
                          e.nativeEvent as SubmitEvent
                        ).submitter?.getAttribute("value");
                        void act(async () => {
                          const updated = loanSchema.parse(
                            await api(`/loans/${l.id}/review`, {
                              method: "POST",
                              body: JSON.stringify({ decision, reason }),
                            }),
                          );
                          setLoans((ls) =>
                            ls.map((item) =>
                              item.id === l.id ? updated : item,
                            ),
                          );
                        });
                      }}
                    >
                      <label>
                        Decision reason
                        <input name="reason" required minLength={3} />
                      </label>
                      <div className="actions">
                        <button value="APPROVED" disabled={busy}>
                          Approve application
                        </button>
                        <button
                          value="REJECTED"
                          className="secondary"
                          disabled={busy}
                        >
                          Reject application
                        </button>
                      </div>
                    </form>
                  )}
                </article>
              ))}
            </section>
          </div>
        </>
      )}
      <footer>
        LoanFlow QA · Browser → REST API → PostgreSQL · Educational demo
      </footer>
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
