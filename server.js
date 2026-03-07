require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA 1: DISNEY - ACCESO 
// ==========================================
app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Tu código de acceso único para Disney+'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   ') });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de acceso para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 2: DISNEY - HOGAR 
// ==========================================
app.post('/buscar-enlace-hogar', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'disneyplus@trx.mail2.disneyplus.com'],
            ['HEADER', 'SUBJECT', 'Hogar'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            const regexCodigo = /\b\d{6}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosReales = coincidencias.filter(num => num !== '707070' && num !== '000000');
                if (codigosReales.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: [...new Set(codigosReales)].join('   |   ') });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "Solo se encontraron colores." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron 6 dígitos en el correo de hogar." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró el correo de Actualización de Hogar para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 3: VIX - ENLACE DE CONTRASEÑA 
// ==========================================
app.post('/buscar-enlace-vix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'vix@vix.com'],
            ['HEADER', 'SUBJECT', 'contraseña'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            const regexEnlaces = /https?:\/\/[^\s"'><]+/gi;
            const enlacesEncontrados = bodyLimpio.match(regexEnlaces) || [];
            const enlacesLimpios = enlacesEncontrados.map(link => link.replace(/"$/, '')).filter(link => 
                link.toLowerCase().includes('vix') && 
                !link.toLowerCase().includes('.png') && 
                !link.toLowerCase().includes('.jpg') && 
                !link.toLowerCase().includes('.gif') && 
                !link.toLowerCase().includes('logo') && 
                !link.toLowerCase().includes('image') && 
                !link.toLowerCase().includes('pixel') && 
                !link.toLowerCase().includes('facebook') && 
                !link.toLowerCase().includes('twitter') && 
                !link.toLowerCase().includes('instagram') && 
                !link.toLowerCase().includes('help') && 
                !link.toLowerCase().includes('support') && 
                !link.toLowerCase().includes('privacy') && 
                !link.toLowerCase().includes('legal')
            );

            if (enlacesLimpios.length > 0) {
                enlacesLimpios.sort((a, b) => b.length - a.length);
                res.json({ success: true, tipo: 'enlace', resultado: enlacesLimpios[0] });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no se hallaron enlaces válidos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo de cambio de contraseña de Vix para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    }
});

// ==========================================
// RUTA 4: NETFLIX - CÓDIGO DE INICIO 
// ==========================================
app.post('/buscar-codigo-netflix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'info@account.netflix.com'],
            ['HEADER', 'SUBJECT', 'Netflix: Tu código de inicio de sesión'],
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let textoLimpio = rawBody.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=[0-9A-F]{2}/gi, ' ');
            
            const regexCodigo = /\b\d(?:\s*\d){3}\b/g; 
            const coincidencias = textoLimpio.match(regexCodigo);

            if (coincidencias) {
                const codigosLimpios = coincidencias.map(num => num.replace(/\s+/g, ''));
                if (codigosLimpios.length > 0) {
                    res.json({ success: true, tipo: 'codigo', resultado: codigosLimpios[0] });
                } else {
                    res.json({ success: true, tipo: 'error', resultado: "No se pudo extraer el código." });
                }
            } else {
                res.json({ success: true, tipo: 'error', resultado: "No se detectaron los 4 dígitos del código." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un código de Netflix para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 5: NETFLIX - ENLACE DE CONTRASEÑA 
// ==========================================
app.post('/buscar-pass-netflix', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'info@account.netflix.com'],
            ['HEADER', 'SUBJECT', 'restablecimiento'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            
            const regexEnlaces = /https?:\/\/[^\s"'><]+/gi;
            const enlacesEncontrados = bodyLimpio.match(regexEnlaces) || [];

            const enlacesLimpios = enlacesEncontrados.map(link => link.replace(/"$/, '')).filter(link => 
                link.toLowerCase().includes('netflix') && 
                !link.toLowerCase().includes('beaconimages') && 
                !link.toLowerCase().includes('.png') && 
                !link.toLowerCase().includes('.jpg') && 
                !link.toLowerCase().includes('.gif') && 
                !link.toLowerCase().includes('logo') && 
                !link.toLowerCase().includes('pixel') && 
                !link.toLowerCase().includes('facebook') && 
                !link.toLowerCase().includes('twitter') && 
                !link.toLowerCase().includes('instagram') && 
                !link.toLowerCase().includes('help')
            );

            if (enlacesLimpios.length > 0) {
                enlacesLimpios.sort((a, b) => b.length - a.length);
                const enlaceReal = enlacesLimpios[0];

                res.json({ success: true, tipo: 'enlace', resultado: enlaceReal });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no se hallaron enlaces válidos." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo de restablecimiento de Netflix para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
    }
});

// ==========================================
// RUTA 6: NU - VERIFICAR PAGO 
// ==========================================
app.post('/buscar-pago-nu', async (req, res) => {
    const { nombre, monto, fecha } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['HEADER', 'SUBJECT', 'transferencia']
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let pagoEncontrado = false;
            let datosExtraidos = {};

            const limite = Math.max(0, messages.length - 100);
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
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
    }
});

// ==========================================
// RUTA 7: CRUNCHYROLL - EXACTAMENTE LO QUE PEDISTE
// ==========================================
app.post('/buscar-pass-crunchyroll', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        const searchCriteria = [
            ['FROM', 'hello@info.crunchyroll.com'],
            ['HEADER', 'SUBJECT', 'Restablece'], 
            ['TO', email_usuario] 
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            const rawBody = messages[messages.length - 1].parts[0].body;
            let bodyLimpio = rawBody.replace(/=3D/gi, '=').replace(/=\r?\n/g, '');
            
            // Busca la etiqueta de enlace que tenga exactamente el texto "haz clic"
            const regexTagA = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
            
            let enlaceReal = null;
            let match;

            while ((match = regexTagA.exec(bodyLimpio)) !== null) {
                let url = match[1];
                let textoInterno = match[2].toLowerCase().replace(/<[^>]+>/g, ''); // limpia etiquetas basura

                // Si el enlace está envolviendo las palabras "haz clic", ESE ES EL BUENO.
                if (textoInterno.includes('haz clic') || textoInterno.includes('click')) {
                    enlaceReal = url;
                    break;
                }
            }

            // Respaldo por si falla el texto: Busca el token gigante y agarra el más largo
            if (!enlaceReal) {
                const regexUPN = /https?:\/\/links\.mail\.crunchyroll\.com\/ls\/click\?upn=[^\s"'><]+/gi;
                const enlacesUPN = bodyLimpio.match(regexUPN) || [];
                if (enlacesUPN.length > 0) {
                    enlacesUPN.sort((a, b) => b.length - a.length);
                    enlaceReal = enlacesUPN[0];
                }
            }

            if (enlaceReal) {
                res.json({ success: true, tipo: 'enlace', resultado: enlaceReal });
            } else {
                res.json({ success: true, tipo: 'error', resultado: "Se encontró el correo, pero no se halló el enlace 'haz clic'." });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontró un correo de restablecimiento de Crunchyroll para: ${email_usuario}` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno en el servidor." });
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
