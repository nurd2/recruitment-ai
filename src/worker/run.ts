import { startProcessor } from "@/worker/processor";

startProcessor();
console.log(`[worker] document-processing worker started (OCR_RUNTIME=${process.env.OCR_RUNTIME ?? "node"})`);
