const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const path = require('path');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;

app.use(express.static('public'));

let tutor = null;
let clientes = new Set();

wss.on('connection', (ws) => {
    console.log('🟢 Nuevo cliente conectado');

    ws.on('message', (data) => {
        try {
            const msg = JSON.parse(data);

            if (msg.tipo === 'soy_tutor') {
                tutor = ws;
                console.log('👑 TUTOR conectado');
                return;
            }

            if (msg.tipo === 'soy_cliente') {
                clientes.add(ws);
                console.log('👁️ CLIENTE conectado');
                return;
            }

            if (ws === tutor) {
                // ---------- TOGGLES Y CONTROLES REMOTOS ----------
                if (msg.tipo === 'toggle_jitsi_remoto') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'toggle_jitsi_remoto', visible: msg.visible }));
                        }
                    });
                }
                else if (msg.tipo === 'toggle_pizarra_remota') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'toggle_pizarra_remota', visible: msg.visible }));
                        }
                    });
                }
                else if (msg.tipo === 'reset_pizarra_remota') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'reset_pizarra_remota' }));
                        }
                    });
                }
                else if (msg.tipo === 'comando_mute_todos') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'comando_mute_todos' }));
                        }
                    });
                }
                else if (msg.tipo === 'comando_video_off_todos') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'comando_video_off_todos' }));
                        }
                    });
                }
                // ---------- DIBUJO ----------
                else if (msg.tipo === 'draw') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'draw', data: msg.data }));
                        }
                    });
                }
                // ---------- FONDO Y COLOR ----------
                else if (msg.tipo === 'bg_color') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'bg_color', color: msg.color }));
                        }
                    });
                }
                else if (msg.tipo === 'bg_image') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'bg_image', dataURL: msg.dataURL }));
                        }
                    });
                }
                // ---------- DIAPOSITIVAS ----------
                else if (msg.tipo === 'slide_change') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'slide_change', currentSlide: msg.currentSlide, slides: msg.slides }));
                        }
                    });
                }
                else if (msg.tipo === 'full_state') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'full_state', data: msg.data }));
                        }
                    });
                }
                // ---------- TEXTOS ----------
                else if (msg.tipo === 'text_change') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'text_change', textboxIndex: msg.textboxIndex, content: msg.content }));
                        }
                    });
                }
                else if (msg.tipo === 'visibility_change') {
                    clientes.forEach(cliente => {
                        if (cliente.readyState === WebSocket.OPEN) {
                            cliente.send(JSON.stringify({ tipo: 'visibility_change', textboxIndex: msg.textboxIndex, visible: msg.visible }));
                        }
                    });
                }
            }

        } catch (err) {
            console.error('Error:', err);
        }
    });

    ws.on('close', () => {
        if (ws === tutor) {
            tutor = null;
            console.log('👑 TUTOR desconectado');
            clientes.forEach(cliente => {
                if (cliente.readyState === WebSocket.OPEN) {
                    cliente.send(JSON.stringify({ tipo: 'tutor_desconectado' }));
                }
            });
        } else if (clientes.has(ws)) {
            clientes.delete(ws);
            console.log('👁️ CLIENTE desconectado');
        }
    });
});

app.get('/tutor', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tutor.html'));
});

app.get('/cliente', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'cliente.html'));
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tutor.html'));
});

server.listen(PORT, () => {
    console.log(`🚀 Servidor V25 corriendo en http://localhost:${PORT}`);
    console.log('   Tutor: http://localhost:3000/tutor');
    console.log('   Cliente: http://localhost:3000/cliente');
});