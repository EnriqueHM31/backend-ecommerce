import { ModeloCompra } from "@/models/compra";
import { CartItem } from "@/types/producto";
import { CartItemsValidation } from "@/utils/Validaciones/CartItems";
import { UsuarioValidation } from "@/utils/Validaciones/usuario";
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
                res.status(400).json({ success: false, error: resultadoValidarItems.error.message });
                return
            }

            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({ usuario_id: customer.id, nombre: customer.name, correo: customer.email, });

            if (!resultadoValidarUsuario.success) {
                res.status(400).json({ success: false, error: resultadoValidarUsuario.error.message });
                return
            }
            const { success, data, message } = await ModeloCompra.RealizarCompra(items, customer);

            if (!success) {
                res.status(400).json({ success: false, message: message, data: [] });
            }

            res.status(200).json({ success: true, data: data, message: message });
        } catch (error) {
            console.error("Error creando sesión de Stripe:", error);
            res.status(500).json({ error: "Error creando la sesión de pago" + error });
        }
    }
}