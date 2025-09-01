import { Request, Response } from "express";
import { ModeloProductos } from '../models/productos';

export class ProductosController {
    static async ListarProductos(_req: Request, res: Response) {

        const resultDataProductos = await ModeloProductos.ListarProductos();

        if (!resultDataProductos.success) {
            res.status(400).json({ success: false, message: resultDataProductos.message });
            return;
        }

        res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
    }
}   