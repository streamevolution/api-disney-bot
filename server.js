require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

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
// RUTA 6: NU - VERIFICAR PAGO
// ==========================================
app.post('/buscar-pago-nu', async (req, res) => {
    const { nombre, monto, fecha } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
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

                let nombreBuscado = nombre.replace(/\s+/g, ' ').trim().toUpperCase();
                let montoBuscado = parseFloat(monto.replace(/\$/g, '').replace(/,/g, '')); 
                let fechaBuscada = fecha.replace(/\s+/g, ' ').trim().toUpperCase(); 

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
                    datosExtraidos = {
                        nombre: nombreCorreo,
                        monto: "$" + montoCorreoStr,
                        fecha: fechaCorreo,
                        hora: horaCorreo
                    };
                    break; 
                }
            }

            if (pagoEncontrado) {
                res.json({ success: true, tipo: 'pago', resultado: "Validado", datos: datosExtraidos });
            } else {
                res.json({ success: true, tipo: 'error', resultado: `No se encontró depósito exacto de ${nombre} por $${monto} el día ${fecha}.` });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontraron notificaciones de Nu en tu bandeja.` });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
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
// RUTA 11: STORI - VERIFICAR PAGO
// ==========================================
app.post('/buscar-pago-stori', async (req, res) => {
    const { clave_rastreo, monto, fecha } = req.body; 
    const config = obtenerConfiguracion();
    let connection;

    try {
        connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Busca correos del remitente y con "Recibiste" en el asunto
        const searchCriteria = [
            ['FROM', 'cuenta@info.storicard.com'],
            ['HEADER', 'SUBJECT', 'Recibiste']
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let pagoEncontrado = false;
            let datosExtraidos = {};

            const limite = Math.max(0, messages.length - 20);
            
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;
                
                // Limpiar HTML y saltos de línea
                let textoLimpio = rawBody.replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
                let textoNormalizado = textoLimpio.replace(/\s+/g, ' ').toUpperCase(); 

                // Normalizar los datos ingresados desde el Front-End
                let claveBuscada = clave_rastreo.replace(/\s+/g, '').trim().toUpperCase();
                let montoBuscado = parseFloat(monto.replace(/\$/g, '').replace(/,/g, '')); 
                let fechaBuscada = fecha.replace(/\s+/g, ' ').trim().toUpperCase(); // ej. "31 MAR 2026"

                // Extracciones mediante expresiones regulares
                const matchMonto = textoNormalizado.match(/MONTO\s*\$?([0-9,.]+)/);
                const matchClave = textoNormalizado.match(/CLAVE DE RASTREO\s*([A-Z0-9]+)/);
                const matchReferencia = textoNormalizado.match(/REFERENCIA NUM.*?RICA\s*([0-9]+)/);
                
                // Extraer fecha y hora (ej: "31 MAR 2026 06:28:16")
                const matchFechaHora = textoNormalizado.match(/(\d{1,2}\s+[A-Z]{3}\s+\d{4})\s+([0-9:]+)/);

                let montoCorreoStr = matchMonto ? matchMonto[1].replace(/,/g, '') : "0";
                let montoCorreo = parseFloat(montoCorreoStr); 
                
                let claveCorreo = matchClave ? matchClave[1].trim() : "";
                let refCorreo = matchReferencia ? matchReferencia[1].trim() : "";
                
                let fechaCorreo = matchFechaHora ? matchFechaHora[1].trim() : "Fecha no detectada";
                let horaCorreo = matchFechaHora ? matchFechaHora[2].trim() : "Hora no detectada";

                let montoEsExacto = (montoCorreo === montoBuscado);
                
                // Validar si la clave/referencia ingresada coincide
                let claveEsExacta = (claveBuscada === claveCorreo || claveBuscada === refCorreo);
                
                // Respaldo de seguridad por si el regex falla pero la clave está en el cuerpo
                if (!claveEsExacta) {
                    claveEsExacta = textoNormalizado.includes(claveBuscada);
                }

                // Respaldo de seguridad para la fecha
                let fechaEsExacta = textoNormalizado.includes(fechaBuscada); 

                // Si todo coincide
                if (claveEsExacta && montoEsExacto && fechaEsExacta) {
                    pagoEncontrado = true;
                    // Determinar qué clave mostrar (le da prioridad a la Clave de Rastreo si vienen las dos)
                    let claveMostrar = claveCorreo || refCorreo || claveBuscada;
                    
                    datosExtraidos = {
                        clave_rastreo: claveMostrar,
                        monto: "$" + montoCorreoStr,
                        fecha: fechaCorreo !== "Fecha no detectada" ? fechaCorreo : fechaBuscada,
                        hora: horaCorreo
                    };
                    break; 
                }
            }

            if (pagoEncontrado) {
                res.json({ success: true, tipo: 'pago', resultado: "Validado", datos: datosExtraidos });
            } else {
                res.json({ success: true, tipo: 'error', resultado: `No se encontró depósito exacto de la referencia ${clave_rastreo} por $${monto} el día ${fecha}.` });
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => { console.log(`Servidor corriendo en el puerto ${PORT}`); });
