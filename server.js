// server.js - WebSocket con soporte completo de diapositivas (igual que v9)

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = 3000;

app.use(express.static('public'));

const salas = new Map();

function generarId() {
    return crypto.randomBytes(4).toString('hex');
}

function crearSlideVacio() {
    return {
        image: null,
        strokes: [],
        bgColor: '#ffffff',
        texts: [
            { content: "", visible: true, label: "MSN_1" },
            { content: "", visible: true, label: "MSN_2" },
            { content: "", visible: true, label: "MSN_3" }
        ]
    };
}

wss.on('connection', (ws) => {
    console.log('🟢 Cliente conectado');
    let salaId = null;
    let rol = null;

    ws.on('message', (data) => {
        const msg = JSON.parse(data);

        // Crear sala (MAESTRO)
        if (msg.tipo === 'crear_sala') {
            salaId = generarId();
            rol = 'maestro';
            salas.set(salaId, {
                maestro: ws,
                espectadores: new Set(),
                slides: [crearSlideVacio()],
                currentSlideIndex: 0
            });
            ws.send(JSON.stringify({ tipo: 'sala_creada', salaId }));
            console.log(`✅ Sala creada: ${salaId}`);
            return;
        }

        // Unirse a sala (ESPECTADOR)
        if (msg.tipo === 'unirse_sala') {
            const sala = salas.get(msg.salaId);
            if (!sala) {
                ws.send(JSON.stringify({ tipo: 'error', mensaje: 'Sala no existe' }));
                return;
            }
            salaId = msg.salaId;
            rol = 'espectador';
            sala.espectadores.add(ws);
            
            // Enviar estado completo al espectador
            ws.send(JSON.stringify({
                tipo: 'full_state',
                data: {
                    slides: sala.slides,
                    currentIndex: sala.currentSlideIndex
                }
            }));
            console.log(`👁️ Espectador unido a sala: ${salaId}`);
            return;
        }

        // Procesar acciones del MAESTRO
        if (msg.tipo === 'accion') {
            const sala = salas.get(salaId);
            if (!sala) return;

            const { accion, data } = msg;

            // Actualizar estado local según acción
            if (accion === 'draw') {
                const slide = sala.slides[sala.currentSlideIndex];
                if (slide) {
                    slide.strokes.push(data.stroke);
                }
                // Broadcast a espectadores
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'draw', data }));
                    }
                });
            }
            else if (accion === 'reset') {
                const slide = sala.slides[sala.currentSlideIndex];
                if (slide) {
                    slide.strokes = [];
                }
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'reset' }));
                    }
                });
            }
            else if (accion === 'full_state') {
                // Actualizar todo el estado (nueva diapositiva, etc.)
                if (data.slides) sala.slides = data.slides;
                if (data.currentIndex !== undefined) sala.currentSlideIndex = data.currentIndex;
                
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'full_state', data }));
                    }
                });
            }
            else if (accion === 'slide_change') {
                if (data.index !== undefined) sala.currentSlideIndex = data.index;
                if (data.slides) sala.slides = data.slides;
                
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'slide_change', data }));
                    }
                });
            }
            else if (accion === 'text_change') {
                const slide = sala.slides[sala.currentSlideIndex];
                if (slide && slide.texts[data.textboxIndex]) {
                    if (data.content !== undefined) slide.texts[data.textboxIndex].content = data.content;
                    if (data.isVisible !== undefined) slide.texts[data.textboxIndex].visible = data.isVisible;
                }
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'text_change', data }));
                    }
                });
            }
            else if (accion === 'bg_color') {
                const slide = sala.slides[sala.currentSlideIndex];
                if (slide) slide.bgColor = data.color;
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'bg_color', data }));
                    }
                });
            }
            else if (accion === 'image_upload') {
                const slide = sala.slides[sala.currentSlideIndex];
                if (slide) slide.image = data.dataURL;
                sala.espectadores.forEach(es => {
                    if (es.readyState === WebSocket.OPEN) {
                        es.send(JSON.stringify({ type: 'image_upload', data }));
                    }
                });
            }
        }
    });

    ws.on('close', () => {
        if (salaId && rol === 'maestro') {
            salas.delete(salaId);
            console.log(`🗑️ Sala ${salaId} eliminada`);
        } else if (salaId && rol === 'espectador') {
            const sala = salas.get(salaId);
            if (sala) sala.espectadores.delete(ws);
        }
    });
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor WebSocket en http://localhost:${PORT}`);
    console.log(`   MAESTRO: Crea sala → Comparte código`);
    console.log(`   ESPECTADOR: Ingresa código → Unirse`);
});