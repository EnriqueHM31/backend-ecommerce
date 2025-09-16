"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.trainingQueue = void 0;
const child_process_1 = require("child_process");
const path = __importStar(require("path"));
class TrainingQueue {
    constructor() {
        this.jobs = new Map();
        this.currentJob = null;
        this.isProcessing = false;
    }
    // ===============================
    // 🚀 AGREGAR TRABAJO A LA COLA
    // ===============================
    addJob(datasetSize) {
        return __awaiter(this, void 0, void 0, function* () {
            const jobId = `training_${Date.now()}`;
            const job = {
                id: jobId,
                status: 'pending',
                progress: 0,
                datasetSize
            };
            this.jobs.set(jobId, job);
            console.log(`📋 Trabajo agregado a la cola: ${jobId}`);
            // Procesar cola si no está en proceso
            if (!this.isProcessing) {
                this.processQueue();
            }
            return jobId;
        });
    }
    // ===============================
    // 🚀 PROCESAR COLA
    // ===============================
    processQueue() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isProcessing)
                return;
            this.isProcessing = true;
            while (this.jobs.size > 0) {
                const nextJob = Array.from(this.jobs.values())
                    .find(job => job.status === 'pending');
                if (!nextJob)
                    break;
                yield this.executeJob(nextJob);
            }
            this.isProcessing = false;
        });
    }
    // ===============================
    // 🚀 EJECUTAR TRABAJO
    // ===============================
    executeJob(job) {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                var _a, _b;
                console.log(`🚀 Ejecutando trabajo: ${job.id}`);
                // Actualizar estado
                job.status = 'running';
                job.startTime = new Date().toISOString();
                // Ruta al script de entrenamiento
                const trainerScript = path.join(__dirname, '../workers/trainer.ts');
                // Ejecutar worker
                this.currentJob = (0, child_process_1.spawn)('npx', ['ts-node', trainerScript], {
                    stdio: ['pipe', 'pipe', 'pipe'],
                    cwd: path.join(__dirname, '../..')
                });
                // Manejar salida
                (_a = this.currentJob.stdout) === null || _a === void 0 ? void 0 : _a.on('data', (data) => {
                    const output = data.toString();
                    console.log(`[${job.id}] ${output}`);
                    // Parsear progreso si está disponible
                    this.parseProgress(output, job);
                });
                (_b = this.currentJob.stderr) === null || _b === void 0 ? void 0 : _b.on('data', (data) => {
                    const error = data.toString();
                    console.error(`[${job.id}] ERROR: ${error}`);
                    job.error = error;
                });
                // Manejar finalización
                this.currentJob.on('close', (code) => {
                    this.currentJob = null;
                    if (code === 0) {
                        job.status = 'completed';
                        job.progress = 100;
                        console.log(`✅ Trabajo completado: ${job.id}`);
                    }
                    else {
                        job.status = 'failed';
                        job.error = `Proceso terminado con código ${code}`;
                        console.error(`❌ Trabajo falló: ${job.id}`);
                    }
                    job.endTime = new Date().toISOString();
                    resolve();
                });
                this.currentJob.on('error', (error) => {
                    this.currentJob = null;
                    job.status = 'failed';
                    job.error = error.message;
                    job.endTime = new Date().toISOString();
                    console.error(`❌ Error en trabajo ${job.id}:`, error);
                    reject(error);
                });
            });
        });
    }
    // ===============================
    // 🚀 PARSEAR PROGRESO
    // ===============================
    parseProgress(output, job) {
        // Buscar patrones de progreso en la salida
        const progressMatch = output.match(/Progreso: (\d+)%/);
        if (progressMatch) {
            job.progress = parseInt(progressMatch[1]);
        }
        const epochMatch = output.match(/Época (\d+)\/(\d+)/);
        if (epochMatch) {
            const current = parseInt(epochMatch[1]);
            const total = parseInt(epochMatch[2]);
            job.progress = Math.round((current / total) * 100);
        }
    }
    // ===============================
    // 🚀 OBTENER ESTADO DE TRABAJO
    // ===============================
    getJobStatus(jobId) {
        return this.jobs.get(jobId) || null;
    }
    // ===============================
    // 🚀 OBTENER TODOS LOS TRABAJOS
    // ===============================
    getAllJobs() {
        return Array.from(this.jobs.values());
    }
    // ===============================
    // 🚀 CANCELAR TRABAJO
    // ===============================
    cancelJob(jobId) {
        const job = this.jobs.get(jobId);
        if (!job || job.status !== 'running') {
            return false;
        }
        if (this.currentJob) {
            this.currentJob.kill('SIGTERM');
            this.currentJob = null;
        }
        job.status = 'failed';
        job.error = 'Cancelado por el usuario';
        job.endTime = new Date().toISOString();
        console.log(`🛑 Trabajo cancelado: ${jobId}`);
        return true;
    }
    // ===============================
    // 🚀 LIMPIAR TRABAJOS ANTIGUOS
    // ===============================
    cleanupOldJobs(maxAge = 24 * 60 * 60 * 1000) {
        const now = Date.now();
        const jobsToDelete = [];
        for (const [jobId, job] of this.jobs) {
            if (job.endTime) {
                const jobTime = new Date(job.endTime).getTime();
                if (now - jobTime > maxAge) {
                    jobsToDelete.push(jobId);
                }
            }
        }
        jobsToDelete.forEach(jobId => {
            this.jobs.delete(jobId);
            console.log(`🧹 Trabajo antiguo eliminado: ${jobId}`);
        });
    }
    // ===============================
    // 🚀 OBTENER ESTADO GENERAL
    // ===============================
    getQueueStatus() {
        const jobs = Array.from(this.jobs.values());
        const pending = jobs.filter(j => j.status === 'pending').length;
        const running = jobs.filter(j => j.status === 'running').length;
        const completed = jobs.filter(j => j.status === 'completed').length;
        const failed = jobs.filter(j => j.status === 'failed').length;
        return {
            total: jobs.length,
            pending,
            running,
            completed,
            failed,
            isProcessing: this.isProcessing
        };
    }
}
// Instancia singleton
exports.trainingQueue = new TrainingQueue();
// Limpiar trabajos antiguos cada hora
setInterval(() => {
    exports.trainingQueue.cleanupOldJobs();
}, 60 * 60 * 1000);
