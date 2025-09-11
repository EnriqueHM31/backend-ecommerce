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
exports.ModeloContacto = void 0;
const mensaje_1 = require("../utils/contacto/mensaje");
const contacto_1 = require("../utils/contacto/contacto");
class ModeloContacto {
    static EnviarMensaje(_a) {
        return __awaiter(this, arguments, void 0, function* ({ nombre, correo, mensaje }) {
            const mailOptions = (0, mensaje_1.MensajeCorreo)({ nombre, correo, mensaje });
            try {
                const info = yield contacto_1.transporter.sendMail(mailOptions);
                if (!info.accepted)
                    throw new Error('Error enviando el mensaje');
                return { success: true, message: 'Mensaje enviado correctamente', comentario: mailOptions };
            }
            catch (error) {
                return { success: false, message: error || 'Error enviando el mensaje', comentario: {} };
            }
        });
    }
}
exports.ModeloContacto = ModeloContacto;
