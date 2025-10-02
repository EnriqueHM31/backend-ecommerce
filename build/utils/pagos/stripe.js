"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSessions = getAllSessions;
exports.getAllLineItems = getAllLineItems;
function getAllSessions(stripe, customerId) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasMore = true;
        let startingAfter = undefined;
        const allSessions = [];
        while (hasMore) {
            const sessions = yield stripe.checkout.sessions.list({
                customer: customerId,
                limit: 1000,
                starting_after: startingAfter,
            });
            allSessions.push(...sessions.data);
            hasMore = sessions.has_more;
            if (hasMore) {
                startingAfter = sessions.data[sessions.data.length - 1].id;
            }
        }
        return allSessions;
    });
}
function getAllLineItems(stripe, sessionId) {
    return __awaiter(this, void 0, void 0, function* () {
        let hasMore = true;
        let startingAfter = undefined;
        const allItems = [];
        while (hasMore) {
            const lineItems = yield stripe.checkout.sessions.listLineItems(sessionId, {
                limit: 100,
                starting_after: startingAfter,
                expand: ["data.price.product"],
            });
            allItems.push(...lineItems.data);
            hasMore = lineItems.has_more;
            if (hasMore) {
                startingAfter = lineItems.data[lineItems.data.length - 1].id;
            }
        }
        return allItems;
    });
}
