import { supabase } from "@/database/db";
import { obtenerStripe } from "../constants/Stripe";
import { ModeloCompra } from "../models/compra";
import { CartItem } from "../types/producto";
//import { ModeloFactura } from "../utils/contacto/factura";
import { Request, Response } from "express";
import { getAllLineItems, getAllSessions } from "../utils/pagos/stripe";
import { CartItemsValidation } from "../utils/validaciones/cartItems";
import { StripeValidation } from "../utils/validaciones/sprite";
import { UsuarioValidation } from "../utils/validaciones/usuario";

interface Customer {
    id: string;
    name: string;
    email: string;
}

export class CompraController {

    static async RealizarCompra(req: Request, res: Response) {
        try {
            const { items, customer }: { items: CartItem[], customer: Customer } = req.body;

            // Validar items del carrito
            const resultadoValidarItems = CartItemsValidation.RevisarItems(items);
            if (!resultadoValidarItems.success) {
                res.status(400).json({
                    success: false,
                    message: 'Error en validación de items',
                    error: JSON.stringify(resultadoValidarItems.error)
                });
                return;
            }

            // Validar datos del cliente
            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({
                id: customer.id,
                nombre: customer.name,
                correo: customer.email
            });

            if (!resultadoValidarUsuario.success) {
                res.status(400).json({
                    success: false,
                    message: 'Error en validación de cliente',
                    error: JSON.stringify(resultadoValidarUsuario.error)
                });
                return;
            }

            console.log("ENTRO CREAR SESOOON");

            // Crear sesión de pago
            const { success, data, message } = await ModeloCompra.crearSesion(items, customer);

            if (!success) {
                res.status(400).json({
                    success: false,
                    message: message,
                    data: null
                });
                return;
            }

            res.status(200).json({
                success: true,
                data: data,
                message: message
            });
        } catch (error) {
            console.error("Error creando sesión de Stripe:", error);
            res.status(500).json({
                success: false,
                message: "Error interno del servidor",
                error: "Error creando la sesión de pago"
            });
        }
    }

    static async ObtenerCompraIdSession(req: Request, res: Response) {
        const stripe = obtenerStripe();

        try {
            const { sessionId } = req.query;

            // Validar sessionId
            const resultadoValidarSessionId = StripeValidation.RevisarSessionId(sessionId as string);
            if (!resultadoValidarSessionId.success) {
                res.status(400).json({
                    success: false,
                    message: resultadoValidarSessionId.error.message,
                });
                return;
            }

            // Recuperar sesión con line_items + customer
            const session = await stripe.checkout.sessions.retrieve(sessionId as string, {
                expand: ["line_items", "customer", "line_items.data.price.product"],
            });



            // Verificar si ya se envió factura (usando metadata de Stripe)
            if (session.metadata?.facturaEnviada === "true") {
                res.status(200).json({
                    success: true,
                    message: "Factura ya fue enviada previamente",
                    data: session,
                });
                return;
            }
            /*
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
            
                            items: session.line_items?.data.map((item: any) => ({
                                producto: item.description,
                                cantidad: item.quantity,
                                precio: `$${(item.price.unit_amount / 100).toFixed(2)} MXN`,
                                total: `$${(item.amount_total / 100).toFixed(2)} MXN`,
                            })) || [],
                        });
            */
            // Marcar como enviada en metadata de Stripe
            await stripe.checkout.sessions.update(sessionId as string, {
                metadata: { ...session.metadata, facturaEnviada: "true" },
            });

            res.status(200).json({
                success: true,
                message: "Factura enviada exitosamente",
                data: session,
            });

        } catch (error) {
            console.error("Error al obtener sesión de Stripe:", error);
            res.status(500).json({
                success: false,
                message: "Error al obtener la sesión de compra",
                data: null,
            });
        }
    }

    static async ObtenerComprasPorEmail(req: Request, res: Response) {
        const stripe = obtenerStripe();

        try {
            const { email, id } = req.params;

            const { data: pedidos, error: pedidosError } = await supabase
                .from('pedidos')
                .select('id')
                .eq('usuario_id', id)

            if (pedidosError || !pedidos || pedidos.length === 0) {
                res.status(200).json({
                    success: false,
                    message: 'No se encontraron pedidos',
                    data: []
                });
                return;
            }

            // Buscar todos los clientes con ese email
            const customers = await stripe.customers.list({ email, limit: 100 });
            if (customers.data.length === 0) {
                res.json({
                    success: true,
                    data: [],
                    total: 0,
                    message: 'No se encontraron compras para este email'
                });
                return;
            }

            // Buscar todas las sesiones de todos los clientes encontrados
            let allSessions: any[] = [];
            for (const customer of customers.data) {
                const sessions = await getAllSessions(stripe, customer.id);
                allSessions.push(...sessions);
            }

            // Traer line_items de cada sesión
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

            // Ordenar pedidos por fecha de creación
            pedidosConItems.sort((a, b) => b.created - a.created);

            res.json({
                success: true,
                data: pedidosConItems,
                total: pedidosConItems.length,
                message: 'Compras obtenidas correctamente'
            });
        } catch (error: any) {
            console.error("Error al obtener compras por email:", error);
            res.status(500).json({
                success: false,
                message: 'Error interno del servidor',
                error: error.message
            });
        }
    }
}