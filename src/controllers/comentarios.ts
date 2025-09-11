import { Request, Response } from "express";
import { validarComentario } from '../utils/validaciones/comentarios';
import { ModeloContacto } from '../models/comentarios';

export class ComentariosController {
    static async EnviarMensaje(req: Request, res: Response) {

        const resultDataComentario = validarComentario(req.body);

        if (!resultDataComentario.success) {
            res.status(400).json({ success: false, message: JSON.parse(resultDataComentario.error.message) });
            return;
        }

        const DataComentario = resultDataComentario.data

        const { success, message, comentario } = await ModeloContacto.EnviarMensaje(DataComentario);

        if (success) {
            res.status(200).json({ success, message, comentario });
        } else {
            res.status(500).json({ success, message, comentario: {} });
        }
    }
}