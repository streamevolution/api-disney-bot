require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');
const admin = require('firebase-admin');

// 1. INICIALIZAR FIREBASE ADMIN CON SEGURIDAD
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : undefined
        })
    });
}
const db = admin.firestore();

const app = express();
app.use(cors());
app.use(express.json());

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

// ==========================================
// RUTA 1: DISNEY - ACCESO 
// ==========================================
app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Tu código de acceso único para Disney+'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   '), fecha: fechaCorreo });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de acceso para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 2: DISNEY - HOGAR 
// ==========================================
app.post('/buscar-enlace-hogar', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Hogar'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   '), fecha: fechaCorreo });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos en el correo." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró el correo de Hogar para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 3: VIX - ENLACE DE CONTRASEÑA 
// ==========================================
app.post('/buscar-enlace-vix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'vix@vix.com'],
            ['HEADER', 'SUBJECT', 'contraseña'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const regexEnlaces = /https?:\/\/[^\s"'><]+/gi;
            const enlacesEncontrados = bodyLimpio.match(regexEnlaces) || [];
            const enlacesLimpios = enlacesEncontrados.map(link => link.replace(/"$/, '')).filter(link => 
                link.toLowerCase().includes('vix') && !link.toLowerCase().includes('.png') && !link.toLowerCase().includes('.jpg') && !link.toLowerCase().includes('help')
            );

            if (enlacesLimpios.length > 0) {
                enlacesLimpios.sort((a, b) => b.length - a.length);
                res.json({ success: true, tipo: 'enlace', resultado: enlacesLimpios[0], fecha: fechaCorreo });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no enlaces válidos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró correo de restablecimiento de Vix para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 4: NETFLIX - CÓDIGO DE INICIO 
// ==========================================
app.post('/buscar-codigo-netflix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'info@account.netflix.com'],
            ['HEADER', 'SUBJECT', 'Netflix: Tu código de inicio de sesión'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const regexCodigo = /\b\d(?:\s*\d){3}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosLimpios = coincidencias.map(num => num.replace(/\s+/g, ''));
                if (codigosLimpios.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: codigosLimpios[0], fecha: fechaCorreo });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "No se pudo extraer el código." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 4 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de Netflix para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 5: NETFLIX - ENLACE DE CONTRASEÑA 
// ==========================================
app.post('/buscar-pass-netflix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'info@account.netflix.com'],
            ['HEADER', 'SUBJECT', 'restablecimiento'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);
            
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const regexEnlaces = /https?:\/\/[^\s"'><]+/gi;
            const enlacesEncontrados = bodyLimpio.match(regexEnlaces) || [];

            const enlacesLimpios = enlacesEncontrados.map(link => link.replace(/"$/, '')).filter(link => 
                link.toLowerCase().includes('netflix') && !link.toLowerCase().includes('.png') && !link.toLowerCase().includes('help')
            );

            if (enlacesLimpios.length > 0) {
                enlacesLimpios.sort((a, b) => b.length - a.length);
                res.json({ success: true, tipo: 'enlace', resultado: enlacesLimpios[0], fecha: fechaCorreo });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no enlaces válidos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró correo de restablecimiento de Netflix para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 6: NU - VERIFICAR PAGO Y SUMAR SALDO (SEGURO ANTI-FRAUDE)
// ==========================================
app.post('/buscar-pago-nu', async (req, res) => {
    const { uid, emailUser, nombre, concepto, monto, fecha, banco } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        if (!uid || !concepto || !nombre || !monto || !fecha) {
            return res.status(400).json({ success: false, error: "Faltan datos enviados desde la página." });
        }

        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [['HEADER', 'SUBJECT', 'transferencia']];
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let pagoEncontrado = false;
            let datosExtraidos = {};
            const limite = Math.max(0, messages.length - 20);
            
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;
                let textoLimpio = rawBody.replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
                let textoNormalizado = textoLimpio.replace(/\s+/g, ' ').toUpperCase(); 

                let nombreBuscado = String(nombre).replace(/\s+/g, ' ').trim().toUpperCase();
                let montoBuscado = parseFloat(String(monto).replace(/\$/g, '').replace(/,/g, '')); 
                let fechaBuscada = String(fecha).replace(/\s+/g, ' ').trim().toUpperCase(); 

                const matchName = textoNormalizado.match(/:\s*([A-Z\s]+)\s+HIZO UNA TRANSFERENCIA/);
                const matchMonto = textoNormalizado.match(/MONTO:\s*\$([0-9,.]+)/);
                const matchFecha = textoNormalizado.match(/FECHA:\s*([0-9A-Z\s]+?)(?=\s*HORA:|$)/);
                const matchHora = textoNormalizado.match(/HORA:\s*([0-9:]+)/);

                let nombreCorreo = matchName ? matchName[1].trim() : "";
                let montoCorreoStr = matchMonto ? matchMonto[1].replace(/,/g, '') : "0";
                let montoCorreo = parseFloat(montoCorreoStr); 
                let fechaCorreo = matchFecha ? matchFecha[1].trim() : "";
                let horaCorreo = matchHora ? matchHora[1].trim() : "No detectada";

                let nombreEsExacto = (nombreCorreo === nombreBuscado);
                let montoEsExacto = (montoCorreo === montoBuscado);
                let fechaEsExacta = textoNormalizado.includes("FECHA: " + fechaBuscada); 

                if (nombreEsExacto && montoEsExacto && fechaEsExacta) {
                    pagoEncontrado = true;
                    
                    // CREACIÓN DE HUELLA INQUEBRANTABLE (Ignora lo que el usuario escribió)
                    // Une: NU-MARINALIZBETHPEREZARANDA-13JUN2026-200
                    let huellaSegura = "NU-" + nombreCorreo.replace(/\s+/g, '') + "-" + fechaCorreo.replace(/\s+/g, '') + "-" + montoCorreoStr;

                    datosExtraidos = {
                        nombre: nombreCorreo,
                        monto: "$" + montoCorreoStr,
                        fecha: fechaCorreo,
                        hora: horaCorreo,
                        clave_rastreo: huellaSegura // La huella fuerte se va a Firebase
                    };
                    break; 
                }
            }

            if (pagoEncontrado) {
                const db = admin.firestore();
                const clave = datosExtraidos.clave_rastreo;
                const montoNum = parseFloat(datosExtraidos.monto.replace('$', '').replace(',', ''));

                try {
                    await db.runTransaction(async (t) => {
                        const huellaRef = db.collection('huellas_bancarias_nu').doc(clave);
                        const huellaDoc = await t.get(huellaRef);
                        
                        // Si el usuario tramposo intenta cobrar de nuevo, esto lo bloquea de inmediato
                        if (huellaDoc.exists) throw new Error("DUPLICADO");
                        
                        const userRef = db.collection('usuarios').doc(uid);
                        const userDoc = await t.get(userRef);
                        let saldoActual = userDoc.exists ? (userDoc.data().saldo || 0) : 0;
                        let totalRecargadoActual = userDoc.exists ? (userDoc.data().totalRecargado || 0) : 0;
                        let mesProgresoActual = userDoc.exists ? (userDoc.data().mesProgreso || "") : "";
                        
                        const mesActual = new Date().toISOString().slice(0, 7);
                        let nuevoHistorial = montoNum;
                        if (mesProgresoActual === mesActual) {
                            nuevoHistorial = totalRecargadoActual + montoNum;
                        }

                        // Guardamos la huella inquebrantable
                        t.set(huellaRef, {
                            banco: "NU", 
                            clave_rastreo: clave, 
                            fechaValidacion: admin.firestore.FieldValue.serverTimestamp(),
                            monto: montoNum, 
                            usuarioAcreditado: uid, 
                            emailAcreditado: emailUser, 
                            bancoOrigen: banco || "NU",
                            conceptoInventadoPorUsuario: concepto // Guardamos el concepto solo por referencia, pero no como llave principal
                        });

                        t.set(userRef, { 
                            saldo: saldoActual + montoNum,
                            totalRecargado: nuevoHistorial,
                            mesProgreso: mesActual
                        }, { merge: true });
                        
                        const nuevoPedidoRef = db.collection('solicitudes_servicios').doc();
                        t.set(nuevoPedidoRef, {
                            usuarioId: uid, userId: uid, userEmail: emailUser, servicioNombre: "Recarga de Saldo - NU",
                            costo: montoNum, estado: "Completado", status: "completado", fecha: new Date().toLocaleString('es-MX'),
                            createdAt: admin.firestore.FieldValue.serverTimestamp(), tipo: "RECARGA", clave_rastreo: concepto, bancoOrigen: banco || "NU"
                        });
                    });
                    
                    res.json({ success: true, tipo: 'pago', resultado: "Validado", datos: datosExtraidos });
                } catch (errTx) {
                    if (errTx.message === "DUPLICADO") {
                        res.json({ success: false, tipo: 'duplicado', error: "Folio Duplicado." });
                    } else {
                        res.json({ success: false, error: "Error en BD: " + errTx.message });
                    }
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: `No se encontró depósito exacto de ${nombre} por $${monto}.` });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontraron notificaciones de Nu en tu bandeja.` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Fallo en servidor: " + (error.message || error) });
    } finally {
        if (connection) { connection.end(); }
    }
});


// ==========================================
// RUTA 7: CRUNCHYROLL - ENLACE 
// ==========================================
app.post('/buscar-pass-crunchyroll', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'hello@info.crunchyroll.com'],
            ['HEADER', 'SUBJECT', 'Restablece'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const regexTagA = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            
            let enlaceReal = null;
            let match;

            while ((match = regexTagA.exec(bodyLimpio)) !== null) {
                let url = match[1];
                let textoInterno = match[2].toLowerCase().replace(/<[^>]+>/g, '');

                if (textoInterno.includes('haz clic') || textoInterno.includes('click')) {
                    enlaceReal = url;
                    break;
                }
            }

            if (!enlaceReal) {
                const regexUPN = /https?:\/\/links\.mail\.crunchyroll\.com\/ls\/click\?upn=[^\s"'><]+/gi;
                const enlacesUPN = bodyLimpio.match(regexUPN) || [];
                if (enlacesUPN.length > 0) {
                    enlacesUPN.sort((a, b) => b.length - a.length);
                    enlaceReal = enlacesUPN[0];
                }
            }

            if (enlaceReal) {
                res.json({ success: true, tipo: 'enlace', resultado: enlaceReal, fecha: fechaCorreo });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no se halló el enlace." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo de restablecimiento de Crunchyroll para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 8: HBO MAX - CÓDIGO DE UN SOLO USO
// ==========================================
app.post('/buscar-codigo-hbo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'no-reply@alerts.hbomax.com'],
            ['HEADER', 'SUBJECT', 'HBO Max'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   '), fecha: fechaCorreo });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron los 6 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de HBO Max para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 9: HBO MAX - ENLACE DE CONTRASEÑA 
// ==========================================
app.post('/buscar-pass-hbo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'no-reply@alerts.hbomax.com'],
            ['HEADER', 'SUBJECT', 'restablecer tu contraseña'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const regexTagA = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            
            let enlaceReal = null;
            let match;

            while ((match = regexTagA.exec(bodyLimpio)) !== null) {
                let url = match[1];
                let textoInterno = match[2].toUpperCase().replace(/<[^>]+>/g, '');

                if (textoInterno.includes('RESTABLECER')) {
                    enlaceReal = url;
                    break;
                }
            }

            if (!enlaceReal) {
                const regexEnlaces = /https?:\/\/[^\s"'><]+/gi;
                const enlacesEncontrados = bodyLimpio.match(regexEnlaces) || [];
                const enlacesLimpios = enlacesEncontrados.map(link => link.replace(/"$/, '')).filter(link => 
                    !link.toLowerCase().includes('.png') && !link.toLowerCase().includes('help')
                );
                
                if (enlacesLimpios.length > 0) {
                    enlacesLimpios.sort((a, b) => b.length - a.length);
                    enlaceReal = enlacesLimpios[0];
                }
            }

            if (enlaceReal) {
                res.json({ success: true, tipo: 'enlace', resultado: enlaceReal, fecha: fechaCorreo });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no se halló el botón." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo de restablecimiento de HBO Max para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 10: SPOTIFY - CÓDIGO DE INICIO
// ==========================================
app.post('/buscar-codigo-spotify', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'no-reply@alerts.spotify.com'],
            ['HEADER', 'SUBJECT', 'Tu código de inicio de sesión de Spotify'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            const rawBody = lastMessage.parts[0].body;
            const fechaCorreo = formatearFecha(lastMessage.attributes.date);

            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosLimpios = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosLimpios.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: codigosLimpios[0], fecha: fechaCorreo });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "No se pudo extraer el código de Spotify." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron los 6 dígitos del código en el correo." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de Spotify para: ${email_usuario}` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor al buscar Spotify." });
    } finally {
        if (connection) { connection.end(); }
    }
});

// ==========================================
// RUTA 11: STORI - VERIFICAR PAGO CON BANCO
// ==========================================
app.post('/buscar-pago-stori', async (req, res) => {
    // AHORA RECIBIMOS LA CLAVE, EL BANCO Y EL MONTO
    const { clave_rastreo, banco, monto } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'cuenta@info.storicard.com']
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let pagoEncontrado = false;
            let datosExtraidos = {};

            const limite = Math.max(0, messages.length - 30);
            
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;
                
                // DESTRUCCIÓN DE FORMATO: Borramos todo lo que NO sea letra o número
                let textoSuperLimpio = rawBody.replace(/[^a-zA-Z0-9$.]/g, '').toUpperCase();
                
                // Normalizamos los datos de búsqueda
                let claveBuscadaLimpia = clave_rastreo.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                let bancoBuscadoLimpio = banco.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                let montoBuscadoFloat = parseFloat(monto.replace(/[^0-9.]/g, '')); 

                // 1. Verificamos la clave
                let claveEsExacta = textoSuperLimpio.includes(claveBuscadaLimpia);

                // 2. Verificamos el Banco (Entidad Emisora)
                // Al quitar los espacios "ENTIDAD EMISORA MIFEL" se vuelve "ENTIDADEMISORAMIFEL"
                let bancoEsExacto = textoSuperLimpio.includes("ENTIDADEMISORA" + bancoBuscadoLimpio);

                // Si no lo encuentra como Entidad Emisora, buscamos si el correo en general dice "RECIBISTE $1.00 DE MIFEL"
                if (!bancoEsExacto) {
                    bancoEsExacto = textoSuperLimpio.includes("DE" + bancoBuscadoLimpio);
                }

                // 3. Verificamos el monto
                let montoEsExacto = false;
                let montoCorreoStr = "0";

                const matchMonto = textoSuperLimpio.match(/MONTO\$?([0-9.]+)/);
                if (matchMonto) {
                    let montoEnCorreo = parseFloat(matchMonto[1]);
                    if (montoEnCorreo === montoBuscadoFloat) {
                        montoEsExacto = true;
                        montoCorreoStr = matchMonto[1];
                    }
                }

                if (!montoEsExacto) {
                    const matchRecibiste = textoSuperLimpio.match(/RECIBISTE\$?([0-9.]+)/);
                    if (matchRecibiste) {
                        let montoEnCorreo = parseFloat(matchRecibiste[1]);
                        if (montoEnCorreo === montoBuscadoFloat) {
                            montoEsExacto = true;
                            montoCorreoStr = matchRecibiste[1];
                        }
                    }
                }

                // AHORA TIENEN QUE COINCIDIR LAS 3 COSAS: Clave, Banco y Monto
                if (claveEsExacta && bancoEsExacto && montoEsExacto) {
                    pagoEncontrado = true;
                    
                    datosExtraidos = {
                        clave_rastreo: clave_rastreo.toUpperCase(), // Mostramos la original para el diseño
                        banco: banco.toUpperCase(),                 // Mostramos el banco original para el diseño
                        monto: "$" + montoCorreoStr,
                        fecha_recibido: formatearFecha(messages[i].attributes.date)
                    };
                    break; 
                }
            }

            if (pagoEncontrado) {
                // ==========================================
                // NUEVO CANDADO DE SEGURIDAD NIVEL BANCO
                // ==========================================
                const uid = req.user.uid; 
                const emailUser = req.user.email;
                const db = admin.firestore();
                const clave = datosExtraidos.clave_rastreo;
                
                // Extraemos el monto REAL del correo, ignorando lo que el usuario pida
                const montoNum = parseFloat(datosExtraidos.monto.replace('$', '').replace(',', ''));

                try {
                    // Ejecutamos la Transacción directamente en el servidor seguro
                    await db.runTransaction(async (t) => {
                        const huellaRef = db.collection('huellas_bancarias_nu').doc(clave);
                        const huellaDoc = await t.get(huellaRef);
                        
                        // 1. Verificamos si alguien ya cobró este folio antes
                        if (huellaDoc.exists) {
                            throw new Error("DUPLICADO");
                        }
                        
                        const userRef = db.collection('usuarios').doc(uid);
                        const userDoc = await t.get(userRef);
                        let saldoActual = 0;
                        if (userDoc.exists) saldoActual = userDoc.data().saldo || 0;

                        const nuevoPedidoRef = db.collection('solicitudes_servicios').doc();

                        // 2. Creamos la huella para que nadie más la use
                        t.set(huellaRef, {
                            banco: "NU",
                            clave_rastreo: clave,
                            fechaValidacion: admin.firestore.FieldValue.serverTimestamp(),
                            monto: montoNum,
                            usuarioAcreditado: uid,
                            emailAcreditado: emailUser
                        });

                        // 3. Sumamos el saldo al usuario
                        t.update(userRef, { saldo: saldoActual + montoNum });

                        // 4. Guardamos el recibo en su historial
                        t.set(nuevoPedidoRef, {
                            usuarioId: uid,
                            userId: uid,
                            userEmail: emailUser,
                            servicioNombre: "Recarga de Saldo - NU",
                            costo: montoNum,
                            estado: "Completado",
                            status: "completado",
                            fecha: new Date().toLocaleString('es-MX'),
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            tipo: "RECARGA",
                            clave_rastreo: clave
                        });
                    });
                    
                    // Si todo salió bien, le avisamos a la página
                    res.json({ success: true, tipo: 'pago', resultado: "Validado", datos: datosExtraidos });
                } catch (error) {
                    if (error.message === "DUPLICADO") {
                        res.json({ success: false, tipo: 'duplicado', error: "Esta transferencia ya fue cobrada y registrada anteriormente. No se puede cobrar dos veces." });
                    } else {
                        res.json({ success: false, error: "Error interno en base de datos: " + error.message });
                    }
                }
            } else {
                res.json({ success: false, tipo: 'error', error: `No se encontró depósito de la clave ${clave_rastreo} por ${monto}.` });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontraron notificaciones de Stori en tu bandeja.` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor al buscar en Stori." });
    } finally {
        if (connection) { connection.end(); }
    }
});

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
// RUTA SEGURA: PROCESAR COMPRA (ANTI-F12)
// ==========================================
app.post('/procesar-compra', async (req, res) => {
    const { uid, email, servicioId, ecosistema, datosLlenos, esAutoEntrega, cuentaId, cuentaInfo, precioCobrarFront, precioOriginal, esGratisVIP, tituloServicio, categoria, estadoFinal, respuestaAdministrador } = req.body;
    
    try {
        const userRef = db.collection('usuarios').doc(uid);
        const serviceRef = db.collection(ecosistema).doc(servicioId);
        const newOrderRef = db.collection('solicitudes_servicios').doc();
        let cuentaRef = cuentaId ? db.collection('cuentas_streaming').doc(cuentaId) : null;

        await db.runTransaction(async (transaction) => {
            const userDoc = await transaction.get(userRef);
            const serviceDoc = await transaction.get(serviceRef);
            const cuentaCheck = cuentaRef ? await transaction.get(cuentaRef) : null;

            if (!userDoc.exists) throw new Error("USER_NOT_FOUND");
            if (!serviceDoc.exists) throw new Error("OUT_OF_STOCK"); 

            // EL ESCUDO ANTI-F12: Calculamos el precio real DESDE EL SERVIDOR, ignorando la consola de Chrome
            let precioRealDB = parseFloat(serviceDoc.data().price.replace(/[^0-9.-]+/g,"")) || 0;
            let precioFinalServidor = precioRealDB;
            let userData = userDoc.data();

            // Verificamos VIP real directamente en la base de datos
            if (userData.membresiaActiva && (userData.membresiaVence === 'permanente' || Date.now() < userData.membresiaVence)) {
                const configVIP = await transaction.get(db.collection('configuracion').doc('membresias_vip'));
                if (configVIP.exists && configVIP.data().lista && configVIP.data().lista.length > 0) {
                    let vipParams = configVIP.data().lista[0];
                    if (esGratisVIP && vipParams.docsGratis) {
                        let regalo = vipParams.docsGratis.find(g => g.id === servicioId);
                        let usosActuales = userData.usosGratisVIP ? (userData.usosGratisVIP[servicioId] || 0) : 0;
                        if (regalo && usosActuales < regalo.cantidad) {
                            precioFinalServidor = 0;
                        }
                    } else if (vipParams.preciosVip) {
                        let desc = vipParams.preciosVip.find(p => p.id === servicioId);
                        if (desc && desc.precioVip < precioFinalServidor) {
                            precioFinalServidor = desc.precioVip;
                        }
                    }
                }
            }

            // BLOQUEO DEFINITIVO: Si el usuario manipuló el precio en F12, se bloquea la transacción
            if (precioCobrarFront < precioFinalServidor) {
                throw new Error("HACKING_DETECTED");
            }

            const saldoActual = userData.saldo || 0;
            if (saldoActual < precioFinalServidor) throw new Error("INSUFFICIENT_FUNDS");

            if (esAutoEntrega) {
                let stockActual = serviceDoc.data().stock || 0;
                if (stockActual <= 0) throw new Error("OUT_OF_STOCK");
                if (cuentaCheck && cuentaCheck.data().estado !== 'disponible') throw new Error("ACCOUNT_TAKEN");

                transaction.update(serviceRef, { stock: stockActual - 1 });
                if (cuentaRef) {
                    transaction.update(cuentaRef, { estado: 'vendida', comprador: uid, fechaVenta: admin.firestore.FieldValue.serverTimestamp() });
                }
            }

            let updateData = { saldo: saldoActual - precioFinalServidor };
            if (precioFinalServidor === 0 && esGratisVIP) {
                let usos = userData.usosGratisVIP || {};
                usos[servicioId] = (usos[servicioId] || 0) + 1;
                updateData.usosGratisVIP = usos;
            }
            transaction.update(userRef, updateData);

            let estadoFinalReal = esAutoEntrega ? "Completado" : estadoFinal;

            let ordenData = {
                costo: precioFinalServidor, precio: precioFinalServidor, total: precioFinalServidor,
                precioOriginal: precioRealDB,
                esGratisVIP: precioFinalServidor === 0 && esGratisVIP,
                esDescuentoVIP: precioFinalServidor > 0 && precioFinalServidor < precioRealDB,
                estado: estadoFinalReal, tipo: categoria, servicio: tituloServicio,
                fecha: new Date().toLocaleString('es-MX'), 
                fechaCompra: admin.firestore.FieldValue.serverTimestamp(), 
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                usuarioId: uid, servicioNombre: tituloServicio, usuarioEmail: email, datosProporcionados: datosLlenos,
                category: categoria, serviceName: tituloServicio, pricePaid: precioFinalServidor,
                datosFormulario: datosLlenos, date: new Date().toLocaleString('es-MX'), userEmail: email, userId: uid, status: estadoFinalReal.toLowerCase(),
                ecosistema: ecosistema
            };

            if(respuestaAdministrador !== "") {
                ordenData.respuestaTexto = respuestaAdministrador; ordenData.notaAdjunta = respuestaAdministrador;
            }
            if (esAutoEntrega && cuentaInfo) {
                ordenData.cuentaAsignada = cuentaInfo;
            }

            transaction.set(newOrderRef, ordenData);
        });

        res.json({ success: true });

    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==========================================
// RUTA 12: RECOMPENSAS DE JERARQUÍA AUTOMÁTICAS
// ==========================================
app.post('/recompensa-jerarquia', async (req, res) => {
    const { uid, email, nivel, recompensa, nombreNivel } = req.body;
    try {
        const db = admin.firestore();
        const userRef = db.collection('usuarios').doc(uid);
        const pedidoRef = db.collection('solicitudes_servicios').doc();

        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error("Usuario no encontrado");

            let data = userDoc.data();
            let jerarquiaActual = data.jerarquiaCobrada || 0;
            
            if (nivel <= jerarquiaActual) {
                throw new Error("Esta recompensa ya fue cobrada.");
            }

            let saldoActual = data.saldo || 0;
            
            t.update(userRef, { 
                saldo: saldoActual + parseFloat(recompensa),
                jerarquiaCobrada: nivel 
            });

            t.set(pedidoRef, {
                servicioNombre: "Recompensa de Rango",
                usuarioEmail: email,
                usuarioId: uid,
                userId: uid,
                costo: parseFloat(recompensa), 
                precio: parseFloat(recompensa), 
                total: parseFloat(recompensa),
                tipo: "FINANZAS", 
                ecosistema: "tramites",
                fecha: new Date().toLocaleString('es-MX'),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                estado: "Completado", 
                status: "completado",
                datosProporcionados: { "Rango Alcanzado": nombreNivel, "Recompensa Acreditada": "$" + recompensa + " MXN" }
            });
        });
        res.json({ success: true });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

// ==========================================
// RUTA 13: COBRO Y GENERACIÓN DE REFERIDOS
// ==========================================
app.post('/cobrar-referido', async (req, res) => {
    const { uid, email, costoReferido } = req.body; 
    try {
        const db = admin.firestore();
        const userRef = db.collection('usuarios').doc(uid);
        const enlaceRef = db.collection('enlaces_referidos').doc();
        const pedidoRef = db.collection('solicitudes_servicios').doc();
        
        let codigoGenerado = "";

        await db.runTransaction(async (t) => {
            const userDoc = await t.get(userRef);
            if (!userDoc.exists) throw new Error("Usuario no encontrado");
            
            let saldoActual = userDoc.data().saldo || 0;
            
            if (saldoActual < costoReferido) {
                throw new Error("SALDO_INSUFICIENTE");
            }

            codigoGenerado = "REF-" + Math.random().toString(36).substring(2, 8).toUpperCase() + "-" + uid.substring(0, 4).toUpperCase();

            t.update(userRef, { saldo: saldoActual - parseFloat(costoReferido) });

            t.set(enlaceRef, {
                codigo: codigoGenerado,
                creadorId: uid,
                creadorEmail: email,
                activo: true,
                usos: 0,
                fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
            });

            t.set(pedidoRef, {
                servicioNombre: "Generación Enlace Referido",
                usuarioEmail: email,
                usuarioId: uid,
                userId: uid,
                costo: parseFloat(costoReferido),
                precio: parseFloat(costoReferido),
                total: parseFloat(costoReferido),
                tipo: "FINANZAS",
                ecosistema: "tramites",
                fecha: new Date().toLocaleString('es-MX'),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                estado: "Completado",
                status: "completado",
                datosProporcionados: { "Código Generado": codigoGenerado }
            });
        });

        res.json({ success: true, codigo: codigoGenerado });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});


// ==========================================
// RUTA 14: TRANSFERENCIA DE SALDO ENTRE USUARIOS
// ==========================================
app.post('/transferir-saldo', async (req, res) => {
    const { uid, email, emailDestino, monto } = req.body;
    try {
        const db = admin.firestore();
        const montoInput = parseFloat(monto);
        const comision = 10;
        const totalADescontar = montoInput + comision;

        if (montoInput < 50) throw new Error("El monto mínimo es de $50 MXN.");
        if (email.toLowerCase() === emailDestino.toLowerCase()) throw new Error("No puedes transferirte a ti mismo.");

        // 1. Buscamos al destinatario en el servidor
        const destinatariosSnapshot = await db.collection('usuarios').where('email', '==', emailDestino.toLowerCase()).limit(1).get();
        if (destinatariosSnapshot.empty) {
            throw new Error("DESTINATARIO_NO_ENCONTRADO");
        }
        
        const destinatarioDocRef = destinatariosSnapshot.docs[0].ref;
        const destinatarioId = destinatariosSnapshot.docs[0].id;
        const remitenteRef = db.collection('usuarios').doc(uid);

        const historialRemitenteRef = db.collection('solicitudes_servicios').doc();
        const historialDestinatarioRef = db.collection('solicitudes_servicios').doc();

        // 2. Transacción atómica a puerta cerrada
        await db.runTransaction(async (t) => {
            const remitenteDoc = await t.get(remitenteRef);
            const destDoc = await t.get(destinatarioDocRef);

            if (!remitenteDoc.exists) throw new Error("Usuario remitente no encontrado.");
            
            const saldoRemitente = remitenteDoc.data().saldo || 0;
            const saldoDestinatario = destDoc.data().saldo || 0;

            if (saldoRemitente < totalADescontar) {
                throw new Error("SALDO_INSUFICIENTE");
            }

            // Movemos el dinero
            t.update(remitenteRef, { saldo: saldoRemitente - totalADescontar });
            t.update(destinatarioDocRef, { saldo: saldoDestinatario + montoInput });

            // Dejamos registro para el que envía
            t.set(historialRemitenteRef, {
                usuarioId: uid,
                usuarioEmail: email,
                servicio: "Transferencia Enviada",
                tipo: "FINANZAS",
                costo: totalADescontar,
                estado: "Completado",
                fecha: new Date().toLocaleString('es-MX'),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                datosProporcionados: {
                    "Destinatario": emailDestino,
                    "Monto Enviado": "$" + montoInput.toFixed(2),
                    "Comisión": "$" + comision.toFixed(2)
                }
            });

            // Dejamos registro para el que recibe
            t.set(historialDestinatarioRef, {
                usuarioId: destinatarioId,
                usuarioEmail: emailDestino,
                servicio: "Transferencia Recibida",
                tipo: "FINANZAS",
                costo: 0,
                estado: "Completado",
                fecha: new Date().toLocaleString('es-MX'),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                datosProporcionados: {
                    "Remitente": email,
                    "Monto Recibido": "$" + montoInput.toFixed(2)
                }
            });
        });

        res.json({ success: true, totalDescontado: totalADescontar });
    } catch (error) {
        res.json({ success: false, error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor corriendo en el puerto ${PORT}`); });
