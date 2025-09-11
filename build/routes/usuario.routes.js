"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsuarioRouter = void 0;
const autenticacion_1 = require("../controllers/autenticacion");
const express_1 = require("express");
exports.UsuarioRouter = (0, express_1.Router)();
exports.UsuarioRouter.post("/auth", autenticacion_1.AutenticacionController.Auth);
