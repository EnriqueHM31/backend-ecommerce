import * as tf from '@tensorflow/tfjs';
import type { Compra, Prediccion, DatosPreprocessed, DatosEntrenamiento } from '../types/prediccion';

// Clase para el sistema de recomendación
export class SistemaRecomendacion {
    private model: tf.LayersModel | null;
    private productEncoder: Map<string, number>;
    private userEncoder: Map<string, number>;
    private productDecoder: Map<number, string>;
    private userDecoder: Map<number, string>;
    public isInitialized: boolean;

    constructor() {
        this.model = null;
        this.productEncoder = new Map();
        this.userEncoder = new Map();
        this.productDecoder = new Map();
        this.userDecoder = new Map();
        this.isInitialized = false;
    }

    // Preprocesa los datos de compras
    preprocesarDatos(compras: Compra[]): DatosPreprocessed {
        // Crear encoders para usuarios y productos
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

        // Crear matriz de interacciones usuario-producto
        const numUsuarios = usuarios.length;
        const numProductos = productos.length;
        const matriz: number[][] = Array(numUsuarios).fill(null).map(() => Array(numProductos).fill(0));

        compras.forEach(compra => {
            const userIdx = this.userEncoder.get(compra.usuario);
            const prodIdx = this.productEncoder.get(compra.producto);
            if (userIdx !== undefined && prodIdx !== undefined) {
                // Usar cantidad o rating, default 1
                matriz[userIdx][prodIdx] = compra.cantidad || compra.rating || 1;
            }
        });

        return {
            matriz,
            numUsuarios,
            numProductos
        };
    }

    // Crea y entrena el modelo de factorización matricial
    async crearModelo(numUsuarios: number, numProductos: number, embedding_dim: number = 50): Promise<tf.LayersModel> {
        // Entrada para usuarios
        const userInput = tf.input({ shape: [1], name: 'user_input' });
        const userEmbedding = tf.layers.embedding({
            inputDim: numUsuarios,
            outputDim: embedding_dim,
            name: 'user_embedding'
        }).apply(userInput) as tf.SymbolicTensor;
        const userVec = tf.layers.flatten().apply(userEmbedding) as tf.SymbolicTensor;

        // Entrada para productos
        const itemInput = tf.input({ shape: [1], name: 'item_input' });
        const itemEmbedding = tf.layers.embedding({
            inputDim: numProductos,
            outputDim: embedding_dim,
            name: 'item_embedding'
        }).apply(itemInput) as tf.SymbolicTensor;
        const itemVec = tf.layers.flatten().apply(itemEmbedding) as tf.SymbolicTensor;

        // Producto punto entre embeddings de usuario e item
        const dotProduct = tf.layers.dot({ axes: 1 }).apply([userVec, itemVec]) as tf.SymbolicTensor;

        // Salida con activación sigmoide para normalizar entre 0 y 1
        const output = tf.layers.dense({
            units: 1,
            activation: 'sigmoid',
            name: 'output'
        }).apply(dotProduct) as tf.SymbolicTensor;

        // Crear modelo
        this.model = tf.model({
            inputs: [userInput, itemInput],
            outputs: output
        });

        // Compilar modelo
        this.model.compile({
            optimizer: tf.train.adam(0.001),
            loss: 'meanSquaredError',
            metrics: ['mae']
        });

        return this.model;
    }

