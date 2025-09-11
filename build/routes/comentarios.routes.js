"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ComentariosRouter = void 0;
const express_1 = require("express");
const comentarios_1 = require("../controllers/comentarios");
exports.ComentariosRouter = (0, express_1.Router)();
exports.ComentariosRouter.post("/enviar-mensaje", comentarios_1.ComentariosController.EnviarMensaje);
