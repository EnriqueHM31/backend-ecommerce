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
exports.ModeloCompra = void 0;
const Pedido_1 = require("../class/Pedido");
const Stripe_1 = require("../constants/Stripe");
class ModeloCompra {
    static RealizarCompra(items, customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = (0, Stripe_1.obtenerStripe)();
            try {
                const pedido = yield Pedido_1.PedidosService.crearPedido(customer.id, items);
                if (!pedido.success) {
                    throw new Error("Error al crear el pedido");
                }
                const session = yield stripe.checkout.sessions.create({
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
                            description: "Compra realizada con el ecommerce",
                            metadata: {
                                customer_name: customer.name,
                                customer_email: customer.email,
                                tipo_envio: 'Fedex', // ⚠️ Sin comillas simples en la key
                            },
                            // Agregar campos adicionales importantes
                            footer: "Gracias por tu compra",
                            custom_fields: [
                                {
                                    name: "Tipo de Envío",
                                    value: "Fedex",
                                },
                            ],
                        },
                    },
                    metadata: {
                        customer_name: customer.name,
                        customer_email: customer.email, // Agregar email en metadata también
                    },
                    line_items: items.map((item) => ({
                        price_data: {
                            currency: "MXN",
                            product_data: {
                                name: item.product.producto,
                                // Agregar descripción para que aparezca en la factura
                                description: item.product.descripcion || "Producto del ecommerce", // Agregar descripción para que aparezca en la factura
                                images: [item.product.imagen_url], // 👈 tiene que ser un array
                            },
                            unit_amount: Math.round(item.product.precio_base * 100),
                        },
                        quantity: item.quantity,
                    })),
                    success_url: "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
                    cancel_url: "http://localhost:5173/cancel",
                    payment_method_options: {
                        card: {
                            request_three_d_secure: "any",
                        },
                    },
                    // ✅ Agregar para asegurar que el customer se cree
                    customer_creation: "always",
                });
                if (!session) {
                    return { success: false, data: null, message: "Error al crear la sesión de Stripe" };
                }
                return { success: true, data: session.url, message: "Compra realizada correctamente" };
            }
            catch (error) {
                console.error("Error al crear la compra:", error);
                return { success: false, data: null, message: error || "Error al crear la compra" };
            }
        });
    }
}
exports.ModeloCompra = ModeloCompra;
