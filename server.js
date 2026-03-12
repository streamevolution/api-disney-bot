require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// ==========================================
// FUNCIÓN PARA FORMATEAR LA FECHA DEL CORREO
// ==========================================
function formatearFecha(dateInput) {
    if (!dateInput) return "Fecha desconocida";
    try {
        const d = new Date(dateInput);
        return d.toLocaleString('es-MX', { 
            timeZone: 'America/Mexico_City',
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: true
        });
    } catch (e) {
        return "Fecha desconocida";
    }
}

function obtenerConfiguracion() {
    return {
        imap: {
            user: process.env.EMAIL_USER,
            password: process.env.EMAIL_PASS,
            host: 'imap.gmail.com',
            port: 993,
            tls: true,
            tlsOptions: { rejectUnauthorized: false },
            authTimeout: 3000
        }
    };
}

// ==========================================
// RUTAS WEB (HTML) - EXACTAMENTE COMO LAS TENÍAS
// ==========================================

app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const searchCriteria = [['FROM', 'disneyplus@trx.mail2.disneyplus.com'], ['HEADER', 'SUBJECT', 'Tu código de acceso único para Disney+'], ['TO', email_usuario]];
        const messages = await connection.search(searchCriteria, { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const coincidencias = textoLimpio.match(/\b\d{6}\b/g);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   '), fecha: fechaCorreo });
                } else res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
            } else res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
        } else res.json({ success: false, mensaje: `No se encontró código de Disney para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno del servidor." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-enlace-hogar', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const searchCriteria = [['FROM', 'disneyplus@trx.mail2.disneyplus.com'], ['HEADER', 'SUBJECT', 'Hogar'], ['TO', email_usuario]];
        const messages = await connection.search(searchCriteria, { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const coincidencias = textoLimpio.match(/\b\d{6}\b/g);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   '), fecha: fechaCorreo });
                } else res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
            } else res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
        } else res.json({ success: false, mensaje: `No se encontró correo de Hogar para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-enlace-vix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'vix@vix.com'], ['HEADER', 'SUBJECT', 'contraseña'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const enlacesLimpios = (bodyLimpio.match(/https?:\/\/[^\s"'><]+/gi) || []).map(l => l.replace(/"$/, '')).filter(l => l.toLowerCase().includes('vix') && !l.toLowerCase().includes('.png') && !l.toLowerCase().includes('help'));

            if (enlacesLimpios.length > 0) {
                enlacesLimpios.sort((a, b) => b.length - a.length);
                res.json({ success: true, tipo: 'enlace', resultado: enlacesLimpios[0], fecha: fechaCorreo });
            } else res.json({ success: true, tipo: 'error', resultado: "Sin enlaces válidos." });
        } else res.json({ success: false, mensaje: `No se encontró Vix para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-codigo-netflix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'info@account.netflix.com'], ['HEADER', 'SUBJECT', 'Netflix: Tu código de inicio de sesión'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const coincidencias = textoLimpio.match(/\b\d(?:\s*\d){3}\b/g);

            if (coincidencias) {
                res.json({ success: true, tipo: 'codigo', resultado: coincidencias[0].replace(/\s+/g, ''), fecha: fechaCorreo });
            } else res.json({ success: true, tipo: 'error', resultado: "No se detectaron 4 dígitos." });
        } else res.json({ success: false, mensaje: `No se encontró código de Netflix para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-pass-netflix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'info@account.netflix.com'], ['HEADER', 'SUBJECT', 'restablecimiento'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const enlacesLimpios = (bodyLimpio.match(/https?:\/\/[^\s"'><]+/gi) || []).map(l => l.replace(/"$/, '')).filter(l => l.toLowerCase().includes('netflix') && !l.toLowerCase().includes('.png') && !l.toLowerCase().includes('help'));

            if (enlacesLimpios.length > 0) {
                enlacesLimpios.sort((a, b) => b.length - a.length);
                res.json({ success: true, tipo: 'enlace', resultado: enlacesLimpios[0], fecha: fechaCorreo });
            } else res.json({ success: true, tipo: 'error', resultado: "Sin enlaces válidos." });
        } else res.json({ success: false, mensaje: `No se encontró restablecimiento de Netflix para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-pago-nu', async (req, res) => {
    const { nombre, monto, fecha } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['HEADER', 'SUBJECT', 'transferencia']], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            let pagoEncontrado = false; let datosExtraidos = {};
            const limite = Math.max(0, messages.length - 20);
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;
                let textoNormalizado = rawBody.replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=3D/gi, '=').replace(/\s+/g, ' ').toUpperCase(); 
                
                let nomB = nombre.replace(/\s+/g, ' ').trim().toUpperCase();
                let monB = parseFloat(monto.replace(/\$/g, '').replace(/,/g, '')); 
                let fechB = fecha.replace(/\s+/g, ' ').trim().toUpperCase(); 

                const matchName = textoNormalizado.match(/:\s*([A-Z\s]+)\s+HIZO UNA TRANSFERENCIA/);
                const matchMonto = textoNormalizado.match(/MONTO:\s*\$([0-9,.]+)/);
                const matchFecha = textoNormalizado.match(/FECHA:\s*([0-9A-Z\s]+?)(?=\s*HORA:|$)/);
                const matchHora = textoNormalizado.match(/HORA:\s*([0-9:]+)/);

                let nC = matchName ? matchName[1].trim() : "";
                let mC = parseFloat(matchMonto ? matchMonto[1].replace(/,/g, '') : "0"); 
                let fC = matchFecha ? matchFecha[1].trim() : "";
                let hC = matchHora ? matchHora[1].trim() : "No detectada";

                if ((nC === nomB) && (mC === monB) && textoNormalizado.includes("FECHA: " + fechB)) {
                    pagoEncontrado = true;
                    datosExtraidos = { nombre: nC, monto: "$" + mC, fecha: fC, hora: hC };
                    break; 
                }
            }
            if (pagoEncontrado) res.json({ success: true, tipo: 'pago', resultado: "Validado", datos: datosExtraidos });
            else res.json({ success: true, tipo: 'error', resultado: `No se encontró depósito de ${nombre} por $${monto}.` });
        } else res.json({ success: false, mensaje: `No se encontraron notificaciones de Nu.` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-pass-crunchyroll', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'hello@info.crunchyroll.com'], ['HEADER', 'SUBJECT', 'Restablece'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            let enlaceReal = null;
            
            const regexTagA = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            while ((match = regexTagA.exec(bodyLimpio)) !== null) {
                if (match[2].toLowerCase().replace(/<[^>]+>/g, '').includes('clic')) { enlaceReal = match[1]; break; }
            }
            if (!enlaceReal) {
                const enlacesUPN = bodyLimpio.match(/https?:\/\/links\.mail\.crunchyroll\.com\/ls\/click\?upn=[^\s"'><]+/gi) || [];
                if (enlacesUPN.length > 0) enlaceReal = enlacesUPN.sort((a, b) => b.length - a.length)[0];
            }
            if (enlaceReal) res.json({ success: true, tipo: 'enlace', resultado: enlaceReal, fecha: fechaCorreo });
            else res.json({ success: true, tipo: 'error', resultado: "No se halló el enlace." });
        } else res.json({ success: false, mensaje: `No se encontró Crunchyroll para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-codigo-hbo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'no-reply@alerts.hbomax.com'], ['HEADER', 'SUBJECT', 'HBO Max'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const coincidencias = textoLimpio.match(/\b\d{6}\b/g);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) res.json({ success: true, tipo: 'codigo', resultado: codigosReales[0], fecha: fechaCorreo });
                else res.json({ success: true, tipo: 'error', resultado: "Solo colores." });
            } else res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
        } else res.json({ success: false, mensaje: `No se encontró código de Max para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-pass-hbo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'no-reply@alerts.hbomax.com'], ['HEADER', 'SUBJECT', 'restablecer tu contraseña'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            let enlaceReal = null;
            
            const regexTagA = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            let match;
            while ((match = regexTagA.exec(bodyLimpio)) !== null) {
                if (match[2].toUpperCase().includes('RESTABLECER')) { enlaceReal = match[1]; break; }
            }
            if (!enlaceReal) {
                const enlacesLimpios = (bodyLimpio.match(/https?:\/\/[^\s"'><]+/gi) || []).map(l => l.replace(/"$/, '')).filter(l => !l.toLowerCase().includes('.png') && !l.toLowerCase().includes('help'));
                if (enlacesLimpios.length > 0) enlaceReal = enlacesLimpios.sort((a, b) => b.length - a.length)[0];
            }
            if (enlaceReal) res.json({ success: true, tipo: 'enlace', resultado: enlaceReal, fecha: fechaCorreo });
            else res.json({ success: true, tipo: 'error', resultado: "No se halló el botón." });
        } else res.json({ success: false, mensaje: `No se encontró restablecimiento de Max para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});

app.post('/buscar-codigo-spotify', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;
    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');
        const messages = await connection.search([['FROM', 'no-reply@alerts.spotify.com'], ['HEADER', 'SUBJECT', 'Tu código de inicio de sesión de Spotify'], ['TO', email_usuario]], { bodies: ['TEXT'], markSeen: false });

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            const fechaCorreo = formatearFecha(messages[messages.length - 1].attributes.date);
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const coincidencias = textoLimpio.match(/\b\d{6}\b/g);

            if (coincidencias) {
                const codigosLimpios = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosLimpios.length > 0) res.json({ success: true, tipo: 'codigo', resultado: codigosLimpios[0], fecha: fechaCorreo });
                else res.json({ success: true, tipo: 'error', resultado: "No se pudo extraer el código." });
            } else res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
        } else res.json({ success: false, mensaje: `No se encontró código de Spotify para: ${email_usuario}` });
    } catch (error) { res.status(500).json({ success: false, error: "Error interno." });
    } finally { if (connection) connection.end(); }
});


