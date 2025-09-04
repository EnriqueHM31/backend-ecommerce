// routes/compra.ts
import { CompraController } from "@/controllers/compra";
import { Router } from "express";
import Stripe from "stripe";
const stripe = new Stripe(process.env.CLAVE_SECRET_STRIPE!);

export const CompraRouter = Router();


CompraRouter.post("/checkout-session", CompraController.RealizarCompra);

CompraRouter.get("/checkout-session", async (req, res) => {
    console.log("📂 CompraRouter cargado");
    try {
        console.log(req.query);
        const { sessionId } = req.query;

        console.log({ sessionId });

        if (!sessionId || typeof sessionId !== "string") {
            res.status(400).json({
                success: false,
                message: "No se ha proporcionado un id de sesión válido",
                data: null,
            });
        }

        const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
            expand: ["line_items", "customer"],
        });

        res.status(200).json({
            success: true,
            message: "Sesión de compra encontrada",
            data: session,
        });
    } catch (error: any) {
        console.error("Error al obtener sesión de Stripe:", error);
        res.status(500).json({
            success: false,
            message: "Error al obtener la sesión de compra",
            data: null,
        });
    }
});

CompraRouter.get("/pedidos/:email", async (req, res) => {
    try {
        const { email } = req.params;

        // 1️⃣ Buscar el cliente en Stripe
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length === 0) {
            res.json([]);
        }

        const customerId = customers.data[0].id;

        // 2️⃣ Buscar las sesiones de checkout del cliente
        const sessions = await stripe.checkout.sessions.list({
            customer: customerId,
            limit: 100,
        });

        // 3️⃣ Traer los line_items de cada sesión
        const pedidosConItems = await Promise.all(
            sessions.data.map(async (session) => {
                const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
                    limit: 10,
                    expand: ["data.price.product"], // ✅ expandimos el objeto Product
                });
                console.log({ hola: lineItems.data });

                return {
                    id: session.id,
                    amount_total: session.amount_total,
                    currency: session.currency,
                    status: session.payment_status,
                    created: session.created,
                    line_items: lineItems.data,
                    url: session.success_url,
                    customer: {
                        address: session.customer_details?.address,
                        email: session.customer_details?.email,
                        name: session.customer_details?.name,
                    }
                };
            })
        );

        res.json({ data: pedidosConItems });
    } catch (error) {
        res.status(500).json({ error: error });
    }
});

