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
exports.AutenticacionController = void 0;
const Usuario_1 = require("../utils/consultas/Usuario");
const usuario_1 = require("../utils/validaciones/usuario");
class AutenticacionController {
    static Auth(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const { usuario_id, nombre, correo, avatar } = req.body;
                // Validación con Zod
                const resultadoValidarUsuario = usuario_1.UsuarioValidation.RevisarUsuario({ usuario_id, nombre, correo, avatar });
                if (!resultadoValidarUsuario.success) {
                    res.status(400).json({
                        creado: false,
                        success: false,
                        message: resultadoValidarUsuario.error.issues.map(err => err.message).join(", ")
                    });
                }
                // Revisar si ya existe el usuario
                const { existe } = yield (0, Usuario_1.CheckearUsuario)(usuario_id);
                if (!existe) {
                    console.log('Creando usuario...');
                    yield (0, Usuario_1.InsertarUsuario)(usuario_id, nombre, correo, avatar);
                    res.status(203).json({
                        success: true,
                        creado: true,
                        message: 'Registro exitoso',
                        data: { usuario_id, nombre, correo, avatar }
                    });
                }
                else {
                    res.status(203).json({
                        success: true,
                        creado: false,
                        message: 'Usuario ya registrado',
                        data: { usuario_id, nombre, correo, avatar }
                    });
                }
            }
            catch (error) {
                console.error("Error en /auth:", error);
                res.status(500).json({
                    success: false,
                    message: error instanceof Error ? error.message : "Error al procesar la autenticación",
                    data: null,
                    creado: false
                });
            }
        });
    }
}
exports.AutenticacionController = AutenticacionController;
