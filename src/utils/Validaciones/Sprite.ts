import { z } from "zod";

export const StripeSchema = z.object({
    sessionId: z.string()
});

export class StripeValidation {
    static RevisarSessionId(sessionId: string) {
        return StripeSchema.safeParse({ sessionId });
    }
}