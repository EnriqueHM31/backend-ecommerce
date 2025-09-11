"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.obtenerStripe = obtenerStripe;
const stripe_1 = __importDefault(require("stripe"));
function obtenerStripe() {
    const CLAVE_STRIPE = process.env.CLAVE_SECRET_STRIPE;
    if (!CLAVE_STRIPE) {
        throw new Error("CLAVE_SECRET_STRIPE no está definida en .env");
    }
    // Usa la última versión estable de Stripe
    return new stripe_1.default(CLAVE_STRIPE);
}
