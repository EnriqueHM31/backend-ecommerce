"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuariosModel = void 0;
const Usuario_1 = require("../utils/consultas/Usuario");
const usuario_1 = require("../utils/validaciones/usuario");
class UsuariosModel {
    /**
     * Autentica o registra un usuario
     */
    static autenticarUsuario(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { usuario_id, nombre, correo } = data;
                // Validación con Zod
                const resultadoValidarUsuario = usuario_1.UsuarioValidation.RevisarUsuario({
                    id: usuario_id,
                    nombre,
                    correo,
                });
                if (!resultadoValidarUsuario.success) {
                    return {
                        success: false,
                        message: resultadoValidarUsuario.error.issues.map(err => err.message).join(", "),
                        creado: false
                    };
                }
                // Revisar si ya existe el usuario
                const { existe } = yield (0, Usuario_1.CheckearUsuario)(usuario_id);
                if (!existe) {
                    console.log('Creando usuario...');
                    yield (0, Usuario_1.InsertarUsuario)(resultadoValidarUsuario.data.id, resultadoValidarUsuario.data.nombre, resultadoValidarUsuario.data.correo);
                    return {
                        success: true,
                        creado: true,
                        message: 'Registro exitoso',
                        data: { usuario_id, nombre, correo }
                    };
                }
                else {
                    return {
                        success: true,
                        creado: false,
                        message: 'Usuario ya registrado',
                        data: { usuario_id, nombre, correo }
                    };
                }
            }
            catch (error) {
                console.error("Error en autenticación:", error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : "Error al procesar la autenticación",
                    data: null,
                    creado: false
                };
            }
        });
    }
    /**
     * Verifica si un usuario existe
     */
    static verificarUsuario(usuario_id) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { existe } = yield (0, Usuario_1.CheckearUsuario)(usuario_id);
                return existe;
            }
            catch (error) {
                console.error("Error al verificar usuario:", error);
                return false;
            }
        });
    }
    /**
     * Crea un nuevo usuario
     */
    static crearUsuario(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { usuario_id, nombre, correo } = data;
                // Validación con Zod
                const resultadoValidarUsuario = usuario_1.UsuarioValidation.RevisarUsuario({
                    id: usuario_id,
                    nombre,
                    correo,
                });
                if (!resultadoValidarUsuario.success) {
                    return {
                        success: false,
                        message: resultadoValidarUsuario.error.issues.map(err => err.message).join(", "),
                        creado: false
                    };
                }
                // Verificar si ya existe
                const existe = yield this.verificarUsuario(usuario_id);
                if (existe) {
                    return {
                        success: false,
                        message: 'El usuario ya existe',
                        creado: false
                    };
                }
                // Crear usuario
                yield (0, Usuario_1.InsertarUsuario)(usuario_id, nombre, correo);
                return {
                    success: true,
                    creado: true,
                    message: 'Usuario creado exitosamente',
                    data: { usuario_id, nombre, correo }
                };
            }
            catch (error) {
                console.error("Error al crear usuario:", error);
                return {
                    success: false,
                    message: error instanceof Error ? error.message : "Error al crear el usuario",
                    data: null,
                    creado: false
                };
            }
        });
    }
}
exports.UsuariosModel = UsuariosModel;
