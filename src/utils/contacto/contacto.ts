import nodemailer from 'nodemailer';
import { REMITENTE, PASS_GMAIL, TIPO_SERVICIO_MESSAGE } from '../../config';

export const transporter = nodemailer.createTransport({
    service: TIPO_SERVICIO_MESSAGE,
    auth: {
        user: REMITENTE,
        pass: PASS_GMAIL,
    },
});