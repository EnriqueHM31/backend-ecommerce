import { Request, Response } from "express";
import { UsuariosModel } from '../models/usuarios';

export class AutenticacionController {
    static async Auth(req: Request, res: Response) {
        const { usuario_id, nombre, correo, avatar } = req.body;

        const resultado = await UsuariosModel.autenticarUsuario({
            usuario_id,
            nombre,
            correo,
            avatar
        });

        const statusCode = resultado.success ? 203 : 400;
        res.status(statusCode).json(resultado);
    }
}