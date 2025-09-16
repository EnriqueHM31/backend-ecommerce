import { input, io, layers, LayersModel, loadLayersModel, Logs, model, SymbolicTensor, Tensor, tensor2d, train } from '@tensorflow/tfjs';
import fs from "fs";
import type { Compra, DatosEntrenamiento, Prediccion } from '../types/prediccion';

export class SistemaRecomendacion {
    public model: LayersModel | null;
    public productEncoder: Map<string, number>;
    public userEncoder: Map<string, number>;
    public productDecoder: Map<number, string>;
    public userDecoder: Map<number, string>;
    public matrizOriginal: number[][] | null;
    public isInitialized: boolean;
    public maxRating: number;
    public minRating: number;
    public meanRating: number;
    public userBiases: Map<number, number>;
    public itemBiases: Map<number, number>;

    constructor() {
        this.model = null;
        this.productEncoder = new Map();
        this.userEncoder = new Map();
        this.productDecoder = new Map();
        this.userDecoder = new Map();
        this.matrizOriginal = null;
        this.isInitialized = false;
        this.maxRating = 0;
        this.minRating = 0;
        this.meanRating = 0;
        this.userBiases = new Map();
        this.itemBiases = new Map();
    }

    // ==============================
    // 🚀 PREPROCESAMIENTO DE DATOS
    // ==============================
    preprocesarDatos(compras: Compra[]) {
        console.log("📊 Procesando compras...");

        const usuarios = Array.from(new Set(compras.map(c => c.usuario)));
        const productos = Array.from(new Set(compras.map(c => c.producto)));

        this.userEncoder = new Map(usuarios.map((u, i) => [u, i]));
        this.userDecoder = new Map(usuarios.map((u, i) => [i, u]));
        this.productEncoder = new Map(productos.map((p, i) => [p, i]));
        this.productDecoder = new Map(productos.map((p, i) => [i, p]));

        const numUsuarios = usuarios.length;
        const numProductos = productos.length;
        const matriz: number[][] = Array.from({ length: numUsuarios }, () =>
            Array(numProductos).fill(0)
        );

        for (const compra of compras) {
            const userIdx = this.userEncoder.get(compra.usuario)!;
            const prodIdx = this.productEncoder.get(compra.producto)!;
            const cantidad = compra.cantidad || 1;
            matriz[userIdx][prodIdx] = cantidad > 0 ? 1 : 0;
        }

        console.log(`✅ Datos preprocesados: ${numUsuarios} usuarios, ${numProductos} productos`);
        return { matriz, numUsuarios, numProductos };
    }

    // ==============================
    // 🚀 CREAR MODELO MEJORADO
    // ==============================
    async crearModelo(numUsuarios: number, numProductos: number) {
        if (numUsuarios <= 0 || numProductos <= 0) {
            throw new Error("No hay usuarios o productos para crear embeddings");
        }

        console.log("✅ Creando modelo de Matrix Factorization");

        const embeddingDim = 64;
        const userInput = input({ shape: [1], dtype: 'int32' });
        const itemInput = input({ shape: [1], dtype: 'int32' });

        const userEmbedding = layers.embedding({
            inputDim: numUsuarios + 1,
            outputDim: embeddingDim
        }).apply(userInput) as SymbolicTensor;

        const itemEmbedding = layers.embedding({
            inputDim: numProductos + 1,
            outputDim: embeddingDim
        }).apply(itemInput) as SymbolicTensor;

        const userVec = layers.flatten().apply(userEmbedding) as SymbolicTensor;
        const itemVec = layers.flatten().apply(itemEmbedding) as SymbolicTensor;

        const dotProduct = layers.dot({ axes: 1 }).apply([userVec, itemVec]) as SymbolicTensor;
        const output = layers.activation({ activation: 'sigmoid' }).apply(dotProduct) as SymbolicTensor;

        this.model = model({ inputs: [userInput, itemInput], outputs: output });

        this.model.compile({
            optimizer: train.adam(0.001),
            loss: 'binaryCrossentropy',
            metrics: ['accuracy']
        });

        console.log("✅ Modelo creado y compilado correctamente");
    }

