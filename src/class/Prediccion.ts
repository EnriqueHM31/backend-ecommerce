import { input, io, layers, LayersModel, loadLayersModel, Logs, model, SymbolicTensor, Tensor, tensor2d, train } from '@tensorflow/tfjs';
import * as fs from "fs";
import type { Compra, DatosEntrenamiento, DatosPreprocessed, Prediccion } from '../types/prediccion';

export class SistemaRecomendacion {
    private model: LayersModel | null;
    private productEncoder: Map<string, number>;
    private userEncoder: Map<string, number>;
    private productDecoder: Map<number, string>;
    private userDecoder: Map<number, string>;
    private matrizOriginal: number[][] | null;
    public isInitialized: boolean;

    constructor() {
        this.model = null;
        this.productEncoder = new Map();
        this.userEncoder = new Map();
        this.productDecoder = new Map();
        this.userDecoder = new Map();
        this.matrizOriginal = null;
        this.isInitialized = false;
    }

    // ==============================
    // 🚀 PREPROCESAMIENTO DE DATOS
    // ==============================
    preprocesarDatos(compras: Compra[]): DatosPreprocessed {
        const usuarios: string[] = [...new Set(compras.map(c => c.usuario))];
        const productos: string[] = [...new Set(compras.map(c => c.producto))];

        usuarios.forEach((usuario, idx) => {
            this.userEncoder.set(usuario, idx);
            this.userDecoder.set(idx, usuario);
        });

        productos.forEach((producto, idx) => {
            this.productEncoder.set(producto, idx);
            this.productDecoder.set(idx, producto);
        });

        const numUsuarios = usuarios.length;
        const numProductos = productos.length;
        const matriz: number[][] = Array(numUsuarios).fill(null).map(() => Array(numProductos).fill(0));

        compras.forEach(compra => {
            const userIdx = this.userEncoder.get(compra.usuario);
            const prodIdx = this.productEncoder.get(compra.producto);
            if (userIdx !== undefined && prodIdx !== undefined) {
                matriz[userIdx][prodIdx] = compra.cantidad || (compra as any).rating || 1;
            }
        });

        return { matriz, numUsuarios, numProductos };
    }

