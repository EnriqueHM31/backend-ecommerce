"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrediccionRouter = void 0;
const express_1 = require("express");
const prediccion_1 = require("../controllers/prediccion");
exports.PrediccionRouter = (0, express_1.Router)();
// Endpoints principales
exports.PrediccionRouter.post('/prediccion', prediccion_1.PrediccionController.prediccion);
exports.PrediccionRouter.get('/prediccion/info', prediccion_1.PrediccionController.info);
exports.PrediccionRouter.post('/prediccion/populares', prediccion_1.PrediccionController.populares);
// Endpoints de entrenamiento
exports.PrediccionRouter.post('/prediccion/entrenar', prediccion_1.PrediccionController.entrenar); // Síncrono
exports.PrediccionRouter.post('/prediccion/entrenar-async', prediccion_1.PrediccionController.entrenarAsync); // Asíncrono
// Endpoints de gestión de entrenamiento
exports.PrediccionRouter.get('/prediccion/estado', prediccion_1.PrediccionController.estadoEntrenamiento); // Estado general
exports.PrediccionRouter.get('/prediccion/estado/:jobId', prediccion_1.PrediccionController.estadoEntrenamiento); // Estado específico
exports.PrediccionRouter.delete('/prediccion/cancelar/:jobId', prediccion_1.PrediccionController.cancelarEntrenamiento); // Cancelar
