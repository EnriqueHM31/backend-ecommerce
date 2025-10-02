"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioValidation = exports.UsuarioSchema = void 0;
const zod_1 = require("zod");
// Schema del producto
exports.UsuarioSchema = zod_1.z.object({
    id: zod_1.z.string(),
    nombre: zod_1.z.string(),
    correo: zod_1.z.string(),
});
// Clase con validador
class UsuarioValidation {
    static RevisarUsuario(usuario) {
        return exports.UsuarioSchema.safeParse(usuario);
    }
}
exports.UsuarioValidation = UsuarioValidation;
