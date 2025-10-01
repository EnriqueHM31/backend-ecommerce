import { Request, Response } from "express";
import { ModeloProductos } from '../models/productos';

export class ProductosController {
    static async ListarProductos(_req: Request, res: Response) {
        try {
            const resultDataProductos = await ModeloProductos.ListarProductos();

            if (!resultDataProductos.success) {
                res.status(400).json({ success: false, message: resultDataProductos.message });
                return;
            }

            res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    static async topProductos(_req: Request, res: Response) {
        try {
            const resultDataProductos = await ModeloProductos.topProductos();

            if (!resultDataProductos.success) {
                res.status(400).json({ success: false, message: resultDataProductos.message });
                return;
            }

            res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    static async ListarProductosActivos(_req: Request, res: Response) {
        try {
            const resultDataProductos = await ModeloProductos.ListarProductosActivos();

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