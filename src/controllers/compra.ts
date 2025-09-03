import { ModeloCompra } from "@/models/compra";
import { CartItem } from "@/types/producto";
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

            if (!items || items.length === 0) {
                res.status(400).json({ success: false, error: "Carrito vacío" });
            }

            // Validar items básicos
            for (const item of items) {
                if (!item.product.producto || !item.product.precio_base || !item.quantity) {
                    res.status(400).json({ success: false, error: "Item inválido en el carrito" });
                }
            }

            const { success, data, message } = await ModeloCompra.RealizarCompra(items, customer);

            if (!success) {
                res.status(400).json({ success: false, message });
            }

            res.status(200).json({ success: true, data: data, message });
        } catch (error) {
            console.error("Error creando sesión de Stripe:", error);
            res.status(500).json({ error: "Error creando la sesión de pago" });
        }
    }
}