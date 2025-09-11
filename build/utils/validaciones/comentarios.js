"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidacionComentarios = void 0;
exports.validarComentario = validarComentario;
const zod_1 = require("zod");
class ValidacionComentarios {
}
exports.ValidacionComentarios = ValidacionComentarios;
ValidacionComentarios.comentario = zod_1.z.object({
    nombre: zod_1.z.string()
        .min(1, { message: "El nombre es requerido" }),
    correo: zod_1.z.string(),
    mensaje: zod_1.z.string().min(1, { message: "El comentario es requerido" }),
});
function validarComentario(data) {
    return ValidacionComentarios.comentario.safeParse(data);
}
