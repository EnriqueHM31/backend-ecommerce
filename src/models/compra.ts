import type { CartItem, Customer } from "../types/producto";
import Stripe from "stripe";

// --- Configuración Stripe ---
const CLAVE_STRIPE = process.env.CLAVE_SECRET_STRIPE;
if (!CLAVE_STRIPE) {
    throw new Error("CLAVE_SECRET_STRIPE no está definida en .env");
}

// Usa la última versión estable de Stripe
const stripe = new Stripe(CLAVE_STRIPE);

export class ModeloCompra {
    static async RealizarCompra(items: CartItem[], customer: Customer) {
        // Crear sesión de Stripe Checkout
        // 1️⃣ Crear (o reutilizar) un Customer en Stripe
        const stripeCustomer = await stripe.customers.create({
            name: customer.name,
            email: customer.email,
            metadata: {
                app_user_id: customer.id, // si tienes un id de usuario interno
            },
        });

        // 2️⃣ Crear sesión de pago vinculada al Customer
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            mode: "payment",
            customer: stripeCustomer.id, // ✅ vinculamos el customer
            metadata: {
                customer_name: customer.name,
            },
            line_items: items.map((item: any) => ({
                price_data: {
                    currency: "mxn",
                    product_data: { name: item.product.name },
                    unit_amount: Math.round(item.configuration.price * 100), // en centavos
                },
                quantity: item.quantity,
            })),
            success_url: "http://localhost:5173/success",
            cancel_url: "http://localhost:5173/cancel",
            payment_method_options: {
                card: {
                    request_three_d_secure: "any",
                },
            }
        });


        if (!session) {
            return { success: false, data: null, message: "Error al crear la sesión de Stripe" };
        }

        return { success: true, data: session.url, message: "Compra realizada correctamente" };
    }
}
