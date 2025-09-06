import Stripe from "stripe";
import type { CartItem, Customer } from "../types/producto";
import { PedidosService } from "../class/Pedido";

// --- Configuración Stripe ---
const CLAVE_STRIPE = process.env.CLAVE_SECRET_STRIPE;
if (!CLAVE_STRIPE) {
    throw new Error("CLAVE_SECRET_STRIPE no está definida en .env");
}


// Usa la última versión estable de Stripe
const stripe = new Stripe(CLAVE_STRIPE);

export class ModeloCompra {

    static async RealizarCompra(
        items: CartItem[],
        customer: Customer,
        direccion_envio: string,
        referencias: string = ''
    ) {
        try {
            // 1. Crear pedido en la base de datos ANTES del pago
            console.log('Creando pedido en BD...');
            const pedidoResult = await PedidosService.crearPedido(
                {
                    user_id: customer.id,
                    cart_items: items,
                    direccion_envio: direccion_envio,
                    referencias
                }
            );
            console.log("PEDIDO")

            if (!pedidoResult.success) {
                throw new Error(`Error creando pedido: ${pedidoResult || 'Error desconocido'}`);
            }

            console.log(`Pedido ${pedidoResult.pedido_id} creado exitosamente`);

            // 2. Crear sesión de Stripe Checkout
            console.log('Creando sesión de Stripe...');
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                customer_email: customer.email,
                billing_address_collection: "required",
                shipping_address_collection: {
                    allowed_countries: ["MX", "US"],
                },
                invoice_creation: {
                    enabled: true,
                    invoice_data: {
                        description: `Pedido #${pedidoResult.pedido_id} - Compra ecommerce`,
                        metadata: {
                            pedido_id: pedidoResult.pedido_id.toString(),
                            customer_id: customer.id,
                            customer_name: customer.name,
                            customer_email: customer.email,
                            tipo_envio: 'Fedex',
                            direccion_envio: direccion_envio,
                        },
                        footer: "Gracias por tu compra",
                        custom_fields: [
                            {
                                name: "Pedido ID",
                                value: `#${pedidoResult.pedido_id}`,
                            },
                            {
                                name: "Tipo de Envío",
                                value: "Fedex",
                            },
                        ],
                    },
                },
                metadata: {
                    pedido_id: pedidoResult.pedido_id.toString(),
                    customer_id: customer.id,
                    customer_name: customer.name,
                    customer_email: customer.email,
                    direccion_envio: direccion_envio,
                },
                line_items: items.map((item: CartItem) => ({
                    price_data: {
                        currency: "MXN",
                        product_data: {
                            name: item.product.producto,
                            description: item.product.descripcion || "Producto del ecommerce",
                            images: [item.product.imagen_url],
                            metadata: {
                                producto_id: item.product.id.toString(),
                                sku: item.product.sku || '',
                                marca: item.product.marca || '',
                            }
                        },
                        unit_amount: Math.round(item.product.precio_base * 100),
                    },
                    quantity: item.quantity,
                })),
                success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/success?session_id={CHECKOUT_SESSION_ID}&pedido_id=${pedidoResult.pedido_id}`,
                cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/cancel?pedido_id=${pedidoResult.pedido_id}`,
                payment_method_options: {
                    card: {
                        request_three_d_secure: "any",
                    },
                },
                customer_creation: "always",
                expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30 minutos
            });

            if (!session) {
                // Si falla Stripe, cancelar el pedido
                await PedidosService.cancelarPedido({ pedido_id: pedidoResult.pedido_id, motivo: 'error_stripe' });
                throw new Error("Error al crear la sesión de Stripe");
            }

            console.log(`Sesión de Stripe ${session.id} creada exitosamente`);

