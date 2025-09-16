import type { CartItem, Customer } from "../types/producto";
import { PedidosService } from "../class/Pedido";
import { obtenerStripe } from "../constants/Stripe";
import { SistemaRecomendacion } from "@/class/Prediccion";

export class ModeloCompra {

    static async RealizarCompra(items: CartItem[], customer: Customer) {
        const sistemaRecomendacion = new SistemaRecomendacion();
        const stripe = obtenerStripe();
        try {
            // Crear pedido en tu base de datos
            const pedido = await PedidosService.crearPedido(customer.id, items);
            if (!pedido.success) {
                throw new Error("Error al crear el pedido");
            }

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
                    customer_name: customer.name,
                    customer_email: customer.email,
                },
                line_items: items.map((item: CartItem) => ({
                    price_data: {
                        currency: "MXN",
                        product_data: {
                            name: item.product.producto,
                            description: item.product.descripcion || "Producto del ecommerce",
                            images: [item.product.imagen_url],
                        },
                        unit_amount: Math.round(item.product.precio_base * 100),
                    },
                    quantity: item.quantity,
                })),
                success_url: "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
                cancel_url: "http://localhost:5173/cancel",
                customer_creation: "always",
            });

            if (!session) {
                return { success: false, data: null, message: "Error al crear la sesión de Stripe" };
            }

            const formattedArray = items.map((item: CartItem) => ({
                usuario: customer.id,
                producto: `${item.product.sku} - ${item.product.producto}`,
                cantidad: item.quantity
            }));


            await sistemaRecomendacion.entrenar(formattedArray, 50)
            console.log("Entrenamiento completado COMPRASSSSSS");

            const predicciones = await sistemaRecomendacion.predecir(customer.id, 5);
            console.log("Predicciones COMPRASSSSSS", predicciones);



            return { success: true, data: session.url, recomendaciones: predicciones, message: "Compra realizada con éxito" };
        } catch (error) {
            console.error("Error al crear la compra:", error);
            return { success: false, data: null, message: error || "Error al crear la compra" };
        }
    }
}
