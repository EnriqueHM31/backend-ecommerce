import { ModeloCategorias } from '../models/categorias';
import { Request, Response } from 'express';
export class CategoriasController {
    static async obtenerCategorias(_req: Request, res: Response) {

        try {
            const resultDataProductos = await ModeloCategorias.ListarCategorias();


            if (!resultDataProductos.success) {
                res.status(400).json({ success: false, message: resultDataProductos.message });
                return;
            }

            res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    static async crearCategoria(req: Request, res: Response) {
        try {
            const { nombre } = req.body;
            const resultDataProductos = await ModeloCategorias.CrearCategoria(nombre);

            if (!resultDataProductos.success) {
                res.status(400).json({ success: false, message: resultDataProductos.message });
                return;
            }

            res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    static async modificarCategoria(req: Request, res: Response) {
        try {
            const { id, nombre } = req.body;
            const resultDataProductos = await ModeloCategorias.ModificarCategoria(id, nombre);

            if (!resultDataProductos.success) {
                res.status(400).json({ success: false, message: resultDataProductos.message });
                return;
            }

            res.status(200).json({ success: true, data: resultDataProductos.data, message: resultDataProductos.message });
        } catch (error) {
            res.status(500).json({ success: false, message: "Error interno del servidor" });
        }
    }

    static async eliminarCategoria(req: Request, res: Response) {
        try {
            const { id } = req.body;
            const resultDataProductos = await ModeloCategorias.EliminarCategoria(id);

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