    // ==============================
    // 🚀 CREAR MODELO
    // ==============================
    async crearModelo(numUsuarios: number, numProductos: number, embedding_dim: number = 50): Promise<LayersModel> {
        if (this.model) {
            console.log("⚠️ El modelo ya existe, no se recrea.");
            return this.model;
        }

        const userInput = input({ shape: [1], name: 'user_input' });
        const userEmbedding = layers.embedding({
            inputDim: numUsuarios,
            outputDim: embedding_dim,
            name: 'user_embedding'
        }).apply(userInput) as SymbolicTensor;
        const userVec = layers.flatten().apply(userEmbedding) as SymbolicTensor;

        const itemInput = input({ shape: [1], name: 'item_input' });
        const itemEmbedding = layers.embedding({
            inputDim: numProductos,
            outputDim: embedding_dim,
            name: 'item_embedding'
        }).apply(itemInput) as SymbolicTensor;
        const itemVec = layers.flatten().apply(itemEmbedding) as SymbolicTensor;

        const dotProduct = layers.dot({ axes: 1 }).apply([userVec, itemVec]) as SymbolicTensor;

        const output = layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'output'
        }).apply(dotProduct) as SymbolicTensor;

        this.model = model({ inputs: [userInput, itemInput], outputs: output });

        this.model.compile({
            optimizer: train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });
        this.guardarModelo();

        return this.model;
    }

    // ==============================
    // 🚀 PREPARAR DATOS ENTRENAMIENTO
    // ==============================
    prepararDatosEntrenamiento(matriz: number[][]): DatosEntrenamiento {
        const userIds: number[] = [];
        const itemIds: number[] = [];
        const ratings: number[] = [];

        for (let i = 0; i < matriz.length; i++) {
            for (let j = 0; j < matriz[i].length; j++) {
                if (matriz[i][j] > 0) {
                    userIds.push(i);
                    itemIds.push(j);
                    ratings.push(matriz[i][j]);
                }
                if (matriz[i][j] === 0 && Math.random() < 0.1) {
                    userIds.push(i);
                    itemIds.push(j);
                    ratings.push(0);
                }
            }
        }

        const maxRating = Math.max(...ratings);
        const normalizedRatings = ratings.map(r => maxRating > 0 ? r / maxRating : 0);

        return {
            userIds: tensor2d(userIds, [userIds.length, 1], 'int32'),
            itemIds: tensor2d(itemIds, [itemIds.length, 1], 'int32'),
            ratings: tensor2d(normalizedRatings, [normalizedRatings.length, 1])
        };
    }

    // ==============================
    // 🚀 ENTRENAR MODELO
    // ==============================
    async entrenar(compras: Compra[], epochs: number = 50, ruta: string = "./modelo-entrenado/model.json"): Promise<void> {
        console.log('Iniciando entrenamiento...');

        if (this.isInitialized && this.model) {
            console.log("⚠️ El modelo ya está inicializado, no se vuelve a entrenar.");
            return;
        }

        if (fs.existsSync(ruta)) {
            console.log("📂 Se encontró modelo guardado, cargando...");
            await this.cargarModelo(ruta);
            return;
        }

        try {
            const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);
            this.matrizOriginal = matriz.map(row => [...row]);

            await this.crearModelo(numUsuarios, numProductos);

            const datos = this.prepararDatosEntrenamiento(matriz);
            const epochsAjustados = Math.max(epochs, 50);

            if (this.model) {
                await this.model.fit(
                    [datos.userIds, datos.itemIds],
                    datos.ratings,
                    {
                        epochs: epochsAjustados,
                        batchSize: Math.min(32, datos.userIds.shape[0]),
                        validationSplit: 0.1,
                        verbose: 1,
                        callbacks: {
                            onEpochEnd: (epoch: number, logs?: Logs) => {
                                if (logs?.loss && epoch % 10 === 0) {
                                    console.log(`Época ${epoch + 1}/${epochsAjustados}: pérdida = ${logs.loss.toFixed(4)}`);
                                }
                            }
                        }
                    }
                );
            }

            datos.userIds.dispose();
            datos.itemIds.dispose();
            datos.ratings.dispose();

            this.isInitialized = true;
            console.log(`✅ Modelo entrenado con ${epochsAjustados} épocas`);
        } catch (err) {
            throw new Error('Error en entrenamiento: ' + err);
        }
    }

    // ==============================
    // 🚀 GUARDAR Y CARGAR MODELO
    // ==============================
    async guardarModelo(ruta: string = "./modelo-entrenado"): Promise<void> {
        if (!this.model) throw new Error("No hay modelo entrenado para guardar");

        const saveHandler: io.IOHandler = {
            async save(modelArtifacts) {
                if (!fs.existsSync(ruta)) fs.mkdirSync(ruta, { recursive: true });

                const { weightData, ...rest } = modelArtifacts;
                fs.writeFileSync(`${ruta}/model.json`, JSON.stringify(rest));

                if (weightData) {
                    fs.writeFileSync(`${ruta}/weights.bin`, Buffer.from(weightData as any));
                }

                return {
                    modelArtifactsInfo: {
                        dateSaved: new Date(),
                        modelTopologyType: "JSON"
                    }
                };
            }
        };

        await this.model.save(saveHandler);
        console.log(`✅ Modelo guardado en ${ruta}`);
    }

    async cargarModelo(ruta: string = "./modelo-entrenado/model.json"): Promise<void> {
        const loadHandler: io.IOHandler = {
            async load() {
                const modelJSON = JSON.parse(fs.readFileSync(ruta, "utf-8"));
                const weightData = fs.readFileSync(ruta.replace("model.json", "weights.bin"));

                return { ...modelJSON, weightData: new Uint8Array(weightData).buffer };
            }
        };

        this.model = await loadLayersModel(loadHandler);
        this.isInitialized = true;
        console.log(`✅ Modelo cargado desde ${ruta}`);
    }

    // ==============================
    // 🚀 Fallback de populares
    // ==============================
    private obtenerPopulares(topK: number): Prediccion[] {
        if (!this.matrizOriginal) return [];

        const conteo: Map<number, number> = new Map();

        for (let i = 0; i < this.matrizOriginal.length; i++) {
            for (let j = 0; j < this.matrizOriginal[i].length; j++) {
                if (this.matrizOriginal[i][j] > 0) {
                    conteo.set(j, (conteo.get(j) || 0) + this.matrizOriginal[i][j]);
                }
            }
        }

        return [...conteo.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, topK)
            .map(([prodIdx, score]) => ({
                producto: this.productDecoder.get(prodIdx) || "desconocido",
                score
            }));
    }

    // ==============================
    // 🚀 PREDICCIÓN
    // ==============================
    async predecir(
        usuario: string,
        topK: number = 5,
        excluirComprados: boolean = true
    ): Promise<Prediccion[]> {
        if (!this.isInitialized || !this.model) {
            throw new Error('El modelo no ha sido entrenado ni cargado');
        }

        const normalizedUser = usuario.trim().toLowerCase();
        const userIdx = this.userEncoder.get(normalizedUser);

        if (userIdx === undefined) {
            console.warn(`⚠️ Usuario ${normalizedUser} no encontrado en el modelo, devolviendo populares`);
            return this.obtenerPopulares(topK);
        }

        const productosComprados = new Set<string>();
        if (excluirComprados && this.matrizOriginal) {
            for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
                if (this.matrizOriginal[userIdx][prodIdx] > 0) {
                    const producto = this.productDecoder.get(prodIdx);
                    if (producto) productosComprados.add(producto);
                }
            }
        }

        const predicciones: Prediccion[] = [];
        for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
            const producto = this.productDecoder.get(prodIdx);

            if (producto && excluirComprados && productosComprados.has(producto)) continue;

            const userTensor = tensor2d([[userIdx]], [1, 1], 'int32');
            const itemTensor = tensor2d([[prodIdx]], [1, 1], 'int32');

            const prediccion = this.model.predict([userTensor, itemTensor]) as Tensor;
            const score = await prediccion.data();

            if (producto) predicciones.push({ producto, score: score[0] });

            userTensor.dispose();
            itemTensor.dispose();
            prediccion.dispose();
        }

        const predFiltradas = this.aplicarFiltrosEcosistema(predicciones, normalizedUser);

        return predFiltradas
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    // ==============================
    // 🚀 FILTROS DE ECOSISTEMA
    // ==============================
    private aplicarFiltrosEcosistema(predicciones: Prediccion[], usuario: string): Prediccion[] {
        const userIdx = this.userEncoder.get(usuario);
        if (userIdx === undefined || !this.matrizOriginal) return predicciones;

        const ecosistemas = { apple: 0, samsung: 0, google: 0, microsoft: 0, lenovo: 0, dell: 0 };

        for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
            if (this.matrizOriginal[userIdx][prodIdx] > 0) {
                const producto = this.productDecoder.get(prodIdx);
                if (!producto) continue;
                if (producto.includes('IP15') || producto.includes('MBA') || producto.includes('MBP') || producto.includes('IPAD') || producto.includes('AIRP')) ecosistemas.apple++;
                else if (producto.includes('GS24') || producto.includes('GTS9')) ecosistemas.samsung++;
                else if (producto.includes('PX8')) ecosistemas.google++;
                else if (producto.includes('SP') || producto.includes('SG')) ecosistemas.microsoft++;
                else if (producto.includes('T14') || producto.includes('X1C') || producto.includes('P1')) ecosistemas.lenovo++;
                else if (producto.includes('XPS')) ecosistemas.dell++;
            }
        }

        const ecosistemaPredominante = Object.entries(ecosistemas).reduce((a, b) =>
            a[1] > b[1] ? a : b
        )[0];

        return predicciones.map(pred => {
            let bonus = 1.0;
            const producto = pred.producto.toLowerCase();

            if (ecosistemaPredominante === 'apple' && (producto.includes('ip15') || producto.includes('mba') || producto.includes('mbp') || producto.includes('ipad') || producto.includes('airp'))) bonus = 1.3;
            else if (ecosistemaPredominante === 'samsung' && (producto.includes('gs24') || producto.includes('gts9'))) bonus = 1.3;
            else if (ecosistemaPredominante === 'apple' && (producto.includes('gs24') || producto.includes('px8'))) bonus = 0.7;
            else if (ecosistemaPredominante === 'samsung' && (producto.includes('ip15') || producto.includes('ipad'))) bonus = 0.7;

            return { ...pred, score: Math.min(pred.score * bonus, 1.0) };
        });
    }

    // ==============================
    // 🚀 GETTERS
    // ==============================
    get numUsuarios(): number {
        return this.userEncoder.size;
    }

    get numProductos(): number {
        return this.productEncoder.size;
    }
}
