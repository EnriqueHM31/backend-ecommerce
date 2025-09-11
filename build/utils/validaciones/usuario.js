"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioValidation = exports.UsuarioSchema = void 0;
const zod_1 = require("zod");
// Schema del producto
exports.UsuarioSchema = zod_1.z.object({
    usuario_id: zod_1.z.string(),
    nombre: zod_1.z.string(),
    correo: zod_1.z.string(),
    avatar: zod_1.z.string().url().optional(),
});
// Clase con validador
class UsuarioValidation {
    static RevisarUsuario(usuario) {
        return exports.UsuarioSchema.safeParse(usuario);
    }
}
exports.UsuarioValidation = UsuarioValidation;
