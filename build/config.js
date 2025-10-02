"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIRECCION_PAYMENT = exports.SUPABASE_ANON_KEY = exports.SUPABASE_URL = exports.TIPO_SERVICIO_MESSAGE = exports.NOMBRE_COOKIE = exports.NODE_ENV = exports.USUARIO_ID = exports.API_URL = exports.SECRET = exports.PASS_GMAIL = exports.DESTINATARIO = exports.REMITENTE = exports.PORT = void 0;
exports.PORT = process.env.PORT || 3000;
exports.REMITENTE = process.env.REMITENTE;
exports.DESTINATARIO = process.env.DESTINATARIO;
exports.PASS_GMAIL = process.env.PASS_GMAIL;
exports.SECRET = process.env.SECRET;
exports.API_URL = process.env.API_URL;
exports.USUARIO_ID = process.env.USUARIO_ID;
exports.NODE_ENV = process.env.NODE_ENV;
exports.NOMBRE_COOKIE = 'token';
exports.TIPO_SERVICIO_MESSAGE = "gmail";
// DATABASE
exports.SUPABASE_URL = process.env.SUPABASE_URL;
exports.SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
exports.DIRECCION_PAYMENT = process.env.DIRECCION_PAYMENT;
