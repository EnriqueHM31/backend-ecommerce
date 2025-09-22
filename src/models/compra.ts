import { obtenerStripe } from "../constants/Stripe";
import type { CartItem, Customer } from "../types/producto";

export class ModeloCompra {
    static async crearSesion(items: CartItem[], customer: Customer) {
        const stripe = obtenerStripe();

        try {
            // Crear sesión de Checkout
            const session = await stripe.checkout.sessions.create({
                payment_method_types: ["card"],
                mode: "payment",
                customer_email: customer.email,
                billing_address_collection: "required",
                shipping_address_collection: {
                    allowed_countries: ["MX", "US"],
                },
                metadata: {
                    customer_id: customer.id, // importante para identificar al usuario luego
                    carrito: JSON.stringify(
                        items.map((i) => ({
                            producto_id: i.product.id,
                            cantidad: i.quantity,
                        }))
                    ),
                },
                line_items: items.map((item: CartItem) => ({
                    price_data: {
                        currency: "MXN",
                        product_data: {

                            name: item.product.producto,
                            description: item.product.descripcion || "Producto del ecommerce",
                            images: [item.product.imagen_url],
                            metadata: {
                                producto_id: item.product.id, // aquí puedes pasar tu ID interno
                            }
                        },
                        unit_amount: Math.round(item.product.precio_base * 100),
                    },
                    quantity: item.quantity,
                })),
                success_url:
                    "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
                cancel_url: "http://localhost:5173/cancel",
            });

            console.log({ session });

            return { success: true, data: session.url };
        } catch (error) {
            console.error("Error al crear sesión de Stripe:", error);
            return { success: false, message: error || "Error al crear la sesión" };
        }
    }
}
