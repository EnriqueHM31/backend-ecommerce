"use strict";
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
exports.ModeloFactura = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const contacto_1 = require("../contacto/contacto");
class ModeloFactura {
    static EnviarFacturaPDF(datos) {
        return __awaiter(this, void 0, void 0, function* () {
            const doc = new pdfkit_1.default({ margin: 40 });
            const buffers = [];
            doc.on("data", buffers.push.bind(buffers));
            doc.on("end", () => __awaiter(this, void 0, void 0, function* () {
                const pdfBuffer = Buffer.concat(buffers);
                const mailOptions = {
                    from: '"Soporte" StoreTecBPL',
                    to: datos.correo,
                    subject: "📄 Tu factura de compra",
                    text: "Adjunto encontrarás tu recibo/factura.",
                    attachments: [
                        {
                            filename: "factura.pdf",
                            content: pdfBuffer,
                            contentType: "application/pdf",
                        },
                    ],
                };
                yield contacto_1.transporter.sendMail(mailOptions);
            }));
            // --- Encabezado ---
            doc
                .fontSize(22)
                .fillColor("green")
                .text("¡Pago Exitoso!", { align: "center" })
                .moveDown(0.5);
            doc
                .fontSize(12)
                .fillColor("black")
                .text("Tu transacción se ha procesado correctamente", {
                align: "center",
            })
                .moveDown(1);
            // --- Detalles de la transacción ---
            doc.fontSize(14).fillColor("blue").text("Detalles de la transacción");
            doc.moveDown(0.3);
            doc.fontSize(12).fillColor("black");
            doc.text(`Nombre: ${datos.nombre}`);
            doc.text(`Email: ${datos.correo}`);
            doc.text(`Monto: ${datos.monto}`);
            doc.text(`Fecha: ${datos.fecha}`);
            doc.moveDown(1);
            // --- Dirección ---
            doc.fontSize(14).fillColor("blue").text("Detalles de la dirección");
            doc.moveDown(0.3);
            doc.fontSize(12).fillColor("black");
            doc.text(`Dirección 1: ${datos.direccion1}`);
            doc.text(`Dirección 2: ${datos.direccion2}`);
            doc.text(`Ciudad: ${datos.ciudad}`);
            doc.text(`Estado: ${datos.estado}`);
            doc.text(`Código Postal: ${datos.cp}`);
            doc.text(`País: ${datos.pais}`);
            doc.moveDown(1);
            // --- Tabla de productos ---
            doc.fontSize(14).fillColor("blue").text("Detalles de la transacción");
            doc.moveDown(0.5);
            const tableTop = doc.y;
            const colX = [50, 200, 300, 400];
            const rowHeight = 20;
            // Cabecera
            doc
                .fontSize(12)
                .fillColor("white")
                .rect(50, tableTop, 500, rowHeight)
                .fill("#001f4d");
            doc.fillColor("white").text("Producto", colX[0], tableTop + 5);
            doc.text("Cantidad", colX[1], tableTop + 5);
            doc.text("Precio Unitario", colX[2], tableTop + 5);
            doc.text("Total", colX[3], tableTop + 5);
            // Filas dinámicas
            let rowY = tableTop + rowHeight;
            datos.items.forEach((item) => {
                doc.fillColor("black");
                doc.text(item.producto, colX[0], rowY + 5);
                doc.text(item.cantidad.toString(), colX[1], rowY + 5);
                doc.text(item.precio, colX[2], rowY + 5);
                doc.text(item.total, colX[3], rowY + 5);
                rowY += rowHeight;
            });
            doc.moveDown(4);
            // --- Footer ---
            doc.end();
        });
    }
}
exports.ModeloFactura = ModeloFactura;
