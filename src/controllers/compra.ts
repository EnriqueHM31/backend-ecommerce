import { obtenerStripe } from "@/constants/Stripe";
import { ModeloCompra } from "@/models/compra";
import { CartItem } from "@/types/producto";
import { ModeloFactura } from "@/utils/contacto/factura";
import { getAllLineItems, getAllSessions } from "@/utils/pagos/stripe";
import { CartItemsValidation } from "@/utils/validaciones/CartItems";
import { StripeValidation } from "@/utils/validaciones/Sprite";
import { UsuarioValidation } from "@/utils/validaciones/usuario";
import { Request, Response } from "express";

interface Customer {
    id: string;
    name: string;
    email: string;
}

export class CompraController {

    static async RealizarCompra(req: Request, res: Response) {
        try {
            const { items, customer }: { items: CartItem[], customer: Customer } = req.body;

            const resultadoValidarItems = CartItemsValidation.RevisarItems(items);

            if (!resultadoValidarItems.success) {
                res.status(400).json({ success: false, error: JSON.stringify(resultadoValidarItems.error) });
                return
            }

            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({ usuario_id: customer.id, nombre: customer.name, correo: customer.email, });

            console.log({ resultadoValidarUsuario });

            if (!resultadoValidarUsuario.success) {
                res.status(400).json({ success: false, error: JSON.stringify(resultadoValidarUsuario.error) });
                return
            }
            const { success, data, message } = await ModeloCompra.RealizarCompra(items, customer);

            if (!success) {
                res.status(400).json({ success: false, message: message, data: [] });
            }

            console.log({ data, message });
            res.status(200).json({ success: true, data: data, message: message });
        } catch (error) {
            console.error("Error creando sesión de Stripe:", JSON.stringify(error));
            res.status(500).json({ error: "Error creando la sesión de pago" + error });
        }
    }

    static async ObtenerCompraIdSession(req: Request, res: Response) {
        const stripe = obtenerStripe();
        try {
            const { sessionId } = req.query;

            const resultadoValidarSessionId = StripeValidation.RevisarSessionId(sessionId as string);

            if (!resultadoValidarSessionId.success) {
                res.status(400).json({ success: false, message: resultadoValidarSessionId.error.message });
                return;
            }

            const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
                expand: ["line_items", "customer"],
            });

            await ModeloFactura.EnviarFacturaPDF({
                nombre: session.customer_details?.name || "Cliente",
                correo: session.customer_details?.email || "sin-correo@dominio.com",
                monto: `$${(session.amount_total === null ? 0 : session.amount_total) / 100} MXN`,
                fecha: new Date().toLocaleString("es-MX", { timeZone: "America/Mexico_City" }),

                direccion1: session.customer_details?.address?.line1 || "",
                direccion2: session.customer_details?.address?.line2 || "",
                ciudad: session.customer_details?.address?.city || "",
                estado: session.customer_details?.address?.state || "",
                cp: session.customer_details?.address?.postal_code || "",
                pais: session.customer_details?.address?.country || "",

                items: session.line_items?.data.map((item: any) => {
                    const producto =
                        typeof item.price.product === "string"
                            ? "Producto"
                            : item.price.product.name;

                    return {
                        producto,
                        cantidad: item.quantity,
                        precio: `$${(item.price.unit_amount / 100).toFixed(2)} MXN`,
                        total: `$${(item.amount_total / 100).toFixed(2)} MXN`,
                    };
                }) || [],
            });

            res.status(200).json({ success: true, message: "Sesión de compra encontrada", data: session, });
        } catch (error) {
            console.error("Error al obtener sesión de Stripe:", error);
            res.status(500).json({ success: false, message: "Error al obtener la sesión de compra", data: null, });
        }
    }

    static async ObtenerComprasPorEmail(req: Request, res: Response) {
        const stripe = obtenerStripe();
        try {
            const { email } = req.params;

            // 1️⃣ Buscar todos los clientes con ese email
            const customers = await stripe.customers.list({ email, limit: 100 });
            if (customers.data.length === 0) {
                res.json({ data: [], total: 0 });
            }

            // 2️⃣ Buscar todas las sesiones de todos los clientes encontrados
            let allSessions: any[] = [];
            for (const customer of customers.data) {
                const sessions = await getAllSessions(stripe, customer.id);
                allSessions.push(...sessions);
            }

            // 3️⃣ Traer line_items de cada sesión
            const pedidosConItems = await Promise.all(
                allSessions.map(async (session) => {
                    const lineItems = await getAllLineItems(stripe, session.id);
                    return {
                        id: session.id,
                        amount_total: session.amount_total,
                        currency: session.currency,
                        status: session.payment_status,
                        created: session.created,
                        line_items: lineItems,
                        url: session.success_url,
                        customer: {
                            address: session.customer_details?.address,
                            email: session.customer_details?.email,
                            name: session.customer_details?.name,
                        },
                    };
                })
            );

            // 4️⃣ Ordenar pedidos por fecha de creación
            pedidosConItems.sort((a, b) => b.created - a.created);

            res.json({ data: pedidosConItems, total: pedidosConItems.length });
        } catch (error: any) {
            res.status(500).json({ error: error.message });
        }
    }
}