"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StripeValidation = exports.StripeSchema = void 0;
const zod_1 = require("zod");
exports.StripeSchema = zod_1.z.object({
    sessionId: zod_1.z.string()
});
class StripeValidation {
    static RevisarSessionId(sessionId) {
        return exports.StripeSchema.safeParse({ sessionId });
    }
}
exports.StripeValidation = StripeValidation;
