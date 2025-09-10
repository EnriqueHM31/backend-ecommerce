import { CheckearUsuario } from "@/utils/consultas/compras";
import { InsertarUsuario } from "@/utils/consultas/Usuario";
import { UsuarioValidation } from "@/utils/Validaciones/usuario";
import { Router } from "express";

export const UsuarioRouter = Router();

UsuarioRouter.post("/auth", async (req, res) => {
    try {

        const { usuario_id, nombre, correo, avatar } = req.body;

        const resultadoValidarUsuario = await UsuarioValidation.RevisarUsuario({ id: usuario_id, nombre, email: correo, avatar });

        if (!resultadoValidarUsuario.success) {
            res.status(400).json({ success: false, message: resultadoValidarUsuario.error.message });
            return;
        }

        await CheckearUsuario(usuario_id);

        await InsertarUsuario(usuario_id, nombre, correo, avatar);

    } catch (error) {
        res.status(500).json({ success: false, message: error || "Error al obtener usuarios", data: null, creado: false });
    }
});