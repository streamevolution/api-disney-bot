require('dotenv').config();
const express = require('express');
const imaps = require('imap-simple');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// ==========================================
// RUTA 1: DISNEY - ACCESO (INTACTA)
// ==========================================
app.post('/buscar-correo', async (req, res) => {
    const { email_usuario } = req.body; 
    const config = obtenerConfiguracion();

    try {nvvkhkhiihhhohohlhlhl
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
// RUTA 2: DISNEY - HOGAR (INTACTA)
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
// RUTA 3: VIX - ENLACE DE CONTRASEÑA (INTACTA)
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
            let bodyLimpio = rawBody.replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
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
// RUTA 4: NETFLIX - CÓDIGO DE INICIO (INTACTA)
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
// RUTA 5: NETFLIX - ENLACE DE CONTRASEÑA (INTACTA)
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
            
            let bodyLimpio = rawBody.replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
            
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
// RUTA 6: NU - VERIFICAR PAGO (CORREGIDA PARA MEMORIA LARGA)
// ==========================================
app.post('/buscar-pago-nu', async (req, res) => {
    const { nombre, monto, hora } = req.body; 
    const config = obtenerConfiguracion();

    try {
        const connection = await imaps.connect(config);
        await connection.openBox('INBOX');

        // Búsqueda específica con el correo y asunto que me compartiste
        const searchCriteria = [
            ['FROM', 'noresponda@nu.com.mx'],
            ['HEADER', 'SUBJECT', 'transferencia']
        ];
        
        const fetchOptions = { bodies: ['TEXT'], markSeen: false };
        const messages = await connection.search(searchCriteria, fetchOptions);

        if (messages.length > 0) {
            let pagoEncontrado = false;
            let datosExtraidos = {};

            // AUMENTAMOS LA MEMORIA: Ahora revisa los últimos 100 correos para que detecte tus pruebas antiguas
            const limite = Math.max(0, messages.length - 100);
            for (let i = messages.length - 1; i >= limite; i--) {
                const rawBody = messages[i].parts[0].body;
                
                let textoLimpio = rawBody.replace(/<[^>]+>/g, ' ').replace(/=\r?\n/g, '').replace(/=3D/gi, '=');
                let textoParaBuscar = textoLimpio.replace(/\s+/g, ' ').toLowerCase();

                let nombreBuscado = nombre.replace(/\s+/g, ' ').toLowerCase();
                // Limpiamos la búsqueda por si el usuario escribe el símbolo "$" en la caja de texto
                let montoBuscado = monto.replace(/\$/g, '').replace(/\s+/g, '').toLowerCase(); 
                let horaBuscada = hora.replace(/\s+/g, '').toLowerCase(); 

                if (textoParaBuscar.includes(nombreBuscado) && textoParaBuscar.includes(montoBuscado) && textoParaBuscar.includes(horaBuscada)) {
                    pagoEncontrado = true;
                    
                    const matchMonto = textoLimpio.match(/Monto:\s*\$([0-9,.]+)/i);
                    const matchFecha = textoLimpio.match(/Fecha:\s*([0-9]{1,2}\s+[A-Za-z]{3}\s+[0-9]{4})/i);
                    const matchHora = textoLimpio.match(/Hora:\s*([0-9]{1,2}:[0-9]{2})/i);

                    datosExtraidos = {
                        nombre: nombre.toUpperCase(),
                        monto: matchMonto ? "$" + matchMonto[1] : "$" + monto,
                        fecha: matchFecha ? matchFecha[1] : "Fecha validada en sistema",
                        hora: matchHora ? matchHora[1] : hora
                    };
                    break; 
                }
            }

            if (pagoEncontrado) {
                res.json({ success: true, tipo: 'pago', resultado: "Validado", datos: datosExtraidos });
            } else {
                res.json({ success: true, tipo: 'error', resultado: `No se encontró depósito de ${nombre} por $${monto} a las ${hora}.` });
            }
        } else {
            res.json({ success: false, mensaje: `No se encontraron notificaciones del banco Nu en tu bandeja.` });
        }
        connection.end();
    } catch (error) {
        res.status(500).json({ success: false, error: "Error interno del servidor." });
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
