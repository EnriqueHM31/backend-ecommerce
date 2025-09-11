"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transporter = void 0;
const nodemailer_1 = __importDefault(require("nodemailer"));
const config_1 = require("../../config");
exports.transporter = nodemailer_1.default.createTransport({
    service: config_1.TIPO_SERVICIO_MESSAGE,
    auth: {
        user: config_1.REMITENTE,
        pass: config_1.PASS_GMAIL,
    },
});