    // ==============================
    // 🚀 PREPARAR DATOS DE ENTRENAMIENTO
    // ==============================
    private prepararDatosEntrenamiento(matriz: number[][]): DatosEntrenamiento {
        console.log('🔄 Preparando datos de entrenamiento...');

        const userIds: number[] = [];
        const itemIds: number[] = [];
        const ratings: number[] = [];

        for (let i = 0; i < matriz.length; i++) {
            for (let j = 0; j < matriz[i].length; j++) {
                if (matriz[i][j] > 0) {
                    userIds.push(i);
                    itemIds.push(j);
                    ratings.push(1);
                }
            }
        }

        const numNegativeSamples = Math.floor(userIds.length * 0.1);
        const usedPairs = new Set<string>();

        for (let k = 0; k < numNegativeSamples; k++) {
            let userIdx, itemIdx, attempts = 0;
            do {
                userIdx = Math.floor(Math.random() * matriz.length);
                itemIdx = Math.floor(Math.random() * matriz[0].length);
                attempts++;
            } while (
                matriz[userIdx][itemIdx] > 0 ||
                usedPairs.has(`${userIdx}-${itemIdx}`) ||
                attempts > 100
            );

            if (attempts <= 100) {
                userIds.push(userIdx);
                itemIds.push(itemIdx);
                ratings.push(0);
                usedPairs.add(`${userIdx}-${itemIdx}`);
            }
        }

        console.log(`✅ Datos preparados: ${userIds.length} muestras (${ratings.filter(r => r === 1).length} positivas, ${ratings.filter(r => r === 0).length} negativas)`);

        return {
            userIds: tensor2d(userIds, [userIds.length, 1], 'int32'),
            itemIds: tensor2d(itemIds, [itemIds.length, 1], 'int32'),
            ratings: tensor2d(ratings, [ratings.length, 1], 'float32')
        };
    }

