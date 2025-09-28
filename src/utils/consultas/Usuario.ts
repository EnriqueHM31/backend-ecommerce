import { supabase } from "../../database/db";

export interface UsuarioInsertado {
    id_usuario: string;
    nombre: string;
    correo: string;
}

export async function CheckearUsuario(user_id: string): Promise<{ existe: boolean }> {
    try {
        // maybeSingle devuelve Usuario | null
        const { data: userCheck, error } = await supabase
            .from("usuarios")
            .select("id_usuario")
            .eq("id_usuario", user_id)
            .maybeSingle();

        if (error) throw error;

        return { existe: !!userCheck };
    } catch (err) {
        console.error("Error verificando usuario:", err);
        throw err;
    }
}

export async function InsertarUsuario(
    usuario_id: string,
    nombre: string,
    correo: string,
): Promise<UsuarioInsertado> {
    try {
        const { data, error } = await supabase
            .from("usuarios")
            .insert([{ id_usuario: usuario_id, nombre, correo, id_rol: 1 }])
            .select("id_usuario, nombre, correo")
            .maybeSingle();

        if (error) throw new Error(`Error al insertar usuario: ${error.message}`);
        if (!data) throw new Error("Error al insertar usuario: resultado vacío");

        return data as UsuarioInsertado;
    } catch (err) {
        console.error("Error insertando usuario:", err);
        throw err;
    }
}
