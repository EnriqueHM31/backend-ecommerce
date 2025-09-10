import { db } from "@/database/db";
import { Usuario } from "@/types/usuario";
import { RowDataPacket } from "mysql2";

interface UsuarioExtendido extends Usuario, RowDataPacket { }

export async function CheckearUsuario(user_id: string) {
    const [userCheck] = await db.execute<UsuarioExtendido[]>(
        'SELECT id FROM customer WHERE id = ?',
        [user_id]
    );
    if (userCheck.length !== 0) return { existe: true }

    return { existe: false }
}


export async function InsertarUsuario(usuario_id: string, nombre: string, correo: string, avatar: string) {
    const connection = await db.getConnection();

    const [resultInsert] = await connection.query("INSERT INTO customer (id, nombre, correo, avatar) VALUES (?, ?, ?, ?)", [usuario_id, nombre, correo, avatar]);

    if (!resultInsert) throw new Error("Error al insertar usuario");
}