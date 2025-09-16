#!/usr/bin/env node
"use strict";
/**
 * 🚀 WORKER DE ENTRENAMIENTO EN SEGUNDO PLANO
 *
 * Este script se ejecuta de forma independiente para entrenar el modelo
 * sin bloquear el servidor principal.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.entrenarModelo = entrenarModelo;
exports.getCurrentStatus = getCurrentStatus;
exports.updateStatus = updateStatus;
const Prediccion2_1 = require("../class/Prediccion2");
const fs_1 = __importDefault(require("fs"));
const path = __importStar(require("path"));
// ===============================
// 🚀 CONFIGURACIÓN
// ===============================
const DATA_FILE = path.join(__dirname, '../data/compras.json');
const LOG_FILE = path.join(__dirname, '../../training.log');
const STATUS_FILE = path.join(__dirname, '../../training-status.json');
// ===============================
// 🚀 UTILIDADES DE LOGGING
// ===============================
function log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    // Escribir a archivo de log
    fs_1.default.appendFileSync(LOG_FILE, logMessage + '\n');
}
function updateStatus(status) {
    const currentStatus = getCurrentStatus();
    const newStatus = Object.assign(Object.assign({}, currentStatus), status);
    fs_1.default.writeFileSync(STATUS_FILE, JSON.stringify(newStatus, null, 2));
    log(`Estado actualizado: ${JSON.stringify(status)}`);
}
function getCurrentStatus() {
    if (fs_1.default.existsSync(STATUS_FILE)) {
        try {
            return JSON.parse(fs_1.default.readFileSync(STATUS_FILE, 'utf-8'));
        }
        catch (error) {
            log(`Error al leer estado: ${error}`, 'ERROR');
        }
    }
    return {
        isTraining: false,
        startTime: '',
        progress: 0,
        datasetSize: 0
    };
}
// ===============================
// 🚀 CARGAR DATOS
// ===============================
function cargarDatos() {
    if (!fs_1.default.existsSync(DATA_FILE)) {
        log(`Archivo de datos no encontrado: ${DATA_FILE}`, 'ERROR');
        return [];
    }
    try {
        const data = JSON.parse(fs_1.default.readFileSync(DATA_FILE, 'utf-8'));
        log(`Datos cargados: ${data.length} compras`);
        return data;
    }
    catch (error) {
        log(`Error al cargar datos: ${error}`, 'ERROR');
        return [];
    }
}
// ===============================
// 🚀 ENTRENAMIENTO PRINCIPAL
// ===============================
function entrenarModelo() {
    return __awaiter(this, void 0, void 0, function* () {
        const startTime = new Date().toISOString();
        try {
            // Verificar si ya hay un entrenamiento en curso
            const currentStatus = getCurrentStatus();
            if (currentStatus.isTraining) {
                log('Ya hay un entrenamiento en curso', 'WARN');
                return;
            }
            // Cargar datos
            const compras = cargarDatos();
            if (compras.length === 0) {
                log('No hay datos para entrenar', 'ERROR');
                return;
            }
            // Actualizar estado inicial
            updateStatus({
                isTraining: true,
                startTime,
                progress: 0,
                datasetSize: compras.length,
                error: undefined
            });
            log(`🚀 Iniciando entrenamiento con ${compras.length} compras`);
            // Crear instancia del sistema
            const sistema = new Prediccion2_1.SistemaRecomendacion();
            // Configurar callbacks personalizados para el progreso
            const originalEntrenar = sistema.entrenar.bind(sistema);
            sistema.entrenar = function (compras_1) {
                return __awaiter(this, arguments, void 0, function* (compras, epochs = 100) {
                    log(`Configurando entrenamiento para ${epochs} épocas`);
                    // Preprocesar datos
                    const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);
                    this.matrizOriginal = matriz.map(row => [...row]);
                    // Crear modelo
                    yield this.crearModelo(numUsuarios, numProductos);
                    yield this.guardarMeta();
                    const datos = this.prepararDatosEntrenamiento(matriz);
                    const epochsAjustados = Math.max(epochs, 50);
                    const batchSize = Math.min(64, Math.max(16, Math.floor(datos.userIds.shape[0] / 10)));
                    updateStatus({
                        totalEpochs: epochsAjustados,
                        currentEpoch: 0
                    });
                    if (this.model) {
                        yield this.model.fit([datos.userIds, datos.itemIds], datos.ratings, {
                            epochs: epochsAjustados,
                            batchSize: batchSize,
                            validationSplit: 0.1,
                            shuffle: true,
                            verbose: 0, // Reducir verbosidad
                            callbacks: {
                                onEpochEnd: (epoch, logs) => {
                                    const progress = Math.round(((epoch + 1) / epochsAjustados) * 100);
                                    const loss = (logs === null || logs === void 0 ? void 0 : logs.loss) || 0;
                                    const valLoss = (logs === null || logs === void 0 ? void 0 : logs.val_loss) || 0;
                                    updateStatus({
                                        currentEpoch: epoch + 1,
                                        progress,
                                        loss: valLoss
                                    });
                                    if (epoch % 10 === 0 || epoch === epochsAjustados - 1) {
                                        log(`Época ${epoch + 1}/${epochsAjustados} - Progreso: ${progress}% - Loss: ${loss.toFixed(4)} - Val Loss: ${valLoss.toFixed(4)}`);
                                    }
                                }
                            }
                        });
                    }
                    // Limpiar memoria
                    datos.userIds.dispose();
                    datos.itemIds.dispose();
                    datos.ratings.dispose();
                    this.isInitialized = true;
                    log(`✅ Entrenamiento completado exitosamente`);
                });
            };
            originalEntrenar.bind(sistema);
            // Ejecutar entrenamiento
            yield sistema.entrenar(compras, 100);
            // Actualizar estado final
            updateStatus({
                isTraining: false,
                endTime: new Date().toISOString(),
                progress: 100
            });
            log(`🎉 Entrenamiento completado exitosamente`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            log(`❌ Error durante el entrenamiento: ${errorMessage}`, 'ERROR');
            updateStatus({
                isTraining: false,
                endTime: new Date().toISOString(),
                error: errorMessage
            });
            process.exit(1);
        }
    });
}
// ===============================
// 🚀 MANEJO DE SEÑALES
// ===============================
process.on('SIGINT', () => {
    log('Recibida señal SIGINT, deteniendo entrenamiento...', 'WARN');
    updateStatus({
        isTraining: false,
        endTime: new Date().toISOString(),
        error: 'Entrenamiento interrumpido por el usuario'
    });
    process.exit(0);
});
process.on('SIGTERM', () => {
    log('Recibida señal SIGTERM, deteniendo entrenamiento...', 'WARN');
    updateStatus({
        isTraining: false,
        endTime: new Date().toISOString(),
        error: 'Entrenamiento terminado por el sistema'
    });
    process.exit(0);
});
// ===============================
// 🚀 EJECUCIÓN PRINCIPAL
// ===============================
if (require.main === module) {
    log('🚀 Iniciando worker de entrenamiento...');
    entrenarModelo()
        .then(() => {
        log('✅ Worker completado exitosamente');
        process.exit(0);
    })
        .catch((error) => {
        log(`❌ Error fatal en worker: ${error}`, 'ERROR');
        process.exit(1);
    });
}