// ==========================================
// EL BOT DE WHATSAPP (LIGERO Y CONECTADO)
// ==========================================

async function iniciarBotWhatsApp() {
    // Guarda la sesión para que no te pida QR a cada rato
    const { state, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true, // Esto imprime el QR en los Logs de Railway
        browser: ['Panel Admin', 'Chrome', '1.0.0']
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        
        if (qr) {
            // Imprime un código QR pequeñito en la consola para escanearlo fácil
            qrcode.generate(qr, { small: true });
            console.log('\n======================================================');
            console.log('¡ESCENEA ESTE QR EN TU WHATSAPP PARA CONECTAR EL BOT!');
            console.log('======================================================\n');
        }

        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('Conexión cerrada. Reconectando...', shouldReconnect);
            if (shouldReconnect) {
                iniciarBotWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Bot de WhatsApp Conectado y Listo!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        // Ignorar si el mensaje lo enviaste tú mismo desde otro dispositivo, o si no hay texto
        if (!msg.message || msg.key.fromMe) return;

        const texto = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        const comando = texto.toLowerCase().trim();
        const jid = msg.key.remoteJid; // El número de WhatsApp que te escribió

        // TRUCO MAESTRO: Hacer una petición interna a tu propio servidor local
        async function buscarYResponder(ruta, plataforma, email) {
            await sock.sendMessage(jid, { text: `⏳ Buscando en *${plataforma}* para: ${email}...` });
            try {
                // Hacemos un fetch local. ¡Cero consumo extra de procesador!
                const response = await fetch(`http://127.0.0.1:${PORT}${ruta}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email_usuario: email })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    if (data.tipo === 'codigo') {
                        await sock.sendMessage(jid, { text: `✅ *CÓDIGO:* ${data.resultado}\n🕒 *Recibido:* ${data.fecha}` });
                    } else if (data.tipo === 'enlace') {
                        await sock.sendMessage(jid, { text: `✅ *ENLACE ENCONTRADO:*\n${data.resultado}\n🕒 *Recibido:* ${data.fecha}` });
                    }
                } else {
                    await sock.sendMessage(jid, { text: `❌ *No encontrado:* ${data.mensaje || data.error}` });
                }
            } catch (error) {
                await sock.sendMessage(jid, { text: `❌ Error de red interno intentando buscar.` });
            }
        }

        // ==========================================
        // COMANDOS DEL BOT
        // ==========================================
        if (comando.startsWith('!netflix ')) {
            const email = comando.split(' ')[1];
            if(email) await buscarYResponder('/buscar-codigo-netflix', 'Netflix', email);
        }
        else if (comando.startsWith('!spotify ')) {
            const email = comando.split(' ')[1];
            if(email) await buscarYResponder('/buscar-codigo-spotify', 'Spotify', email);
        }
        else if (comando.startsWith('!disney ')) {
            const email = comando.split(' ')[1];
            if(email) await buscarYResponder('/buscar-correo', 'Disney (Acceso)', email);
        }
        // Puedes agregar más comandos copiando la estructura de arriba (ej. !vix, !max)
    });
}

// Iniciar servidor y bot al mismo tiempo
app.listen(PORT, () => { 
    console.log(`Servidor web corriendo en el puerto ${PORT}`); 
    iniciarBotWhatsApp(); // Encendemos el bot en cuanto el servidor está listo
});
