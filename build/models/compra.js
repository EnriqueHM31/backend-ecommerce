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
const config_1 = require("../config");
const Stripe_1 = require("../constants/Stripe");
const db_1 = require("../database/db");
class ModeloCompra {
    static crearSesion(items, customer) {
        return __awaiter(this, void 0, void 0, function* () {
            const stripe = (0, Stripe_1.obtenerStripe)();
            try {
                // 1. Obtener IDs de productos
                const productIds = items.map(i => i.product.id);
                console.log({ productIds });
                const { data: productos, error: prodError } = yield db_1.supabase
                    .from('productos_sku')
                    .select('id,sku, stock, precio')
                    .in('id', productIds);
                if (prodError || !productos || productos.length === 0)
                    throw new Error('No se encontraron productos activos' + JSON.stringify(prodError));
                // 2. Validar stock
                for (const item of items) {
                    const productoDB = productos.find(p => p.id === item.product.id);
                    if (!productoDB)
                        throw new Error(`Producto no encontrado o inactivo: ${item.product.producto}`);
                    if (item.quantity > productoDB.stock) {
                        throw new Error(`Stock insuficiente para ${productoDB.sku}. Disponible: ${productoDB.stock}, Solicitado: ${item.quantity}`);
                    }
                }
                // 3. Crear sesión de Stripe
                const session = yield stripe.checkout.sessions.create({
                    payment_method_types: ["card"],
                    mode: "payment",
                    customer_email: customer.email,
                    billing_address_collection: "required",
                    shipping_address_collection: {
                        allowed_countries: ["MX", "US"],
                    },
                    metadata: {
                        customer_id: customer.id,
                        carrito: JSON.stringify(items.map(i => ({
                            producto_id: i.product.id,
                            cantidad: i.quantity
                        }))),
                    },
                    line_items: items.map(item => ({
                        price_data: {
                            currency: "MXN",
                            product_data: {
                                name: item.product.producto,
                                description: item.product.descripcion || "Producto del ecommerce",
                                images: [item.product.imagen_url],
                                metadata: {
                                    producto_id: item.product.id,
                                }
                            },
                            unit_amount: Math.round(item.product.precio_base * 100),
                        },
                        quantity: item.quantity,
                    })),
                    success_url: `${config_1.DIRECCION_PAYMENT}/success?session_id={CHECKOUT_SESSION_ID}`,
                    cancel_url: `${config_1.DIRECCION_PAYMENT}/cancel`,
                });
                return { success: true, data: session.url };
            }
            catch (error) {
                console.error("Error al crear sesión de Stripe:", error);
                return { success: false, message: error.message || "Error al crear la sesión" };
            }
        });
    }
}
exports.ModeloCompra = ModeloCompra;
