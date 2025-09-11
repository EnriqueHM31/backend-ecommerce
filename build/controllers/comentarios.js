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
exports.ComentariosController = void 0;
const comentarios_1 = require("../utils/validaciones/comentarios");
const comentarios_2 = require("../models/comentarios");
class ComentariosController {
    static EnviarMensaje(req, res) {
        return __awaiter(this, void 0, void 0, function* () {
            const resultDataComentario = (0, comentarios_1.validarComentario)(req.body);
            if (!resultDataComentario.success) {
                res.status(400).json({ success: false, message: JSON.parse(resultDataComentario.error.message) });
                return;
            }
            const DataComentario = resultDataComentario.data;
            const { success, message, comentario } = yield comentarios_2.ModeloContacto.EnviarMensaje(DataComentario);
            if (success) {
                res.status(200).json({ success, message, comentario });
            }
            else {
                res.status(500).json({ success, message, comentario: {} });
            }
        });
    }
}
exports.ComentariosController = ComentariosController;
