#!/usr/bin/env node

/**
 * 🚀 WORKER DE ENTRENAMIENTO EN SEGUNDO PLANO
 * 
 * Este script se ejecuta de forma independiente para entrenar el modelo
 * sin bloquear el servidor principal.
 */

import { SistemaRecomendacion } from '../class/Prediccion';
import fs from 'fs';
import * as path from 'path';
import type { Compra } from '../types/prediccion';

// ===============================
// 🚀 CONFIGURACIÓN
// ===============================
const DATA_FILE = path.join(__dirname, '../data/compras.json');
const LOG_FILE = path.join(__dirname, '../../training.log');
const STATUS_FILE = path.join(__dirname, '../../training-status.json');

interface TrainingStatus {
    isTraining: boolean;
    startTime: string;
    endTime?: string;
    progress: number;
    currentEpoch?: number;
    totalEpochs?: number;
    loss?: number;
    error?: string;
    datasetSize: number;
}

// ===============================
// 🚀 UTILIDADES DE LOGGING
// ===============================
function log(message: string, level: 'INFO' | 'WARN' | 'ERROR' = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;

    console.log(logMessage);

    // Escribir a archivo de log
    fs.appendFileSync(LOG_FILE, logMessage + '\n');
}

function updateStatus(status: Partial<TrainingStatus>) {
    const currentStatus = getCurrentStatus();
    const newStatus = { ...currentStatus, ...status };

    fs.writeFileSync(STATUS_FILE, JSON.stringify(newStatus, null, 2));
    log(`Estado actualizado: ${JSON.stringify(status)}`);
}

function getCurrentStatus(): TrainingStatus {
    if (fs.existsSync(STATUS_FILE)) {
        try {
            return JSON.parse(fs.readFileSync(STATUS_FILE, 'utf-8'));
        } catch (error) {
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
function cargarDatos(): Compra[] {
    if (!fs.existsSync(DATA_FILE)) {
        log(`Archivo de datos no encontrado: ${DATA_FILE}`, 'ERROR');
        return [];
    }

    try {
        const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
        log(`Datos cargados: ${data.length} compras`);
        return data;
    } catch (error) {
        log(`Error al cargar datos: ${error}`, 'ERROR');
        return [];
    }
}

// ===============================
// 🚀 ENTRENAMIENTO PRINCIPAL
// ===============================
async function entrenarModelo() {
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
        const sistema = new SistemaRecomendacion();

        // Configurar callbacks personalizados para el progreso
        const originalEntrenar = sistema.entrenar.bind(sistema);
        sistema.entrenar = async function (compras: Compra[], epochs: number = 100) {
            log(`Configurando entrenamiento para ${epochs} épocas`);

            // Preprocesar datos
            const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);
            this.matrizOriginal = matriz.map(row => [...row]);

            // Crear modelo
            await this.crearModelo(numUsuarios, numProductos);
            await this.guardarMeta();

            const datos = this.prepararDatosEntrenamiento(matriz);
            const epochsAjustados = Math.max(epochs, 50);
            const batchSize = Math.min(64, Math.max(16, Math.floor(datos.userIds.shape[0] / 10)));

            updateStatus({
                totalEpochs: epochsAjustados,
                currentEpoch: 0
            });

            if (this.model) {
                await this.model.fit(
                    [datos.userIds, datos.itemIds],
                    datos.ratings,
                    {
                        epochs: epochsAjustados,
                        batchSize: batchSize,
                        validationSplit: 0.1,
                        shuffle: true,
                        verbose: 0, // Reducir verbosidad
                        callbacks: {
                            onEpochEnd: (epoch: number, logs?: any) => {
                                const progress = Math.round(((epoch + 1) / epochsAjustados) * 100);
                                const loss = logs?.loss || 0;
                                const valLoss = logs?.val_loss || 0;

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
                    }
                );
            }

            // Limpiar memoria
            datos.userIds.dispose();
            datos.itemIds.dispose();
            datos.ratings.dispose();

            this.isInitialized = true;
            log(`✅ Entrenamiento completado exitosamente`);
        };
        originalEntrenar.bind(sistema);

        // Ejecutar entrenamiento
        await sistema.entrenar(compras, 100);

        // Actualizar estado final
        updateStatus({
            isTraining: false,
            endTime: new Date().toISOString(),
            progress: 100
        });

        log(`🎉 Entrenamiento completado exitosamente`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        log(`❌ Error durante el entrenamiento: ${errorMessage}`, 'ERROR');

        updateStatus({
            isTraining: false,
            endTime: new Date().toISOString(),
            error: errorMessage
        });

        process.exit(1);
    }
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

export { entrenarModelo, getCurrentStatus, updateStatus };
