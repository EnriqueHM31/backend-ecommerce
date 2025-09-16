import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';

interface TrainingJob {
    id: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    startTime?: string;
    endTime?: string;
    progress: number;
    error?: string;
    datasetSize: number;
}

class TrainingQueue {
    private jobs: Map<string, TrainingJob> = new Map();
    private currentJob: ChildProcess | null = null;
    private isProcessing = false;

    // ===============================
    // 🚀 AGREGAR TRABAJO A LA COLA
    // ===============================
    async addJob(datasetSize: number): Promise<string> {
        const jobId = `training_${Date.now()}`;

        const job: TrainingJob = {
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
    }

    // ===============================
    // 🚀 PROCESAR COLA
    // ===============================
    private async processQueue() {
        if (this.isProcessing) return;

        this.isProcessing = true;

        while (this.jobs.size > 0) {
            const nextJob = Array.from(this.jobs.values())
                .find(job => job.status === 'pending');

            if (!nextJob) break;

            await this.executeJob(nextJob);
        }

        this.isProcessing = false;
    }

    // ===============================
    // 🚀 EJECUTAR TRABAJO
    // ===============================
    private async executeJob(job: TrainingJob): Promise<void> {
        return new Promise((resolve, reject) => {
            console.log(`🚀 Ejecutando trabajo: ${job.id}`);

            // Actualizar estado
            job.status = 'running';
            job.startTime = new Date().toISOString();

            // Ruta al script de entrenamiento
            const trainerScript = path.join(__dirname, '../workers/trainer.ts');

            // Ejecutar worker
            this.currentJob = spawn('npx', ['ts-node', trainerScript], {
                stdio: ['pipe', 'pipe', 'pipe'],
                cwd: path.join(__dirname, '../..')
            });

            // Manejar salida
            this.currentJob.stdout?.on('data', (data) => {
                const output = data.toString();
                console.log(`[${job.id}] ${output}`);

                // Parsear progreso si está disponible
                this.parseProgress(output, job);
            });

            this.currentJob.stderr?.on('data', (data) => {
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
                } else {
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
    }

    // ===============================
    // 🚀 PARSEAR PROGRESO
    // ===============================
    private parseProgress(output: string, job: TrainingJob) {
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
    getJobStatus(jobId: string): TrainingJob | null {
        return this.jobs.get(jobId) || null;
    }

    // ===============================
    // 🚀 OBTENER TODOS LOS TRABAJOS
    // ===============================
    getAllJobs(): TrainingJob[] {
        return Array.from(this.jobs.values());
    }

    // ===============================
    // 🚀 CANCELAR TRABAJO
    // ===============================
    cancelJob(jobId: string): boolean {
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
    cleanupOldJobs(maxAge: number = 24 * 60 * 60 * 1000) { // 24 horas por defecto
        const now = Date.now();
        const jobsToDelete: string[] = [];

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
export const trainingQueue = new TrainingQueue();

// Limpiar trabajos antiguos cada hora
setInterval(() => {
    trainingQueue.cleanupOldJobs();
}, 60 * 60 * 1000);
