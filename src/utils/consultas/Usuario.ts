import { db } from "@/database/db";


export async function CheckearUsuario(usuario_id: string) {
    const connection = await db.getConnection();
    const [usuario] = await connection.query("SELECT * FROM customer WHERE id = ?", [usuario_id]);

    if (!usuario) throw new Error("Usuario no encontrado");
}

export async function InsertarUsuario(usuario_id: string, nombre: string, correo: string, avatar: string) {
    const connection = await db.getConnection();

    const [resultInsert] = await connection.query("INSERT INTO customer (id, nombre, correo, avatar) VALUES (?, ?, ?, ?)", [usuario_id, nombre, correo, avatar]);

    if (!resultInsert) throw new Error("Error al insertar usuario");
}