import { mkdir, writeFile } from "node:fs/promises";
// A valid, one-page synthetic PDF for manual demos; no real customer information.
const content =
  "BT /F1 18 Tf 50 760 Td (Synthetic LoanFlow Supporting Document) Tj ET";
const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
];
let file = "%PDF-1.4\n";
const offsets = [0];
for (const [i, object] of objects.entries()) {
  offsets.push(Buffer.byteLength(file));
  file += `${i + 1} 0 obj\n${object}\nendobj\n`;
}
const xref = Buffer.byteLength(file);
file += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
file += offsets
  .slice(1)
  .map((n) => `${String(n).padStart(10, "0")} 00000 n \n`)
  .join("");
file += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
await mkdir("artifacts/demo", { recursive: true });
await writeFile("artifacts/demo/supporting.pdf", file);
