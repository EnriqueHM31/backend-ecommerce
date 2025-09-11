"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrediccionRouter = void 0;
const express_1 = require("express");
const prediccion_1 = require("../controllers/prediccion");
exports.PrediccionRouter = (0, express_1.Router)();
// Endpoints
exports.PrediccionRouter.post('/prediccion', prediccion_1.PrediccionController.prediccion);
exports.PrediccionRouter.get('/prediccion/info', prediccion_1.PrediccionController.info);
exports.PrediccionRouter.post('/prediccion/entrenar', prediccion_1.PrediccionController.entrenar);
