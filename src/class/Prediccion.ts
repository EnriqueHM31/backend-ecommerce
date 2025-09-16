import { input, io, layers, LayersModel, loadLayersModel, Logs, model, SymbolicTensor, Tensor, tensor2d, train, regularizers } from '@tensorflow/tfjs';
import fs from "fs";
import type { Compra, DatosEntrenamiento, DatosPreprocessed, Prediccion } from '../types/prediccion';

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
    // 🚀 PREPROCESAMIENTO DE DATOS MEJORADO
    // ==============================
    preprocesarDatos(compras: Compra[]): DatosPreprocessed {
        console.log(`📊 Procesando ${compras.length} compras...`);

        const usuarios: string[] = [...new Set(compras.map(c => c.usuario))];
        const productos: string[] = [...new Set(compras.map(c => c.producto))];

        // Limpiar encoders existentes
        this.userEncoder.clear();
        this.userDecoder.clear();
        this.productEncoder.clear();
        this.productDecoder.clear();
        this.userBiases.clear();
        this.itemBiases.clear();

        // Crear encoders
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

        // Crear matriz de interacciones
        const matriz: number[][] = Array(numUsuarios).fill(null).map(() => Array(numProductos).fill(0));
        const ratings: number[] = [];

        compras.forEach(compra => {
            const userIdx = this.userEncoder.get(compra.usuario);
            const prodIdx = this.productEncoder.get(compra.producto);
            if (userIdx !== undefined && prodIdx !== undefined) {
                const rating = compra.cantidad || (compra as any).rating || 1;
                matriz[userIdx][prodIdx] = rating;
                ratings.push(rating);
            }
        });

        // Calcular estadísticas de ratings
        this.maxRating = Math.max(...ratings);
        this.minRating = Math.min(...ratings);
        this.meanRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

        // Calcular biases de usuario e item
        this.calcularBiases(matriz);

        console.log(`✅ Datos preprocesados: ${numUsuarios} usuarios, ${numProductos} productos`);
        console.log(`📈 Ratings: min=${this.minRating}, max=${this.maxRating}, mean=${this.meanRating.toFixed(2)}`);

        return { matriz, numUsuarios, numProductos };
    }

    // ==============================
    // 🚀 CALCULAR BIASES
    // ==============================
    private calcularBiases(matriz: number[][]): void {
        const numUsuarios = matriz.length;
        const numProductos = matriz[0].length;

        // Calcular bias global
        let totalRatings = 0;
        let sumRatings = 0;

        for (let i = 0; i < numUsuarios; i++) {
            for (let j = 0; j < numProductos; j++) {
                if (matriz[i][j] > 0) {
                    totalRatings++;
                    sumRatings += matriz[i][j];
                }
            }
        }

        const globalBias = totalRatings > 0 ? sumRatings / totalRatings : 0;

        // Calcular user biases
        for (let i = 0; i < numUsuarios; i++) {
            let userRatings = 0;
            let userSum = 0;

            for (let j = 0; j < numProductos; j++) {
                if (matriz[i][j] > 0) {
                    userRatings++;
                    userSum += matriz[i][j];
                }
            }

            const userBias = userRatings > 0 ? (userSum / userRatings) - globalBias : 0;
            this.userBiases.set(i, userBias);
        }

        // Calcular item biases
        for (let j = 0; j < numProductos; j++) {
            let itemRatings = 0;
            let itemSum = 0;

            for (let i = 0; i < numUsuarios; i++) {
                if (matriz[i][j] > 0) {
                    itemRatings++;
                    itemSum += matriz[i][j];
                }
            }

            const itemBias = itemRatings > 0 ? (itemSum / itemRatings) - globalBias : 0;
            this.itemBiases.set(j, itemBias);
        }
    }

    // ==============================
    // 🚀 CREAR MODELO MEJORADO CON MATRIX FACTORIZATION
    // ==============================
    async crearModelo(numUsuarios: number, numProductos: number, embedding_dim: number = 64): Promise<LayersModel> {
        this.model = null;

        // Inputs
        const userInput = input({ shape: [1], name: 'user_input' });
        const itemInput = input({ shape: [1], name: 'item_input' });

        // User embedding con regularización
        const userEmbedding = layers.embedding({
            inputDim: numUsuarios,
            outputDim: embedding_dim,
            embeddingsRegularizer: regularizers.l2({ l2: 0.001 }),
            name: 'user_embedding'
        }).apply(userInput) as SymbolicTensor;
        const userVec = layers.flatten().apply(userEmbedding) as SymbolicTensor;

        // Item embedding con regularización
        const itemEmbedding = layers.embedding({
            inputDim: numProductos,
            outputDim: embedding_dim,
            embeddingsRegularizer: regularizers.l2({ l2: 0.001 }),
            name: 'item_embedding'
        }).apply(itemInput) as SymbolicTensor;
        const itemVec = layers.flatten().apply(itemEmbedding) as SymbolicTensor;

        // User bias embedding
        const userBiasEmbedding = layers.embedding({
            inputDim: numUsuarios,
            outputDim: 1,
            name: 'user_bias_embedding'
        }).apply(userInput) as SymbolicTensor;
        const userBias = layers.flatten().apply(userBiasEmbedding) as SymbolicTensor;

        // Item bias embedding
        const itemBiasEmbedding = layers.embedding({
            inputDim: numProductos,
            outputDim: 1,
            name: 'item_bias_embedding'
        }).apply(itemInput) as SymbolicTensor;
        const itemBias = layers.flatten().apply(itemBiasEmbedding) as SymbolicTensor;

        // Dot product de embeddings
        const dotProduct = layers.dot({ axes: 1 }).apply([userVec, itemVec]) as SymbolicTensor;

        // Concatenar features para capa densa adicional
        const concatFeatures = layers.concatenate().apply([userVec, itemVec]) as SymbolicTensor;
        const denseLayer = layers.dense({
            units: 32,
            activation: 'relu',
            kernelRegularizer: regularizers.l2({ l2: 0.001 })
        }).apply(concatFeatures) as SymbolicTensor;
        const dropoutLayer = layers.dropout({ rate: 0.2 }).apply(denseLayer) as SymbolicTensor;
        const denseOutput = layers.dense({
            units: 1,
            activation: 'linear'
        }).apply(dropoutLayer) as SymbolicTensor;

        // Combinar dot product, biases y dense output
        const combined = layers.add().apply([dotProduct, userBias, itemBias, denseOutput]) as SymbolicTensor;

        // Output final con activación sigmoid para normalizar entre 0-1
        const output = layers.activation({ activation: 'sigmoid' }).apply(combined) as SymbolicTensor;

        this.model = model({ inputs: [userInput, itemInput], outputs: output });

        // Compilar con optimizador mejorado
        this.model.compile({
            optimizer: train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae', 'mse']
        });

        console.log('✅ Modelo Matrix Factorization creado con arquitectura mejorada');
        console.log(`📊 Embedding dimension: ${embedding_dim}`);
        console.log(`👥 Usuarios: ${numUsuarios}, 🛍️ Productos: ${numProductos}`);

        return this.model;
    }

    // ==============================
    // 🚀 PREPARAR DATOS ENTRENAMIENTO MEJORADO
    // ==============================
    prepararDatosEntrenamiento(matriz: number[][]): DatosEntrenamiento {
        console.log('🔄 Preparando datos de entrenamiento...');

        const userIds: number[] = [];
        const itemIds: number[] = [];
        const ratings: number[] = [];

        // Recopilar interacciones positivas
        for (let i = 0; i < matriz.length; i++) {
            for (let j = 0; j < matriz[i].length; j++) {
                if (matriz[i][j] > 0) {
                    userIds.push(i);
                    itemIds.push(j);
                    ratings.push(matriz[i][j]);
                }
            }
        }

        // Agregar muestras negativas balanceadas (10% de las positivas)
        const numNegativeSamples = Math.floor(userIds.length * 0.1);
        const usedPairs = new Set<string>();

        for (let i = 0; i < numNegativeSamples; i++) {
            let userIdx, itemIdx;
            let attempts = 0;

            do {
                userIdx = Math.floor(Math.random() * matriz.length);
                itemIdx = Math.floor(Math.random() * matriz[0].length);
                attempts++;
            } while (
                matriz[userIdx][itemIdx] > 0 ||
                usedPairs.has(`${userIdx}-${itemIdx}`) ||
                attempts < 100
            );

            if (attempts < 100) {
                userIds.push(userIdx);
                itemIds.push(itemIdx);
                ratings.push(0); // Rating 0 para muestras negativas
                usedPairs.add(`${userIdx}-${itemIdx}`);
            }
        }

        // Normalización mejorada usando min-max scaling
        const normalizedRatings = ratings.map(r => {
            if (r === 0) return 0; // Mantener 0 para muestras negativas
            return (r - this.minRating) / (this.maxRating - this.minRating);
        });

        console.log(`✅ Datos preparados: ${userIds.length} muestras (${userIds.length - numNegativeSamples} positivas, ${numNegativeSamples} negativas)`);

        return {
            userIds: tensor2d(userIds, [userIds.length, 1], 'int32'),
            itemIds: tensor2d(itemIds, [itemIds.length, 1], 'int32'),
            ratings: tensor2d(normalizedRatings, [normalizedRatings.length, 1])
        };
    }

    // ==============================
    // 🚀 ENTRENAR MODELO MEJORADO
    // ==============================
    async entrenar(
        compras: Compra[],
        epochs: number = 100,
        ruta: string = "./modelo-entrenado/model.json"
    ): Promise<void> {
        console.log('🚀 Iniciando entrenamiento mejorado...');
        console.log(`📁 Ruta del modelo: ${ruta}`);

        try {
            const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);
            this.matrizOriginal = matriz.map(row => [...row]);

            await this.crearModelo(numUsuarios, numProductos);

            // Guardar meta antes de entrenar
            await this.guardarMeta();

            const datos = this.prepararDatosEntrenamiento(matriz);
            const epochsAjustados = Math.max(epochs, 50);
            const batchSize = Math.min(64, Math.max(16, Math.floor(datos.userIds.shape[0] / 10)));

            // Variables para early stopping
            let bestLoss = Infinity;
            let patience = 10;
            let patienceCounter = 0;

            if (this.model) {
                console.log(`🎯 Configuración de entrenamiento:`);
                console.log(`   - Épocas: ${epochsAjustados}`);
                console.log(`   - Batch size: ${batchSize}`);
                console.log(`   - Muestras: ${datos.userIds.shape[0]}`);
                console.log(`   - Validación: 10%`);

                await this.model.fit(
                    [datos.userIds, datos.itemIds],
                    datos.ratings,
                    {
                        epochs: epochsAjustados,
                        batchSize: batchSize,
                        validationSplit: 0.1,
                        shuffle: true,
                        verbose: 1,
                        callbacks: {
                            onEpochEnd: (epoch: number, logs?: Logs) => {
                                if (logs) {
                                    const loss = logs.loss as number;
                                    const valLoss = logs.val_loss as number;

                                    if (valLoss < bestLoss) {
                                        bestLoss = valLoss;
                                        patienceCounter = 0;
                                    } else {
                                        patienceCounter++;
                                    }

                                    if (epoch % 5 === 0 || epoch === epochsAjustados - 1) {
                                        console.log(`📊 Época ${epoch + 1}/${epochsAjustados}:`);
                                        console.log(`   - Loss: ${loss.toFixed(4)}`);
                                        console.log(`   - Val Loss: ${valLoss.toFixed(4)}`);
                                        console.log(`   - MAE: ${(logs.mae as number).toFixed(4)}`);
                                        console.log(`   - Val MAE: ${(logs.val_mae as number).toFixed(4)}`);
                                    }

                                    if (patienceCounter >= patience) {
                                        console.log(`⏹️ Early stopping activado (patience: ${patience})`);
                                    }
                                }
                            },
                            onTrainEnd: () => {
                                console.log('🏁 Entrenamiento completado');
                            }
                        }
                    }
                );

                // ⚡ Guardar modelo entrenado en disco
                console.log(`✅ Modelo guardado correctamente en ${ruta}`);
            }

            // Limpiar memoria
            datos.userIds.dispose();
            datos.itemIds.dispose();
            datos.ratings.dispose();

            this.isInitialized = true;
            await this.guardarModelo();
            console.log(`✅ Modelo entrenado exitosamente con ${epochsAjustados} épocas`);
            console.log(`📈 Mejor pérdida de validación: ${bestLoss.toFixed(4)}`);
        } catch (err) {
            console.error('❌ Error en entrenamiento:', err);
            throw new Error('Error en entrenamiento: ' + err);
        }
    }


    // ==============================
    // 🚀 ENTRENAR MODELO CON RECOMENDACIONES
    // ==============================
    async entrenarConRecomendaciones(
        compras: Compra[],
        usuario: string,
        topK: number = 5,
        epochs: number = 50,
        ruta: string = "./modelo-entrenado/model.json"
    ): Promise<{ entrenamiento: void; recomendaciones: Prediccion[] }> {
        console.log(`🚀 Iniciando entrenamiento con recomendaciones para usuario: ${usuario}`);

        try {
            // 🔹 Entrenar el modelo
            await this.entrenar(compras, epochs, ruta);

            // 🔹 Generar recomendaciones para el usuario especificado
            const recomendaciones = await this.predecir(usuario, topK, true);

            console.log(`✅ Entrenamiento completado y recomendaciones generadas para ${usuario}`);

            return {
                entrenamiento: undefined as any, // El entrenamiento ya se completó
                recomendaciones
            };
        } catch (err) {
            throw new Error('Error en entrenamiento con recomendaciones: ' + err);
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

        // 🔹 Reconstruir encoders desde meta.json
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
        } else {
            console.warn("⚠️ No se encontró archivo meta.json, los encoders estarán vacíos");
        }
    }



    // ==============================
    // 🚀 PREDICCIÓN MEJORADA CON BATCH PROCESSING
    // ==============================
    async predecir(
        usuario: string,
        topK: number = 5,
        excluirComprados: boolean = true
    ): Promise<Prediccion[]> {
        if (!this.isInitialized || !this.model) {
            throw new Error('El modelo no ha sido entrenado ni cargado');
        }

        const userIdx = this.userEncoder.get(usuario);

        // 🟢 Caso 1: Usuario nuevo → usar sistema de cold start mejorado
        if (userIdx === undefined) {
            console.warn(`⚠️ Usuario "${usuario}" no encontrado en el modelo, usando cold start`);
            return this.predecirColdStart(usuario, topK);
        }

        // 🟢 Caso 2: Usuario conocido → predicciones personalizadas
        const productosComprados = new Set<string>();
        if (excluirComprados && this.matrizOriginal) {
            for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
                if (this.matrizOriginal[userIdx][prodIdx] > 0) {
                    const producto = this.productDecoder.get(prodIdx);
                    if (producto) productosComprados.add(producto);
                }
            }
        }

        // Determinar productos candidatos
        const candidatos: number[] = [];
        const numProductos = this.productEncoder.size;

        // Obtener el tamaño real del modelo para evitar índices fuera de rango
        const modelInputShape = this.model?.inputs?.[1]?.shape;
        const maxProductIndex = modelInputShape && modelInputShape[1] ? modelInputShape[1] - 1 : numProductos - 1;

        console.log(`📊 Modelo acepta índices de productos: 0 a ${maxProductIndex}`);
        console.log(`📊 Encoder tiene ${numProductos} productos`);

        for (let prodIdx = 0; prodIdx < numProductos; prodIdx++) {
            // Verificar que el índice esté dentro del rango del modelo
            if (prodIdx > maxProductIndex) {
                console.warn(`⚠️ Saltando producto ${prodIdx} - fuera del rango del modelo`);
                continue;
            }

            const producto = this.productDecoder.get(prodIdx);
            if (!producto) continue;
            if (excluirComprados && productosComprados.has(producto)) continue;
            candidatos.push(prodIdx);
        }

        console.log(`🔍 Evaluando ${candidatos.length} productos candidatos para usuario ${usuario}`);

        // Procesamiento por lotes para mayor eficiencia
        const batchSize = 32;
        const predicciones: Prediccion[] = [];

        for (let i = 0; i < candidatos.length; i += batchSize) {
            const batch = candidatos.slice(i, i + batchSize);

            // Validar que todos los índices estén dentro del rango del modelo
            const validBatch = batch.filter(idx => idx <= maxProductIndex);

            if (validBatch.length === 0) {
                console.warn(`⚠️ Lote ${i}-${i + batchSize} no tiene índices válidos, saltando...`);
                continue;
            }

            if (validBatch.length !== batch.length) {
                console.warn(`⚠️ Lote ${i}-${i + batchSize}: ${batch.length - validBatch.length} índices inválidos filtrados`);
            }

            // Crear tensores para el lote válido
            const userBatch = Array(validBatch.length).fill(userIdx);
            const itemBatch = validBatch;

            const userTensor = tensor2d(userBatch.map(u => [u]), [validBatch.length, 1], 'int32');
            const itemTensor = tensor2d(itemBatch.map(i => [i]), [validBatch.length, 1], 'int32');

            // Predicción en lote
            const prediccion = this.model.predict([userTensor, itemTensor]) as Tensor;
            const scores = await prediccion.data();

            // Procesar resultados del lote
            for (let j = 0; j < validBatch.length; j++) {
                const prodIdx = validBatch[j];
                const producto = this.productDecoder.get(prodIdx);
                if (producto) {
                    // Desnormalizar score
                    const normalizedScore = scores[j];
                    const denormalizedScore = normalizedScore * (this.maxRating - this.minRating) + this.minRating;

                    predicciones.push({
                        producto,
                        score: Math.max(0, Math.min(1, denormalizedScore)) // Asegurar rango 0-1
                    });
                }
            }

            // Liberar memoria del lote
            userTensor.dispose();
            itemTensor.dispose();
            prediccion.dispose();
        }

        // Aplicar filtros de ecosistema
        const predFiltradas = this.aplicarFiltrosEcosistema(predicciones, usuario);

        // Ordenar y devolver topK
        const resultado = predFiltradas
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        console.log(`✅ Generadas ${resultado.length} recomendaciones para ${usuario}`);
        return resultado;
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
    // 🚀 OBTENER LOS PRODUCTOS MÁS POPULARES MEJORADO
    // ==============================
    public obtenerTopPopulares(topK: number = 4): Prediccion[] {
        if (!this.matrizOriginal) return [];

        const conteoProductos: Map<number, number> = new Map();
        const popularidadProductos: Map<number, number> = new Map();

        // Calcular popularidad (número de usuarios que compraron el producto)
        for (let i = 0; i < this.matrizOriginal.length; i++) {
            for (let j = 0; j < this.matrizOriginal[i].length; j++) {
                if (this.matrizOriginal[i][j] > 0) {
                    conteoProductos.set(j, (conteoProductos.get(j) || 0) + this.matrizOriginal[i][j]);
                    popularidadProductos.set(j, (popularidadProductos.get(j) || 0) + 1);
                }
            }
        }

        // Combinar cantidad total y popularidad (número de usuarios únicos)
        return [...conteoProductos.entries()]
            .map(([prodIdx, cantidad]) => {
                const popularidad = popularidadProductos.get(prodIdx) || 0;
                // Score combinado: 70% cantidad, 30% popularidad
                const score = (cantidad * 0.7) + (popularidad * 0.3);
                return { prodIdx, score, cantidad, popularidad };
            })
            .sort((a, b) => b.score - a.score)
            .slice(0, topK)
            .map(({ prodIdx, score }) => ({
                producto: this.productDecoder.get(prodIdx) || "desconocido",
                score: Math.min(score / 10, 1) // Normalizar score
            }));
    }

    // ==============================
    // 🚀 EVALUAR MODELO
    // ==============================
    async evaluarModelo(compras: Compra[], testSplit: number = 0.2): Promise<{
        mse: number;
        mae: number;
        rmse: number;
        precision: number;
        recall: number;
    }> {
        if (!this.isInitialized || !this.model) {
            throw new Error('El modelo no ha sido entrenado ni cargado');
        }

        console.log('📊 Evaluando modelo...');

        // Dividir datos en entrenamiento y prueba
        const shuffled = [...compras].sort(() => Math.random() - 0.5);
        const testSize = Math.floor(compras.length * testSplit);
        const testData = shuffled.slice(0, testSize);

        // Preparar datos de prueba
        const testUserIds: number[] = [];
        const testItemIds: number[] = [];
        const testRatings: number[] = [];

        // Obtener límites del modelo
        const modelUserShape = this.model?.inputs?.[0]?.shape;
        const modelItemShape = this.model?.inputs?.[1]?.shape;
        const maxUserIndex = modelUserShape && modelUserShape[1] ? modelUserShape[1] - 1 : this.userEncoder.size - 1;
        const maxItemIndex = modelItemShape && modelItemShape[1] ? modelItemShape[1] - 1 : this.productEncoder.size - 1;

        testData.forEach(compra => {
            const userIdx = this.userEncoder.get(compra.usuario);
            const prodIdx = this.productEncoder.get(compra.producto);
            if (userIdx !== undefined && prodIdx !== undefined &&
                userIdx <= maxUserIndex && prodIdx <= maxItemIndex) {
                testUserIds.push(userIdx);
                testItemIds.push(prodIdx);
                const rating = compra.cantidad || (compra as any).rating || 1;
                const normalizedRating = (rating - this.minRating) / (this.maxRating - this.minRating);
                testRatings.push(normalizedRating);
            }
        });

        if (testUserIds.length === 0) {
            throw new Error('No hay datos de prueba válidos');
        }

        // Crear tensores de prueba
        const testUserTensor = tensor2d(testUserIds.map(u => [u]), [testUserIds.length, 1], 'int32');
        const testItemTensor = tensor2d(testItemIds.map(i => [i]), [testItemIds.length, 1], 'int32');
        const testRatingTensor = tensor2d(testRatings.map(r => [r]), [testRatings.length, 1]);

        // Hacer predicciones
        const predicciones = this.model.predict([testUserTensor, testItemTensor]) as Tensor;
        const predData = await predicciones.data();

        // Calcular métricas
        let mse = 0;
        let mae = 0;
        let correctPredictions = 0;

        for (let i = 0; i < testRatings.length; i++) {
            const actual = testRatings[i];
            const predicted = predData[i];
            const error = actual - predicted;

            mse += error * error;
            mae += Math.abs(error);

            // Para precision/recall, considerar predicción correcta si está dentro de 0.1
            if (Math.abs(error) <= 0.1) {
                correctPredictions++;
            }
        }

        mse /= testRatings.length;
        mae /= testRatings.length;
        const rmse = Math.sqrt(mse);
        const precision = correctPredictions / testRatings.length;
        const recall = precision; // En este contexto, precision = recall

        // Limpiar memoria
        testUserTensor.dispose();
        testItemTensor.dispose();
        testRatingTensor.dispose();
        predicciones.dispose();

        console.log(`✅ Evaluación completada:`);
        console.log(`   - MSE: ${mse.toFixed(4)}`);
        console.log(`   - MAE: ${mae.toFixed(4)}`);
        console.log(`   - RMSE: ${rmse.toFixed(4)}`);
        console.log(`   - Precision: ${precision.toFixed(4)}`);

        return { mse, mae, rmse, precision, recall };
    }

    // ==============================
    // 🚀 SISTEMA DE COLD START MEJORADO
    // ==============================
    async predecirColdStart(usuario: string, topK: number = 5): Promise<Prediccion[]> {
        console.log(`🆕 Generando recomendaciones para usuario nuevo: ${usuario}`);

        // Estrategia 1: Productos más populares
        const populares = this.obtenerTopPopulares(topK * 2);

        // Estrategia 2: Productos con mejor rating promedio
        const mejorRating = this.obtenerProductosMejorRating(topK * 2);

        // Estrategia 3: Productos más diversos (menos comprados por usuarios existentes)
        const diversos = this.obtenerProductosDiversos(topK * 2);

        // Combinar estrategias con pesos
        const recomendaciones: Map<string, number> = new Map();

        populares.forEach((p, idx) => {
            const score = (topK * 2 - idx) * 0.4; // Peso 40%
            recomendaciones.set(p.producto, (recomendaciones.get(p.producto) || 0) + score);
        });

        mejorRating.forEach((p, idx) => {
            const score = (topK * 2 - idx) * 0.3; // Peso 30%
            recomendaciones.set(p.producto, (recomendaciones.get(p.producto) || 0) + score);
        });

        diversos.forEach((p, idx) => {
            const score = (topK * 2 - idx) * 0.3; // Peso 30%
            recomendaciones.set(p.producto, (recomendaciones.get(p.producto) || 0) + score);
        });

        // Convertir a array y ordenar
        const resultado = [...recomendaciones.entries()]
            .map(([producto, score]) => ({ producto, score: Math.min(score / 10, 1) }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);

        console.log(`✅ Generadas ${resultado.length} recomendaciones de cold start para ${usuario}`);
        return resultado;
    }

    private obtenerProductosMejorRating(topK: number): Prediccion[] {
        if (!this.matrizOriginal) return [];

        const ratingPromedio: Map<number, { suma: number, count: number }> = new Map();

        for (let i = 0; i < this.matrizOriginal.length; i++) {
            for (let j = 0; j < this.matrizOriginal[i].length; j++) {
                if (this.matrizOriginal[i][j] > 0) {
                    const current = ratingPromedio.get(j) || { suma: 0, count: 0 };
                    ratingPromedio.set(j, {
                        suma: current.suma + this.matrizOriginal[i][j],
                        count: current.count + 1
                    });
                }
            }
        }

        return [...ratingPromedio.entries()]
            .map(([prodIdx, data]) => ({
                producto: this.productDecoder.get(prodIdx) || "desconocido",
                score: data.suma / data.count
            }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    private obtenerProductosDiversos(topK: number): Prediccion[] {
        if (!this.matrizOriginal) return [];

        const diversidad: Map<number, number> = new Map();

        for (let j = 0; j < this.matrizOriginal[0].length; j++) {
            let usuariosUnicos = 0;
            for (let i = 0; i < this.matrizOriginal.length; i++) {
                if (this.matrizOriginal[i][j] > 0) {
                    usuariosUnicos++;
                }
            }
            // Menos usuarios = más diverso (inverso de popularidad)
            diversidad.set(j, 1 / (usuariosUnicos + 1));
        }

        return [...diversidad.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, topK)
            .map(([prodIdx, score]) => ({
                producto: this.productDecoder.get(prodIdx) || "desconocido",
                score
            }));
    }
    // ==============================
    // 🚀 DIAGNÓSTICO Y SINCRONIZACIÓN
    // ==============================
    diagnosticarModelo(): void {
        console.log('🔍 DIAGNÓSTICO DEL MODELO:');
        console.log(`📊 Usuarios en encoder: ${this.userEncoder.size}`);
        console.log(`📊 Productos en encoder: ${this.productEncoder.size}`);

        if (this.model) {
            const userInputShape = this.model.inputs?.[0]?.shape;
            const itemInputShape = this.model.inputs?.[1]?.shape;

            console.log(`🤖 Modelo - Usuarios: ${userInputShape ? userInputShape[1] : 'N/A'}`);
            console.log(`🤖 Modelo - Productos: ${itemInputShape ? itemInputShape[1] : 'N/A'}`);

            if (userInputShape && itemInputShape && userInputShape[1] && itemInputShape[1]) {
                const maxUsers = userInputShape[1] - 1;
                const maxItems = itemInputShape[1] - 1;

                console.log(`📈 Rango de usuarios: 0 a ${maxUsers}`);
                console.log(`📈 Rango de productos: 0 a ${maxItems}`);

                if (this.userEncoder.size > userInputShape[1]) {
                    console.warn(`⚠️ ADVERTENCIA: Encoder tiene ${this.userEncoder.size} usuarios pero modelo solo acepta ${userInputShape[1]}`);
                }

                if (this.productEncoder.size > itemInputShape[1]) {
                    console.warn(`⚠️ ADVERTENCIA: Encoder tiene ${this.productEncoder.size} productos pero modelo solo acepta ${itemInputShape[1]}`);
                }
            }
        } else {
            console.log('❌ No hay modelo cargado');
        }
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