    // Prepara datos de entrenamiento
    prepararDatosEntrenamiento(matriz: number[][]): DatosEntrenamiento {
        const userIds: number[] = [];
        const itemIds: number[] = [];
        const ratings: number[] = [];

        // Crear ejemplos de entrenamiento
        for (let i = 0; i < matriz.length; i++) {
            for (let j = 0; j < matriz[i].length; j++) {
                if (matriz[i][j] > 0) {
                    userIds.push(i);
                    itemIds.push(j);
                    ratings.push(matriz[i][j]);
                }

                // Agregar algunos ejemplos negativos (productos no comprados)
                if (matriz[i][j] === 0 && Math.random() < 0.1) {
                    userIds.push(i);
                    itemIds.push(j);
                    ratings.push(0);
                }
            }
        }

        // Normalizar ratings entre 0 y 1
        const maxRating = Math.max(...ratings);
        const normalizedRatings = ratings.map(r => maxRating > 0 ? r / maxRating : 0);

        return {
            userIds: tf.tensor2d(userIds, [userIds.length, 1], 'int32'),
            itemIds: tf.tensor2d(itemIds, [itemIds.length, 1], 'int32'),
            ratings: tf.tensor2d(normalizedRatings, [normalizedRatings.length, 1])
        };
    }



    // Predice recomendaciones para un usuario - VERSIÓN MEJORADA
    async predecir(usuario: string, topK: number = 5, excluirComprados: boolean = true): Promise<Prediccion[]> {
        if (!this.isInitialized || !this.model) {
            throw new Error('El modelo no ha sido entrenado');
        }

        const userIdx = this.userEncoder.get(usuario);
        if (userIdx === undefined) {
            throw new Error(`Usuario ${usuario} no encontrado`);
        }

        // NUEVO: Obtener productos ya comprados por el usuario
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
        const numProductos = this.productEncoder.size;

        // Obtener predicciones para todos los productos
        for (let prodIdx = 0; prodIdx < numProductos; prodIdx++) {
            const producto = this.productDecoder.get(prodIdx);

            // NUEVO: Saltar productos ya comprados
            if (producto && excluirComprados && productosComprados.has(producto)) {
                continue;
            }

            const userTensor = tf.tensor2d([[userIdx]], [1, 1], 'int32');
            const itemTensor = tf.tensor2d([[prodIdx]], [1, 1], 'int32');

            const prediccion = this.model.predict([userTensor, itemTensor]) as tf.Tensor;
            const score = await prediccion.data();

            if (producto) {
                predicciones.push({
                    producto,
                    score: score[0]
                });
            }

            // Limpiar tensores
            userTensor.dispose();
            itemTensor.dispose();
            prediccion.dispose();
        }

        // NUEVO: Aplicar filtros adicionales por ecosistema
        const prediccionesFiltradas = this.aplicarFiltrosEcosistema(predicciones, usuario);

        // Ordenar por score y tomar los top K
        return prediccionesFiltradas
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
    }

    // NUEVO: Método para aplicar filtros por ecosistema
    private aplicarFiltrosEcosistema(predicciones: Prediccion[], usuario: string): Prediccion[] {
        const userIdx = this.userEncoder.get(usuario);
        if (userIdx === undefined || !this.matrizOriginal) return predicciones;

        // Detectar ecosistema predominante del usuario
        const ecosistemas = {
            apple: 0,
            samsung: 0,
            google: 0,
            microsoft: 0,
            lenovo: 0,
            dell: 0
        };

        // Contar productos por ecosistema ya comprados
        for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
            if (this.matrizOriginal[userIdx][prodIdx] > 0) {
                const producto = this.productDecoder.get(prodIdx);
                if (producto) {
                    if (producto.includes('IP15') || producto.includes('MBA') || producto.includes('MBP') || producto.includes('IPAD') || producto.includes('AIRP')) {
                        ecosistemas.apple += this.matrizOriginal[userIdx][prodIdx];
                    } else if (producto.includes('GS24') || producto.includes('GTS9')) {
                        ecosistemas.samsung += this.matrizOriginal[userIdx][prodIdx];
                    } else if (producto.includes('PX8')) {
                        ecosistemas.google += this.matrizOriginal[userIdx][prodIdx];
                    } else if (producto.includes('SP') || producto.includes('SG')) {
                        ecosistemas.microsoft += this.matrizOriginal[userIdx][prodIdx];
                    } else if (producto.includes('T14') || producto.includes('X1C') || producto.includes('P1')) {
                        ecosistemas.lenovo += this.matrizOriginal[userIdx][prodIdx];
                    } else if (producto.includes('XPS')) {
                        ecosistemas.dell += this.matrizOriginal[userIdx][prodIdx];
                    }
                }
            }
        }