            return {
                success: true,
                data: {
                    session: session,
                    pedido_id: pedidoResult.pedido_id,
                    checkout_url: session.url,
                    session_id: session.id,
                    total: pedidoResult.total,
                    items_count: pedidoResult.items_count
                },
                message: "Pedido creado, proceder al pago"
            };

        } catch (error: any) {
            console.error('Error en RealizarCompra:', error.message);

            return {
                success: false,
                data: null,
                message: error.message || "Error desconocido al procesar la compra"
            };
        }
    }

    /**
     * Confirmar pedido después del pago exitoso (llamado desde webhook)
     * @param pedido_id - ID del pedido a confirmar
     * @returns Promise con resultado de la confirmación
     */
    static async ConfirmarPago(pedido_id: number) {
        try {
            console.log(`Confirmando pago para pedido ${pedido_id}...`);

            const resultado = await PedidosService.confirmarPedido(pedido_id);

            if (resultado.success) {
                console.log(`Pedido ${pedido_id} confirmado y stock actualizado`);

                // Aquí puedes agregar lógica adicional:
                // - Enviar email de confirmación
                // - Crear tarea de envío
                // - Notificar al almacén
                // await this.EnviarEmailConfirmacion(pedido_id);
                // await this.CrearTareaEnvio(pedido_id);
            }

            return resultado;

        } catch (error: any) {
            console.error(`Error confirmando pedido ${pedido_id}:`, error.message);
            throw error;
        }
    }

    /**
     * Cancelar pedido por pago fallido
     * @param pedido_id - ID del pedido a cancelar
     * @param motivo - Motivo de la cancelación
     * @returns Promise con resultado de la cancelación
     */
    static async CancelarPago(pedido_id: number, motivo: string = 'pago_fallido') {
        try {
            console.log(`Cancelando pedido ${pedido_id} por: ${motivo}`);

            const resultado = await PedidosService.cancelarPedido({ pedido_id, motivo });

            if (resultado.success) {
                console.log(`Pedido ${pedido_id} cancelado exitosamente`);

                // Lógica adicional para cancelación:
                // - Enviar email de cancelación
                // - Notificar al cliente
                // await this.EnviarEmailCancelacion(pedido_id, motivo);
            }

            return resultado;

        } catch (error: any) {
            console.error(`Error cancelando pedido ${pedido_id}:`, error.message);
            throw error;
        }
    }

    /**
     * Verificar estado del pago en Stripe
     * @param session_id - ID de la sesión de Stripe
     * @returns Promise con el estado del pago
     */
    static async VerificarPago(session_id: string) {
        try {
            const session = await stripe.checkout.sessions.retrieve(session_id, {
                expand: ['payment_intent']
            });

            const pedido_id = parseInt(session.metadata?.pedido_id || '0');

            return {
                success: true,
                data: {
                    session_id: session.id,
                    payment_status: session.payment_status,
                    pedido_id: pedido_id,
                    amount_total: session.amount_total,
                    customer_email: session.customer_email,
                    session: session
                }
            };

        } catch (error: any) {
            console.error('Error verificando pago:', error.message);

            return {
                success: false,
                data: null,
                message: error.message
            };
        }
    }

    /**
     * Obtener detalles completos de un pedido
     * @param pedido_id - ID del pedido
     * @returns Promise con los detalles del pedido
     */
    static async ObtenerPedido(pedido_id: number) {
        try {
            return await PedidosService.obtenerPedido(pedido_id);
        } catch (error: any) {
            console.error(`Error obteniendo pedido ${pedido_id}:`, error.message);
            throw error;
        }
    }

    /**
     * Limpiar pedidos expirados (para ejecutar cada cierto tiempo)
     * @returns Promise con resultado de la limpieza
     */
    static async LimpiarPedidosExpirados() {
        try {
            console.log('Limpiando pedidos expirados...');

            const resultado = await PedidosService.limpiarPedidosExpirados();

            if (resultado.success && resultado.pedidos_cancelados > 0) {
                console.log(`${resultado.pedidos_cancelados} pedidos expirados cancelados`);
            }

            return resultado;

        } catch (error: any) {
            console.error('Error limpiando pedidos expirados:', error.message);
            throw error;
        }
    }

    /**
     * Actualizar dirección de envío del pedido
     * @param pedido_id - ID del pedido
     * @param direccion_envio - Nueva dirección de envío
     * @returns Promise con resultado de la actualización
     */
    static async ActualizarDireccionEnvio(pedido_id: number, direccion_envio: string) {
        try {
            const { db } = require('../database/db');

            await db.execute(
                'UPDATE pedidos SET direccion_envio = ? WHERE id = ?',
                [direccion_envio, pedido_id]
            );

            console.log(`Dirección actualizada para pedido ${pedido_id}`);

            return {
                success: true,
                message: 'Dirección actualizada correctamente'
            };

        } catch (error: any) {
            console.error(`Error actualizando dirección del pedido ${pedido_id}:`, error.message);
            throw error;
        }
    }

    // Métodos privados para funcionalidades adicionales (implementar según necesidad)

    /*
    private static async EnviarEmailConfirmacion(pedido_id: number) {
        // Implementar envío de email de confirmación
        // usando nodemailer, sendgrid, etc.
    }

    private static async EnviarEmailCancelacion(pedido_id: number, motivo: string) {
        // Implementar envío de email de cancelación
    }

    private static async CrearTareaEnvio(pedido_id: number) {
        // Implementar creación de tarea de envío
        // integración con sistema de logística
    }
    */
}