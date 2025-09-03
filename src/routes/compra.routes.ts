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

