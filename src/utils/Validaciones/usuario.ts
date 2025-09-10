import { z } from "zod";
import type { Usuario } from "../../types/usuario";
// Schema del producto
export const UsuarioSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    email: z.string(),
    name: z.string(),
    avatar: z.string().url(),
});


// Clase con validador
export class UsuarioValidation {
    static RevisarUsuario(usuario: Partial<Usuario>) {
        return UsuarioSchema.safeParse(usuario);
    }
}
