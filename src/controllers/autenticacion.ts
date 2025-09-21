import { CheckearUsuario, InsertarUsuario } from "../utils/consultas/Usuario";
import { UsuarioValidation } from "../utils/validaciones/usuario";
import { Request, Response } from "express";

export class AutenticacionController {
    static async Auth(req: Request, res: Response) {
        try {
            const { usuario_id, nombre, correo, avatar } = req.body;

            // Validación con Zod
            const resultadoValidarUsuario = UsuarioValidation.RevisarUsuario({ id: usuario_id, nombre, correo, avatar });

            if (!resultadoValidarUsuario.success) {
                res.status(400).json({
                    creado: false,
                    success: false,
                    message: resultadoValidarUsuario.error.issues.map(err => err.message).join(", ")
                });
            }

            // Revisar si ya existe el usuario
            const { existe } = await CheckearUsuario(usuario_id);

            if (!existe) {
                console.log('Creando usuario...');
                await InsertarUsuario(usuario_id, nombre, correo, avatar);

                res.status(203).json({
                    success: true,
                    creado: true,
                    message: 'Registro exitoso',
                    data: { usuario_id, nombre, correo, avatar }
                });
            } else {
                res.status(203).json({
                    success: true,
                    creado: false,
                    message: 'Usuario ya registrado',
                    data: { usuario_id, nombre, correo, avatar }
                });
            }


        } catch (error) {
            console.error("Error en /auth:", error);
            res.status(500).json({
                success: false,
                message: error instanceof Error ? error.message : "Error al procesar la autenticación",
                data: null,
                creado: false
            });
        }
    }
}