"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const tecnicos_1 = require("../controllers/tecnicos");
const RouterTecnicos = (0, express_1.Router)();
RouterTecnicos.get('/', tecnicos_1.TecnicosController.obtenerTecnicos);
exports.default = RouterTecnicos;
