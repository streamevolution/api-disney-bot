require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');
const fs = require('fs');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');

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
// RUTAS WEB (HTML)
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
// EL BOT DE WHATSAPP
// ==========================================

async function iniciarBotWhatsApp() {
    // Usamos la carpeta limpia
    const { state, saveCreds } = await useMultiFileAuthState('/data/sesion_limpia_01');
    
    const { version, isLatest } = await fetchLatestBaileysVersion();
    console.log(`📡 Usando WhatsApp v${version.join('.')}`);

    const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['Ubuntu', 'Chrome', '20.0.04'],
        syncFullHistory: false, 
        connectTimeoutMs: 60000 
    });

    sock.ev.on('creds.update', saveCreds);

    if (!sock.authState.creds.registered) {
        const NUMERO_DEL_BOT = "525664140028"; // Tu número del chip del bot
        
        if(NUMERO_DEL_BOT === "") {
            console.log("❌ ERROR: Olvidaste poner tu número de teléfono.");
        } else {
            setTimeout(async () => {
                try {
                    let codigo = await sock.requestPairingCode(NUMERO_DEL_BOT);
                    codigo = codigo?.match(/.{1,4}/g)?.join("-") || codigo;
                    console.log('\n======================================================');
                    console.log('📱 VINCULA TU WHATSAPP CON ESTE CÓDIGO: ' + codigo);
                    console.log('======================================================\n');
                } catch (error) {
                    console.log('❌ Error generando el código. Revisa tu número:', error);
                }
            }, 3000); 
        }
    }

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update;
        
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('⚠️ Conexión cerrada. Reconectando...', shouldReconnect);
            if (shouldReconnect) {
                iniciarBotWhatsApp();
            }
        } else if (connection === 'open') {
            console.log('✅ ¡Bot de WhatsApp Conectado y Listo!');
        }
    });

    sock.ev.on('messages.upsert', async m => {
        const msg = m.messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const textoOriginal = msg.message.conversation || msg.message.extendedTextMessage?.text || '';
        if (!textoOriginal) return;

        const comandoBruto = textoOriginal.trim().split(/\s+/)[0].toLowerCase();
        const jid = msg.key.remoteJid; 

        // =======================================================
        // TU NÚMERO DE ADMINISTRADOR
        // =======================================================
        const ADMIN_NUMBER = "7719624236"; 
        const isAdmin = jid.includes(ADMIN_NUMBER);

        // --- MINI BASE DE DATOS ---
        const dbFile = '/data/usuarios.json';
        if (!fs.existsSync(dbFile)) fs.writeFileSync(dbFile, JSON.stringify({}));
        let db = JSON.parse(fs.readFileSync(dbFile));

        // ==========================================
        // COMANDOS DE ADMINISTRADOR
        // ==========================================
        
        // COMANDO: !agregar
        if (comandoBruto.startsWith('!agregar/')) {
            if (!isAdmin) return await sock.sendMessage(jid, { text: "❌ No tienes permisos de administrador." });
            
            const partes = textoOriginal.trim().split('/'); 
            if (partes.length === 3) {
                const numNuevo = partes[1] + '@s.whatsapp.net';
                const dias = parseInt(partes[2]);
                const vencimiento = new Date();
                vencimiento.setDate(vencimiento.getDate() + dias);
                db[numNuevo] = vencimiento.toISOString();
                fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
                return await sock.sendMessage(jid, { text: `✅ *CLIENTE REGISTRADO*\n📱 Número: ${partes[1]}\n⏳ Días: ${dias}\n📅 Vence el: ${vencimiento.toLocaleDateString('es-MX')}` });
            } else {
                return await sock.sendMessage(jid, { text: "⚠️ Formato incorrecto. Usa: !agregar/numero/dias" });
            }
        }

        // COMANDO: !quitar
        if (comandoBruto.startsWith('!quitar/')) {
            if (!isAdmin) return;
            const partes = textoOriginal.trim().split('/');
            if (partes.length === 2) {
                const numQuitar = partes[1] + '@s.whatsapp.net';
                delete db[numQuitar];
                fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
                return await sock.sendMessage(jid, { text: `🗑️ *CLIENTE ELIMINADO*\nEl número ${partes[1]} ya no tiene acceso.` });
            }
        }

        // COMANDO SECRETO: !limpiardb
        if (comandoBruto === '!limpiardb') {
            if (!isAdmin) return; 
            db = {}; 
            fs.writeFileSync(dbFile, JSON.stringify(db, null, 2)); 
            return await sock.sendMessage(jid, { text: "🚨 *SISTEMA REINICIADO* 🚨\nLa base de datos ha sido vaciada por completo. Ningún cliente tiene acceso en este momento." });
        }

        // COMANDO DE LIMPIEZA: !borrarbasura
        if (comandoBruto === '!borrarbasura') {
            if (!isAdmin) return; 
            const carpetaVieja = '/data/sesion_bot_whatsapp';
            if (fs.existsSync(carpetaVieja)) {
                fs.rmSync(carpetaVieja, { recursive: true, force: true });
                return await sock.sendMessage(jid, { text: "🧹 *BASURA ELIMINADA*\nLa sesión vieja y corrupta ha sido borrada de tu disco duro." });
            } else {
                return await sock.sendMessage(jid, { text: "👍 *TODO LIMPIO*\nNo se encontró ninguna sesión vieja que borrar." });
            }
        }

        // ==========================================
        // VERIFICADOR DE ACCESO (Para los clientes)
        // ==========================================
        if (comandoBruto.startsWith('!') && !isAdmin) {
            const fechaVencimiento = db[jid] ? new Date(db[jid]) : null;
            const ahora = new Date();

            if (!fechaVencimiento) {
                return await sock.sendMessage(jid, { text: "❌ *ACCESO DENEGADO*\nNo estás registrado en el sistema. Contacta a soporte para adquirir tu membresía." });
            } else if (ahora > fechaVencimiento) {
                return await sock.sendMessage(jid, { text: "❌ *MEMBRESÍA VENCIDA*\nTu tiempo de acceso ha caducado. Por favor, renueva tu suscripción." });
            }
        }

        // ==========================================
        // COMANDOS DEL BOT
        // ==========================================
        const matchCorreo = textoOriginal.match(/([a-zA-Z0-9._+-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9._-]+)/);
        const emailLimpio = matchCorreo ? matchCorreo[1] : null;

        async function buscarYResponder(ruta, plataforma, email) {
            await sock.sendMessage(jid, { text: `⏳ Buscando en *${plataforma}* para:\n${email}...` });
            try {
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
                    } else if (data.tipo === 'pago') {
                        await sock.sendMessage(jid, { text: `✅ *PAGO ENCONTRADO*\nNombre: ${data.datos.nombre}\nMonto: ${data.datos.monto}\nFecha: ${data.datos.fecha}` });
                    }
                } else {
                    await sock.sendMessage(jid, { text: `❌ *No encontrado:*\n${data.mensaje || data.error}` });
                }
            } catch (error) {
                await sock.sendMessage(jid, { text: `❌ Error interno conectando con el panel.` });
            }
        }

        if (comandoBruto === '!ayuda' || comandoBruto === '!reglas') {
            const mensajeAyuda = `🤖 *¡Hola! Soy el Bot Automático de Soporte.* 🤖\n\nPara pedir un código o enlace, escríbeme el comando de la plataforma seguido del correo de tu cuenta.\n\n👉 *Ejemplo:* \`!netflix tucorreo@gmail.com\`\n\n📌 *COMANDOS DISPONIBLES:*\n📺 *Netflix:* !netflix | !netflixpass\n🏰 *Disney:* !disney | !disneyhogar\n🎵 *Spotify:* !spotify\n🍿 *HBO Max:* !hbo | !hbopass\n⚽ *Vix:* !vixpass\n🍥 *Crunchyroll:* !crunchypass`;
            await sock.sendMessage(jid, { text: mensajeAyuda });
        }
        else if (comandoBruto === '!netflix' && emailLimpio) await buscarYResponder('/buscar-codigo-netflix', 'Netflix (Acceso)', emailLimpio);
        else if (comandoBruto === '!netflixpass' && emailLimpio) await buscarYResponder('/buscar-pass-netflix', 'Netflix (Contraseña)', emailLimpio);
        else if (comandoBruto === '!disney' && emailLimpio) await buscarYResponder('/buscar-correo', 'Disney (Acceso)', emailLimpio);
        else if (comandoBruto === '!disneyhogar' && emailLimpio) await buscarYResponder('/buscar-enlace-hogar', 'Disney (Hogar)', emailLimpio);
        else if (comandoBruto === '!spotify' && emailLimpio) await buscarYResponder('/buscar-codigo-spotify', 'Spotify', emailLimpio);
        else if (comandoBruto === '!hbo' && emailLimpio) await buscarYResponder('/buscar-codigo-hbo', 'HBO Max (Acceso)', emailLimpio);
        else if (comandoBruto === '!hbopass' && emailLimpio) await buscarYResponder('/buscar-pass-hbo', 'HBO Max (Contraseña)', emailLimpio);
        else if (comandoBruto === '!vixpass' && emailLimpio) await buscarYResponder('/buscar-enlace-vix', 'ViX (Contraseña)', emailLimpio);
        else if (comandoBruto === '!crunchypass' && emailLimpio) await buscarYResponder('/buscar-pass-crunchyroll', 'Crunchyroll (Contraseña)', emailLimpio);
    });
}

app.listen(PORT, () => { 
    console.log(`🚀 Servidor web corriendo en el puerto ${PORT}`); 
    iniciarBotWhatsApp(); 
});