        // Encontrar ecosistema predominante
        const ecosistemaPredominante = Object.entries(ecosistemas).reduce((a, b) =>
            ecosistemas[a[0] as keyof typeof ecosistemas] > ecosistemas[b[0] as keyof typeof ecosistemas] ? a : b
        )[0];

        // Aplicar bonus/penalty basado en ecosistema
        return predicciones.map(pred => {
            let bonus = 1.0;
            const producto = pred.producto.toLowerCase();

            if (ecosistemaPredominante === 'apple' && (
                producto.includes('ip15') || producto.includes('mba') ||
                producto.includes('mbp') || producto.includes('ipad') || producto.includes('airp')
            )) {
                bonus = 1.3; // Bonus para productos Apple
            } else if (ecosistemaPredominante === 'samsung' && (
                producto.includes('gs24') || producto.includes('gts9')
            )) {
                bonus = 1.3; // Bonus para productos Samsung
            } else if (ecosistemaPredominante === 'apple' && (
                producto.includes('gs24') || producto.includes('px8')
            )) {
                bonus = 0.7; // Penalty para competidores
            } else if (ecosistemaPredominante === 'samsung' && (
                producto.includes('ip15') || producto.includes('ipad')
            )) {
                bonus = 0.7; // Penalty para competidores
            }

            return {
                ...pred,
                score: Math.min(pred.score * bonus, 1.0) // Cap a 1.0
            };
        });
    }

    // NUEVO: Guardar matriz original para referencias
    private matrizOriginal: number[][] | null = null;

    // Modificar el método entrenar para guardar la matriz
    async entrenar(compras: Compra[], epochs: number = 50): Promise<void> {
        console.log('Iniciando entrenamiento del modelo...');

        try {


            const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);

            // NUEVO: Guardar matriz para usar en predicciones
            this.matrizOriginal = matriz.map(row => [...row]); // Deep copy

            await this.crearModelo(numUsuarios, numProductos);

            const datosEntrenamiento = this.prepararDatosEntrenamiento(matriz);

            // NUEVO: Más épocas para mejor aprendizaje
            const epochsAjustados = Math.max(epochs, 200); // Mínimo 100 épocas

            // Entrenar modelo
            if (this.model) {
                await this.model.fit(
                    [datosEntrenamiento.userIds, datosEntrenamiento.itemIds],
                    datosEntrenamiento.ratings,
                    {
                        epochs: epochsAjustados,
                        batchSize: Math.min(32, datosEntrenamiento.userIds.shape[0]), // Batch size adaptativo
                        validationSplit: 0.1, // Menos datos para validación
                        verbose: 1,
                        callbacks: {
                            onEpochEnd: (epoch: number, logs?: tf.Logs) => {
                                if (logs && logs.loss && epoch % 10 === 0) { // Log cada 10 épocas
                                    console.log(`Época ${epoch + 1}/${epochsAjustados}: pérdida = ${logs.loss.toFixed(4)}`);
                                }
                            }
                        }
                    }
                );
            }

            // Limpiar tensores
            datosEntrenamiento.userIds.dispose();
            datosEntrenamiento.itemIds.dispose();
            datosEntrenamiento.ratings.dispose();

            this.isInitialized = true;
            console.log(`Modelo entrenado exitosamente con ${epochsAjustados} épocas`);
        } catch (error) {
            throw new Error('Error al entrenar el modelo: ' + error);
        }
    }



    // Getters para acceso a información
    get numUsuarios(): number {
        return this.userEncoder.size;
    }

    get numProductos(): number {
        return this.productEncoder.size;
    }
}