import { Router } from "express";
import { db } from "@/database/db";

export const UsuarioRouter = Router();

UsuarioRouter.post("/auth", async (req, res) => {
    try {

        const { usuario_id, nombre, correo, avatar } = req.body;

        if (!usuario_id || !nombre || !correo || !avatar) {
            res.status(400).json({ success: false, message: "Faltan parámetros", data: { usuario_id, nombre, correo, avatar } });
        }

        const connection = await db.getConnection();

        const [usuario] = await connection.query("SELECT * FROM customer WHERE id = ?", [usuario_id]);

        if (usuario) {
            res.status(200).json({ success: true, data: usuario, message: "Usuario encontrado", creado: false });
        }


        const [resultInsert] = await connection.query("INSERT INTO customer (id, nombre, correo, avatar) VALUES (?, ?, ?, ?)", [usuario_id, nombre, correo, avatar]);

        if (resultInsert) {
            res.status(200).json({ success: true, data: resultInsert, message: "Registro completado", creado: true });
        }

    } catch (error) {
        res.status(500).json({ success: false, message: error || "Error al obtener usuarios", data: null, creado: false });
    }
});