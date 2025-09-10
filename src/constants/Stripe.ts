import Stripe from "stripe";

export function obtenerStripe() {
    const CLAVE_STRIPE = process.env.CLAVE_SECRET_STRIPE;
    if (!CLAVE_STRIPE) {
        throw new Error("CLAVE_SECRET_STRIPE no está definida en .env");
    }

    // Usa la última versión estable de Stripe
    return new Stripe(CLAVE_STRIPE);
}