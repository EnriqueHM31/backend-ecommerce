import { MensajeCorreo } from '../utils/contacto/mensaje';
import { transporter } from '../utils/contacto/contacto';

interface ComentarioResponseProps {
    nombre: string;
    correo: string;
    mensaje: string;

}
export class ModeloContacto {

    static async EnviarMensaje({ nombre, correo, mensaje }: ComentarioResponseProps) {

        const mailOptions = MensajeCorreo({ nombre, correo, mensaje });
        try {
            const info = await transporter.sendMail(mailOptions);

            if (!info.accepted) throw new Error('Error enviando el mensaje');

            return { success: true, message: 'Mensaje enviado correctamente', comentario: mailOptions };

        }
        catch (error) {
            return { success: false, message: error || 'Error enviando el mensaje', comentario: {} };
        }

    }

}