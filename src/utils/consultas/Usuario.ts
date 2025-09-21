import { supabase } from "../../database/db";

export interface UsuarioInsertado {
    id: string;
    nombre: string;
    correo: string;
    avatar: string;
}

export async function CheckearUsuario(user_id: string): Promise<{ existe: boolean }> {
    try {
        // maybeSingle devuelve Usuario | null
        const { data: userCheck, error } = await supabase
            .from("customer")
            .select("id")
            .eq("id", user_id)
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
    avatar: string
): Promise<UsuarioInsertado> {
    try {
        const { data, error } = await supabase
            .from("customer")
            .insert([{ id: usuario_id, nombre, correo, avatar }])
            .select("id, nombre, correo, avatar")
            .maybeSingle();

        if (error) throw new Error(`Error al insertar usuario: ${error.message}`);
        if (!data) throw new Error("Error al insertar usuario: resultado vacío");

        return data as UsuarioInsertado;
    } catch (err) {
        console.error("Error insertando usuario:", err);
        throw err;
    }
}
