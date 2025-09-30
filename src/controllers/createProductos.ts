import { ModeloCreateProductos } from '../models/createProductos';
import { Request, Response } from 'express';

export class CreateProductosController {
    static async createProductosSku(req: Request, res: Response) {
        try {
            const { sku, producto, productos_base_id, variante_id, color_id, almacenamiento_id, ram_id, stock, imagen_url, precio } = req.body;

            const resultDataProductos = await ModeloCreateProductos.createProductos(sku, producto, productos_base_id, variante_id, color_id, almacenamiento_id, ram_id, stock, imagen_url, precio);

            if (!resultDataProductos.success) {
                res.status(400).json({ success: false, message: resultDataProductos.message });
                return;
            }

            res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }


}