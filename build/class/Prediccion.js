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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SistemaRecomendacion = void 0;
const tfjs_1 = require("@tensorflow/tfjs");
const fs = __importStar(require("fs"));
class SistemaRecomendacion {
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
    preprocesarDatos(compras) {
        const usuarios = [...new Set(compras.map(c => c.usuario))];
        const productos = [...new Set(compras.map(c => c.producto))];
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
        const matriz = Array(numUsuarios).fill(null).map(() => Array(numProductos).fill(0));
        compras.forEach(compra => {
            const userIdx = this.userEncoder.get(compra.usuario);
            const prodIdx = this.productEncoder.get(compra.producto);
            if (userIdx !== undefined && prodIdx !== undefined) {
                matriz[userIdx][prodIdx] = compra.cantidad || compra.rating || 1;
            }
        });
        return { matriz, numUsuarios, numProductos };
    }
    // ==============================
    // 🚀 CREAR MODELO
    // ==============================
    crearModelo(numUsuarios_1, numProductos_1) {
        return __awaiter(this, arguments, void 0, function* (numUsuarios, numProductos, embedding_dim = 50) {
            if (this.model) {
                console.log("⚠️ El modelo ya existe, no se recrea.");
                return this.model;
            }
            const userInput = (0, tfjs_1.input)({ shape: [1], name: 'user_input' });
            const userEmbedding = tfjs_1.layers.embedding({
                inputDim: numUsuarios,
                outputDim: embedding_dim,
                name: 'user_embedding'
            }).apply(userInput);
            const userVec = tfjs_1.layers.flatten().apply(userEmbedding);
            const itemInput = (0, tfjs_1.input)({ shape: [1], name: 'item_input' });
            const itemEmbedding = tfjs_1.layers.embedding({
                inputDim: numProductos,
                outputDim: embedding_dim,
                name: 'item_embedding'
            }).apply(itemInput);
            const itemVec = tfjs_1.layers.flatten().apply(itemEmbedding);
            const dotProduct = tfjs_1.layers.dot({ axes: 1 }).apply([userVec, itemVec]);
            const output = tfjs_1.layers.dense({
                units: 1,
                activation: 'sigmoid',
                name: 'output'
            }).apply(dotProduct);
            this.model = (0, tfjs_1.model)({ inputs: [userInput, itemInput], outputs: output });
            this.model.compile({
                optimizer: tfjs_1.train.adam(0.001),
                loss: 'meanSquaredError',
                metrics: ['mae']
            });
            this.guardarModelo();
            return this.model;
        });
    }
    // ==============================
    // 🚀 PREPARAR DATOS ENTRENAMIENTO
    // ==============================
    prepararDatosEntrenamiento(matriz) {
        const userIds = [];
        const itemIds = [];
        const ratings = [];
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
            userIds: (0, tfjs_1.tensor2d)(userIds, [userIds.length, 1], 'int32'),
            itemIds: (0, tfjs_1.tensor2d)(itemIds, [itemIds.length, 1], 'int32'),
            ratings: (0, tfjs_1.tensor2d)(normalizedRatings, [normalizedRatings.length, 1])
        };
    }
    // ==============================
    // 🚀 ENTRENAR MODELO
    // ==============================
    entrenar(compras_1) {
        return __awaiter(this, arguments, void 0, function* (compras, epochs = 50, ruta = "./modelo-entrenado/model.json") {
            console.log('Iniciando entrenamiento...');
            if (this.isInitialized && this.model) {
                console.log("⚠️ El modelo ya está inicializado, no se vuelve a entrenar.");
                return;
            }
            if (fs.existsSync(ruta)) {
                console.log("📂 Se encontró modelo guardado, cargando...");
                yield this.cargarModelo(ruta);
                return;
            }
            try {
                const { matriz, numUsuarios, numProductos } = this.preprocesarDatos(compras);
                this.matrizOriginal = matriz.map(row => [...row]);
                yield this.crearModelo(numUsuarios, numProductos);
                const datos = this.prepararDatosEntrenamiento(matriz);
                const epochsAjustados = Math.max(epochs, 50);
                if (this.model) {
                    yield this.model.fit([datos.userIds, datos.itemIds], datos.ratings, {
                        epochs: epochsAjustados,
                        batchSize: Math.min(32, datos.userIds.shape[0]),
                        validationSplit: 0.1,
                        verbose: 1,
                        callbacks: {
                            onEpochEnd: (epoch, logs) => {
                                if ((logs === null || logs === void 0 ? void 0 : logs.loss) && epoch % 10 === 0) {
                                    console.log(`Época ${epoch + 1}/${epochsAjustados}: pérdida = ${logs.loss.toFixed(4)}`);
                                }
                            }
                        }
                    });
                }
                datos.userIds.dispose();
                datos.itemIds.dispose();
                datos.ratings.dispose();
                this.isInitialized = true;
                console.log(`✅ Modelo entrenado con ${epochsAjustados} épocas`);
            }
            catch (err) {
                throw new Error('Error en entrenamiento: ' + err);
            }
        });
    }
    // ==============================
    // 🚀 GUARDAR Y CARGAR MODELO
    // ==============================
    guardarModelo() {
        return __awaiter(this, arguments, void 0, function* (ruta = "./modelo-entrenado") {
            if (!this.model)
                throw new Error("No hay modelo entrenado para guardar");
            const saveHandler = {
                save(modelArtifacts) {
                    return __awaiter(this, void 0, void 0, function* () {
                        if (!fs.existsSync(ruta))
                            fs.mkdirSync(ruta, { recursive: true });
                        const { weightData } = modelArtifacts, rest = __rest(modelArtifacts, ["weightData"]);
                        fs.writeFileSync(`${ruta}/model.json`, JSON.stringify(rest));
                        if (weightData) {
                            fs.writeFileSync(`${ruta}/weights.bin`, Buffer.from(weightData));
                        }
                        return {
                            modelArtifactsInfo: {
                                dateSaved: new Date(),
                                modelTopologyType: "JSON"
                            }
                        };
                    });
                }
            };
            yield this.model.save(saveHandler);
            console.log(`✅ Modelo guardado en ${ruta}`);
        });
    }
    cargarModelo() {
        return __awaiter(this, arguments, void 0, function* (ruta = "./modelo-entrenado/model.json") {
            const loadHandler = {
                load() {
                    return __awaiter(this, void 0, void 0, function* () {
                        const modelJSON = JSON.parse(fs.readFileSync(ruta, "utf-8"));
                        const weightData = fs.readFileSync(ruta.replace("model.json", "weights.bin"));
                        return Object.assign(Object.assign({}, modelJSON), { weightData: new Uint8Array(weightData).buffer });
                    });
                }
            };
            this.model = yield (0, tfjs_1.loadLayersModel)(loadHandler);
            this.isInitialized = true;
            console.log(`✅ Modelo cargado desde ${ruta}`);
        });
    }
    // ==============================
    // 🚀 Fallback de populares
    // ==============================
    obtenerPopulares(topK) {
        if (!this.matrizOriginal)
            return [];
        const conteo = new Map();
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
    predecir(usuario_1) {
        return __awaiter(this, arguments, void 0, function* (usuario, topK = 5, excluirComprados = true) {
            if (!this.isInitialized || !this.model) {
                throw new Error('El modelo no ha sido entrenado ni cargado');
            }
            const normalizedUser = usuario.trim().toLowerCase();
            const userIdx = this.userEncoder.get(normalizedUser);
            if (userIdx === undefined) {
                console.warn(`⚠️ Usuario ${normalizedUser} no encontrado en el modelo, devolviendo populares`);
                return this.obtenerPopulares(topK);
            }
            const productosComprados = new Set();
            if (excluirComprados && this.matrizOriginal) {
                for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
                    if (this.matrizOriginal[userIdx][prodIdx] > 0) {
                        const producto = this.productDecoder.get(prodIdx);
                        if (producto)
                            productosComprados.add(producto);
                    }
                }
            }
            const predicciones = [];
            for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
                const producto = this.productDecoder.get(prodIdx);
                if (producto && excluirComprados && productosComprados.has(producto))
                    continue;
                const userTensor = (0, tfjs_1.tensor2d)([[userIdx]], [1, 1], 'int32');
                const itemTensor = (0, tfjs_1.tensor2d)([[prodIdx]], [1, 1], 'int32');
                const prediccion = this.model.predict([userTensor, itemTensor]);
                const score = yield prediccion.data();
                if (producto)
                    predicciones.push({ producto, score: score[0] });
                userTensor.dispose();
                itemTensor.dispose();
                prediccion.dispose();
            }
            const predFiltradas = this.aplicarFiltrosEcosistema(predicciones, normalizedUser);
            return predFiltradas
                .sort((a, b) => b.score - a.score)
                .slice(0, topK);
        });
    }
    // ==============================
    // 🚀 FILTROS DE ECOSISTEMA
    // ==============================
    aplicarFiltrosEcosistema(predicciones, usuario) {
        const userIdx = this.userEncoder.get(usuario);
        if (userIdx === undefined || !this.matrizOriginal)
            return predicciones;
        const ecosistemas = { apple: 0, samsung: 0, google: 0, microsoft: 0, lenovo: 0, dell: 0 };
        for (let prodIdx = 0; prodIdx < this.productEncoder.size; prodIdx++) {
            if (this.matrizOriginal[userIdx][prodIdx] > 0) {
                const producto = this.productDecoder.get(prodIdx);
                if (!producto)
                    continue;
                if (producto.includes('IP15') || producto.includes('MBA') || producto.includes('MBP') || producto.includes('IPAD') || producto.includes('AIRP'))
                    ecosistemas.apple++;
                else if (producto.includes('GS24') || producto.includes('GTS9'))
                    ecosistemas.samsung++;
                else if (producto.includes('PX8'))
                    ecosistemas.google++;
                else if (producto.includes('SP') || producto.includes('SG'))
                    ecosistemas.microsoft++;
                else if (producto.includes('T14') || producto.includes('X1C') || producto.includes('P1'))
                    ecosistemas.lenovo++;
                else if (producto.includes('XPS'))
                    ecosistemas.dell++;
            }
        }
        const ecosistemaPredominante = Object.entries(ecosistemas).reduce((a, b) => a[1] > b[1] ? a : b)[0];
        return predicciones.map(pred => {
            let bonus = 1.0;
            const producto = pred.producto.toLowerCase();
            if (ecosistemaPredominante === 'apple' && (producto.includes('ip15') || producto.includes('mba') || producto.includes('mbp') || producto.includes('ipad') || producto.includes('airp')))
                bonus = 1.3;
            else if (ecosistemaPredominante === 'samsung' && (producto.includes('gs24') || producto.includes('gts9')))
                bonus = 1.3;
            else if (ecosistemaPredominante === 'apple' && (producto.includes('gs24') || producto.includes('px8')))
                bonus = 0.7;
            else if (ecosistemaPredominante === 'samsung' && (producto.includes('ip15') || producto.includes('ipad')))
                bonus = 0.7;
            return Object.assign(Object.assign({}, pred), { score: Math.min(pred.score * bonus, 1.0) });
        });
    }
    // ==============================
    // 🚀 GETTERS
    // ==============================
    get numUsuarios() {
        return this.userEncoder.size;
    }
    get numProductos() {
        return this.productEncoder.size;
    }
}
exports.SistemaRecomendacion = SistemaRecomendacion;
