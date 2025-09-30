import { ModeloTecnicos } from '../models/tecnicos';
import { Request, Response } from 'express';
export class TecnicosController {
    static async obtenerTecnicos(_req: Request, res: Response) {
        try {
            const resultDataProductos = await ModeloTecnicos.ListarTecnicos();

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