"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MensajeCorreo = void 0;
const config_1 = require("../../config");
const MensajeCorreo = ({ nombre, correo, mensaje }) => {
    return {
        from: config_1.REMITENTE,
        to: config_1.DESTINATARIO,
        subject: 'Nuevo comentario de un cliente en StoreTecBPL',
        text: mensaje,
        html: `
        <div style="background-color: #0d1117; color: #ffffff; font-family: Arial, sans-serif; padding: 24px; border-radius: 10px; max-width: 600px; margin: auto;">
            
            <h1 style="font-size: 22px; margin-bottom: 20px; text-align: center; color: #4da6ff;">Nuevo comentario recibido</h1>
            
            <p style="font-size: 16px; margin: 10px 0;">
                <strong>Nombre del cliente:</strong> ${nombre}
            </p>
            
            <p style="font-size: 16px; margin: 10px 0;">
                <strong>Correo electrónico:</strong> <a href="mailto:${correo}" style="color: #4da6ff; text-decoration: none;">${correo}</a>
            </p>

            <div style="background-color: #1c1f26; padding: 16px; border-left: 4px solid #4da6ff; border-radius: 8px; margin-top: 20px;">
                <p style="font-size: 16px; margin: 0;"><strong>Comentario:</strong></p>
                <p style="margin-top: 8px;">${mensaje}</p>
            </div>

            <!-- Footer -->
            <div style="text-align: center; margin-top: 30px; font-size: 14px; color: #888;">
                <p>Gracias por confiar en StoreTecBPL</p>
                <div style="margin-top: 10px;">
                    <a href="https://facebook.com" style="margin: 0 5px; text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/24/733/733547.png" alt="Facebook"></a>
                    <a href="https://twitter.com" style="margin: 0 5px; text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/24/733/733579.png" alt="Twitter"></a>
                    <a href="https://instagram.com" style="margin: 0 5px; text-decoration: none;"><img src="https://cdn-icons-png.flaticon.com/24/733/733558.png" alt="Instagram"></a>
                </div>
                <p style="margin-top: 10px;">&copy; ${new Date().getFullYear()} StoreTecBPL. Todos los derechos reservados.</p>
            </div>
        </div>
        `
    };
};
exports.MensajeCorreo = MensajeCorreo;
