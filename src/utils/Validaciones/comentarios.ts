import { z } from 'zod';

export class ValidacionComentarios {

    static comentario = z.object({
        nombre: z.string()
            .min(1, { message: "El nombre es requerido" }),
        correo: z.string(),
        mensaje: z.string().min(1, { message: "El comentario es requerido" }),
    })
}

export function validarComentario(data: { nombre: string, ranking: number, email: string, categoria: string, comentario: string }) {
    return ValidacionComentarios.comentario.safeParse(data);
}
