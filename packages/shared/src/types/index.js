"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SseEvent = exports.BatchStatus = exports.ConfidenceLevel = exports.FieldType = exports.JobStatus = void 0;
// ─── Enums ─────────────────────────────────────────────────────────────────────
var JobStatus;
(function (JobStatus) {
    JobStatus["QUEUED"] = "queued";
    JobStatus["PARSING"] = "parsing";
    JobStatus["PROCESSING"] = "processing";
    JobStatus["DONE"] = "done";
    JobStatus["FAILED"] = "failed";
    JobStatus["CANCELLED"] = "cancelled";
})(JobStatus || (exports.JobStatus = JobStatus = {}));
var FieldType;
(function (FieldType) {
    FieldType["STRING"] = "string";
    FieldType["EMAIL"] = "email";
    FieldType["PHONE"] = "phone";
    FieldType["DATE"] = "date";
    FieldType["URL"] = "url";
    FieldType["ENUM"] = "enum";
    FieldType["NUMBER"] = "number";
})(FieldType || (exports.FieldType = FieldType = {}));
var ConfidenceLevel;
(function (ConfidenceLevel) {
    ConfidenceLevel["HIGH"] = "high";
    ConfidenceLevel["MEDIUM"] = "medium";
    ConfidenceLevel["LOW"] = "low";
})(ConfidenceLevel || (exports.ConfidenceLevel = ConfidenceLevel = {}));
var BatchStatus;
(function (BatchStatus) {
    BatchStatus["PENDING"] = "pending";
    BatchStatus["PROCESSING"] = "processing";
    BatchStatus["DONE"] = "done";
    BatchStatus["FAILED"] = "failed";
    BatchStatus["RETRYING"] = "retrying";
})(BatchStatus || (exports.BatchStatus = BatchStatus = {}));
var SseEvent;
(function (SseEvent) {
    SseEvent["PROGRESS"] = "progress";
    SseEvent["BATCH_COMPLETE"] = "batch_complete";
    SseEvent["BATCH_FAILED"] = "batch_failed";
    SseEvent["DONE"] = "done";
    SseEvent["ERROR"] = "error";
})(SseEvent || (exports.SseEvent = SseEvent = {}));
//# sourceMappingURL=index.js.map