    // ==============================
    // 🚀 ENTRENAR MODELO
    // ==============================
    async entrenar(compras: Compra[], epochs: number = 100): Promise<void> {
        console.log('🚀 Iniciando entrenamiento...');

        try {
            const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);
            this.matrizOriginal = matriz.map(row => [...row]);

            await this.crearModelo(numUsuarios, numProductos);
            await this.guardarMeta();

            const datos = this.prepararDatosEntrenamiento(matriz);
            const epochsAjustados = Math.max(epochs, 50);
            const batchSize = Math.min(64, Math.max(16, Math.floor(datos.userIds.shape[0] / 10)));

            let bestLoss = Infinity;
            let patience = 10;
            let patienceCounter = 0;

            if (this.model) {
                await this.model.fit(
                    [datos.userIds, datos.itemIds],
                    datos.ratings,
                    {
                        epochs: epochsAjustados,
                        batchSize,
                        validationSplit: 0.1,
                        shuffle: true,
                        verbose: 1,
                        callbacks: {
                            onEpochEnd: (_epoch: number, logs?: Logs) => {
                                if (!logs) return;
                                const valLoss = logs.val_loss as number;
                                if (valLoss < bestLoss) { bestLoss = valLoss; patienceCounter = 0; }
                                else { patienceCounter++; }
                                if (patienceCounter >= patience) console.log(`⏹️ Early stopping activado`);
                            },
                            onTrainEnd: () => console.log('🏁 Entrenamiento completado')
                        }
                    }
                );
                await this.guardarModelo();
                await this.guardarMeta();
            }

            datos.userIds.dispose();
            datos.itemIds.dispose();
            datos.ratings.dispose();

            this.isInitialized = true;

            await this.guardarModelo();
            await this.guardarMeta();
            console.log(`✅ Modelo entrenado exitosamente con ${epochsAjustados} épocas`);
            console.log(`📈 Mejor pérdida de validación: ${bestLoss.toFixed(4)}`);
        } catch (err) {
            console.error('❌ Error en entrenamiento:', err);
            throw new Error('Error en entrenamiento: ' + err);
        }
    }

    // ==============================
    // 🚀 GUARDAR MODELO
    // ==============================
    async guardarModelo(ruta: string = "./modelo-entrenado"): Promise<void> {
        if (!this.model) throw new Error("No hay modelo entrenado para guardar");

        const saveHandler: io.IOHandler = {
            async save(modelArtifacts) {
                if (!fs.existsSync(ruta)) fs.mkdirSync(ruta, { recursive: true });

                const { weightData, ...rest } = modelArtifacts;
                fs.writeFileSync(`${ruta}/model.json`, JSON.stringify(rest));
                if (weightData) fs.writeFileSync(`${ruta}/weights.bin`, Buffer.from(weightData as any));

                return { modelArtifactsInfo: { dateSaved: new Date(), modelTopologyType: "JSON" } };
            }
        };

        await this.model.save(saveHandler);
        console.log(`✅ Modelo guardado en ${ruta}`);
    }

    async guardarMeta(ruta: string = "./modelo-entrenado/meta.json") {
        if (!this.matrizOriginal) return;

        const carpeta = ruta.substring(0, ruta.lastIndexOf("/"));
        if (!fs.existsSync(carpeta)) fs.mkdirSync(carpeta, { recursive: true });

        const meta = {
            usuarios: Array.from(this.userEncoder.keys()),
            productos: Array.from(this.productEncoder.keys()),
            matrizOriginal: this.matrizOriginal
        };

        fs.writeFileSync(ruta, JSON.stringify(meta, null, 2), "utf-8");
        console.log(`✅ Meta guardado en ${ruta}`);
    }

    async cargarModelo(ruta: string = "./modelo-entrenado/model.json") {
        const loadHandler: io.IOHandler = {
            async load() {
                const modelJSON = JSON.parse(fs.readFileSync(ruta, "utf-8"));
                const weightData = fs.readFileSync(ruta.replace("model.json", "weights.bin"));
                return { ...modelJSON, weightData: new Uint8Array(weightData).buffer };
            }
        };

        this.model = await loadLayersModel(loadHandler);
        this.isInitialized = true;

        const metaPath = ruta.replace("model.json", "meta.json");
        if (fs.existsSync(metaPath)) {
            const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
            meta.usuarios.forEach((u: string, i: number) => {
                this.userEncoder.set(u, i);
                this.userDecoder.set(i, u);
            });
            meta.productos.forEach((p: string, i: number) => {
                this.productEncoder.set(p, i);
                this.productDecoder.set(i, p);
            });
            this.matrizOriginal = meta.matrizOriginal;
        }
    }

    // ==============================
    // 🚀 PREDICCIÓN (simplificada para ejemplo)
    // ==============================
    async predecir(usuario: string, topK: number = 5): Promise<Prediccion[]> {
        if (!this.isInitialized || !this.model) throw new Error('Modelo no inicializado');

        const userIdx = this.userEncoder.get(usuario);
        if (userIdx === undefined) return [];

        const candidatos = [...Array(this.productEncoder.size).keys()];
        const userBatch = Array(candidatos.length).fill(userIdx);
        const userTensor = tensor2d(userBatch.map(u => [u]), [candidatos.length, 1], 'int32');
        const itemTensor = tensor2d(candidatos.map(i => [i]), [candidatos.length, 1], 'int32');

        const prediccion = this.model.predict([userTensor, itemTensor]) as Tensor;
        const scores = await prediccion.data();

        const resultado: Prediccion[] = candidatos.map((prodIdx, i) => ({
            producto: this.productDecoder.get(prodIdx) || "desconocido",
            score: scores[i]
        }));

        userTensor.dispose();
        itemTensor.dispose();
        prediccion.dispose();

        return resultado.sort((a, b) => b.score - a.score).slice(0, topK);
    }

    // ==============================
    // 🚀 GETTERS
    // ==============================
    get numUsuarios(): number { return this.userEncoder.size; }
    get numProductos(): number { return this.productEncoder.size; }
}
