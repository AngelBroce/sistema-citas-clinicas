import { v4 as uuidv4 } from 'uuid';
import QRCode from 'qrcode';
import pino from 'pino';
import path from 'path';
import fs from 'fs';
import {
  ConfiguracionEmpresaWhatsApp,
  ConversacionWhatsAppItem,
  MensajeChatbotItem,
  CitaResponse,
  EstadoConexionQRWhatsApp
} from '../types/index.js';
import { TriajeService } from './triaje.service.js';
import { AgendamientoService } from './agendamiento.service.js';

export interface EntidadesExtraidasIA {
  intencion: 'SALUDO_O_MENU' | 'OPCION_NUMERICA' | 'SINTOMAS_TRIAJE' | 'SOLICITUD_CITA_DIRECTA' | 'PROPORCIONAR_DATOS' | 'CONFIRMAR' | 'REINICIAR' | 'FUERA_DE_DOMINIO';
  opcionElegida?: number;
  nombreExtraido?: string;
  cedulaExtraida?: string;
  fechaExtraida?: string; // YYYY-MM-DD
  etiquetaFecha?: string; // "hoy", "mañana", "lunes", etc.
  horaExtraida?: string;  // HH:mm (24h)
  etiquetaHora?: string;  // "5:00 PM", "7:00 AM", etc.
  tieneSintomasMedicos: boolean;
}

export class ChatbotService {
  // SYSTEM PROMPT MAESTRO DE IA CLÍNICA (Reglas de cómo responder y cómo NO responder)
  public static readonly SYSTEM_PROMPT_IA = `
Eres "MedPulse IA", el Asistente Clínico Oficial de WhatsApp para MedPulse (Panamá), vinculado al número empresarial +507 6598-2118.

REGLAS DE CÓMO RESPONDER:
1. Tono profesional, empático, claro y estructurado con opciones rápidas numeradas (1, 2, 3, 4) para que el paciente pueda elegir fácilmente o escribir en lenguaje natural.
2. Extrae automáticamente de cualquier frase:
   - Nombre completo del paciente (ej. "Soy Juan Pérez", "Me llamo Ana Gómez").
   - Cédula Panameña (ej. 8-1234-56789, PE-12-345, E-8-12345).
   - Fecha relativa o absoluta ("hoy", "mañana", "pasado mañana", "lunes", "2026-10-29").
   - Hora específica solicitada ("a las 5", "a las 7", "10:30 am", "3 pm").
3. Si el paciente pide una hora específica (ej. "mañana a las 5" o "hoy a las 7") y esa hora está LLENA o fuera de turno:
   - Infórmale claramente que esa hora está ocupada/llena.
   - Muéstrale opciones numeradas con los horarios libres reales más cercanos en ese día para que elija otra hora.
4. Si falta algún dato obligatorio antes de guardar la cita (Nombre, Cédula o Fecha/Hora), pídelo amablemente recordando lo que ya tienes registrado.

REGLAS DE CÓMO NO RESPONDER (GUARDRAILS ESTRICTOS):
1. NUNCA recetes medicamentos, antibióticos ni dosis farmacológicas.
2. NUNCA agendes una cita ambulatoria si el triaje detecta síntomas de EMERGENCIA ROJA (dolor de pecho, falta de aire, desmayo); en ese caso ordena acudir a Urgencias Hospitalarias inmediatamente.
3. NUNCA inventes horarios ni confirmes citas en horas que ya estén ocupadas en AgendamientoService.
4. NUNCA respondas temas ajenos a salud, medicina o citas clínicas de MedPulse.
`.trim();

  // Configuración del número empresarial (preconfigurado con el número panameño del usuario: +507 6598-2118)
  private static configEmpresa: ConfiguracionEmpresaWhatsApp = {
    nombreEmpresa: 'MedPulse Clínica Inteligente (Panamá)',
    numeroWhatsAppEmpresa: process.env.WHATSAPP_BUSINESS_NUMBER || '+507 6598-2118',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '105928374650192',
    wabaId: process.env.WHATSAPP_WABA_ID || '901283746501928',
    verifyToken: process.env.WHATSAPP_VERIFY_TOKEN || 'medpulse_wa_secure_2026',
    accessTokenConfigurado: Boolean(process.env.WHATSAPP_ACCESS_TOKEN),
    modoOperacion: process.env.WHATSAPP_ACCESS_TOKEN ? 'META_CLOUD_API_LIVE' : 'SIMULACION_LOCAL_Y_WEBHOOK',
    mensajeBienvenida: '¡Hola! Bienvenido a *MedPulse Clínica Inteligente* (+507 6598-2118). Elige una opción o cuéntame tus síntomas, fecha y hora deseada.',
    actualizadoEn: new Date().toISOString()
  };

  private static accessToken: string = process.env.WHATSAPP_ACCESS_TOKEN || '';

  // Estado del puente directo WhatsApp QR (Baileys)
  private static estadoQR: EstadoConexionQRWhatsApp = {
    estado: 'DESCONECTADO',
    qrDataUrl: null,
    qrRaw: null,
    numeroConectado: '+507 6598-2118',
    nombreConectado: null,
    ultimaActualizacion: new Date().toISOString(),
    mensajeEstado: 'Listo para generar código QR de vinculación con tu WhatsApp (+507 6598-2118).'
  };

  private static waSocket: any = null;
  private static iniciandoSocket = false;

  // Base de conversaciones en memoria
  private static conversaciones: Map<string, ConversacionWhatsAppItem> = new Map();

  public static obtenerConfiguracion(): ConfiguracionEmpresaWhatsApp {
    return this.configEmpresa;
  }

  public static obtenerEstadoQR(): EstadoConexionQRWhatsApp {
    return this.estadoQR;
  }

  public static actualizarConfiguracion(datos: Partial<ConfiguracionEmpresaWhatsApp> & { accessToken?: string }): ConfiguracionEmpresaWhatsApp {
    if (datos.nombreEmpresa !== undefined) this.configEmpresa.nombreEmpresa = datos.nombreEmpresa.trim() || this.configEmpresa.nombreEmpresa;
    if (datos.numeroWhatsAppEmpresa !== undefined) this.configEmpresa.numeroWhatsAppEmpresa = datos.numeroWhatsAppEmpresa.trim() || this.configEmpresa.numeroWhatsAppEmpresa;
    if (datos.phoneNumberId !== undefined) this.configEmpresa.phoneNumberId = datos.phoneNumberId.trim();
    if (datos.wabaId !== undefined) this.configEmpresa.wabaId = datos.wabaId.trim();
    if (datos.verifyToken !== undefined) this.configEmpresa.verifyToken = datos.verifyToken.trim() || 'medpulse_wa_secure_2026';
    if (datos.mensajeBienvenida !== undefined) this.configEmpresa.mensajeBienvenida = datos.mensajeBienvenida.trim();

    if (datos.accessToken !== undefined) {
      this.accessToken = datos.accessToken.trim();
      this.configEmpresa.accessTokenConfigurado = Boolean(this.accessToken);
      this.configEmpresa.modoOperacion = this.accessToken ? 'META_CLOUD_API_LIVE' : 'SIMULACION_LOCAL_Y_WEBHOOK';
    } else if (datos.modoOperacion) {
      this.configEmpresa.modoOperacion = datos.modoOperacion;
    }

    this.configEmpresa.actualizadoEn = new Date().toISOString();
    return this.configEmpresa;
  }

  public static listarConversaciones(): ConversacionWhatsAppItem[] {
    return Array.from(this.conversaciones.values()).sort(
      (a, b) => new Date(b.ultimaInteraccion).getTime() - new Date(a.ultimaInteraccion).getTime()
    );
  }

  public static reiniciarConversacion(telefono: string): boolean {
    const norm = this.normalizarTelefono(telefono);
    return this.conversaciones.delete(norm);
  }

  private static normalizarTelefono(telefono: string): string {
    const limpio = telefono.trim();
    return limpio || '+507 6598-2118';
  }

  // ============================================================================
  // CONEXIÓN DIRECTA CON WHATSAPP REAL MEDIANTE CÓDIGO QR (BAILEYS)
  // ============================================================================
  public static async iniciarConexionQR(forzarNuevo = false): Promise<EstadoConexionQRWhatsApp> {
    if (this.iniciandoSocket && !forzarNuevo) {
      return this.estadoQR;
    }

    try {
      this.iniciandoSocket = true;
      const authDir = path.resolve(process.cwd(), '.wa_auth_session');

      if (forzarNuevo && fs.existsSync(authDir)) {
        try {
          if (this.waSocket) {
            this.waSocket.end(undefined);
            this.waSocket = null;
          }
          fs.rmSync(authDir, { recursive: true, force: true });
        } catch {}
      }

      this.estadoQR = {
        ...this.estadoQR,
        estado: 'GENERANDO_QR',
        ultimaActualizacion: new Date().toISOString(),
        mensajeEstado: 'Conectando con los servidores de WhatsApp y generando código QR...'
      };

      const baileys = await import('@whiskeysockets/baileys');
      const makeWASocket = baileys.default || (baileys as any).makeWASocket;
      const { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } = baileys;

      const { state, saveCreds } = await useMultiFileAuthState(authDir);
      let version: [number, number, number] = [2, 3000, 1015901307];
      try {
        const vRes = await fetchLatestBaileysVersion();
        version = vRes.version;
      } catch {}

      const sock = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: true,
        logger: pino({ level: 'silent' }) as any,
        browser: ['MedPulse Clinica Panama', 'Chrome', '120.0.0']
      });

      this.waSocket = sock;

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update: any) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          try {
            const dataUrl = await QRCode.toDataURL(qr, {
              width: 300,
              margin: 2,
              color: {
                dark: '#090D16',
                light: '#FFFFFF'
              }
            });
            this.estadoQR = {
              estado: 'ESPERANDO_ESCANEO_QR',
              qrDataUrl: dataUrl,
              qrRaw: qr,
              numeroConectado: '+507 6598-2118',
              nombreConectado: null,
              ultimaActualizacion: new Date().toISOString(),
              mensajeEstado: 'Escanea este código QR desde tu WhatsApp (6598-2118) -> Dispositivos vinculados -> Vincular un dispositivo.'
            };
            console.log('[WhatsApp QR] Nuevo código QR generado y listo para escanear.');
          } catch (qrErr) {
            console.error('[WhatsApp QR Error]:', qrErr);
          }
        }

        if (connection === 'open') {
          const userJid = sock.user?.id || '';
          const numLimpio = userJid.split(':')[0].split('@')[0];
          this.estadoQR = {
            estado: 'CONECTADO',
            qrDataUrl: null,
            qrRaw: null,
            numeroConectado: numLimpio ? `+${numLimpio}` : '+507 6598-2118',
            nombreConectado: sock.user?.name || 'MedPulse WhatsApp Activo',
            ultimaActualizacion: new Date().toISOString(),
            mensajeEstado: `¡Conectado exitosamente al WhatsApp +${numLimpio || '50765982118'}! Envía un mensaje para agendar.`
          };
          this.iniciandoSocket = false;
          console.log(`[WhatsApp QR] Conectado exitosamente como +${numLimpio}`);
        }

        if (connection === 'close') {
          const statusCode = (lastDisconnect?.error as any)?.output?.statusCode;
          const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
          this.iniciandoSocket = false;

          if (shouldReconnect) {
            console.log('[WhatsApp QR] Reconectando sesión de WhatsApp...');
            setTimeout(() => this.iniciarConexionQR(false), 2500);
          } else {
            this.estadoQR = {
              estado: 'DESCONECTADO',
              qrDataUrl: null,
              qrRaw: null,
              numeroConectado: '+507 6598-2118',
              nombreConectado: null,
              ultimaActualizacion: new Date().toISOString(),
              mensajeEstado: 'Sesión cerrada. Haz clic en Generar QR para volver a vincular.'
            };
          }
        }
      });

      // Escuchar mensajes entrantes en el WhatsApp vinculado (incluyendo mensajes de prueba de uno mismo o de pacientes)
      sock.ev.on('messages.upsert', async (m: any) => {
        try {
          if (m.type !== 'notify') return;
          for (const msg of m.messages) {
            if (!msg.message) continue;
            const remoteJid = msg.key.remoteJid || '';
            if (remoteJid.endsWith('@g.us') || remoteJid === 'status@broadcast') continue;

            const texto =
              msg.message.conversation ||
              msg.message.extendedTextMessage?.text ||
              '';

            if (!texto.trim()) continue;

            // Evitar bucle infinito con las propias respuestas del bot (las respuestas del bot llevan encabezado 🩺, ✅, 🚨, 🔄, 📅 o ⏳)
            if (
              texto.startsWith('🩺') ||
              texto.startsWith('✅') ||
              texto.startsWith('🚨') ||
              texto.startsWith('🔄') ||
              texto.startsWith('📅') ||
              texto.startsWith('⏳') ||
              texto.startsWith('👋') ||
              texto.startsWith('⚠️')
            ) {
              continue;
            }

            // Si el mensaje lo envía el dueño del teléfono desde su propio chat ("Tú mismo") o desde otro contacto
            const numeroRemitente = '+' + remoteJid.split('@')[0].replace(/[^0-9]/g, '');
            const pushName = msg.pushName || 'Paciente WhatsApp';

            console.log(`[WhatsApp Live QR] Mensaje recibido de ${numeroRemitente}: "${texto}"`);

            const respuesta = await this.procesarMensajeEntrante({
              telefonoRemitente: numeroRemitente,
              nombrePerfil: pushName,
              mensajeTexto: texto
            });

            await sock.sendMessage(remoteJid, { text: respuesta.respuestaBot });
          }
        } catch (err) {
          console.error('[WhatsApp Live Message Error]:', err);
        }
      });

      // Esperar hasta 3.5 segundos si el QR se genera rápido para devolverlo en la primera llamada
      for (let i = 0; i < 14; i++) {
        if (this.estadoQR.qrDataUrl || this.estadoQR.estado === 'CONECTADO') break;
        await new Promise(r => setTimeout(r, 250));
      }

      this.iniciandoSocket = false;
      return this.estadoQR;
    } catch (error: any) {
      this.iniciandoSocket = false;
      console.error('[Error al iniciar Baileys QR]:', error);
      // Generar QR de enlace directo wa.me como fallback garantizado si el entorno bloquea WebSockets
      const waMeUrl = `https://wa.me/50765982118?text=${encodeURIComponent('Hola MedPulse, quiero agendar una cita médica para mañana a las 5')}`;
      const qrFallback = await QRCode.toDataURL(waMeUrl, { width: 300, margin: 2 });
      this.estadoQR = {
        estado: 'ESPERANDO_ESCANEO_QR',
        qrDataUrl: qrFallback,
        qrRaw: waMeUrl,
        numeroConectado: '+507 6598-2118',
        nombreConectado: null,
        ultimaActualizacion: new Date().toISOString(),
        mensajeEstado: 'Código QR directo a tu WhatsApp (+507 6598-2118) listo para escanear.'
      };
      return this.estadoQR;
    }
  }

  // ============================================================================
  // MOTOR NLU / IA CLÍNICA: EXTRACCIÓN EFICAZ DE NOMBRE, CÉDULA, FECHA Y HORA
  // ============================================================================
  public static analizarMensajeConIA(texto: string): EntidadesExtraidasIA {
    const limpio = texto.trim();
    const lower = limpio.toLowerCase();

    // 1. Detectar si eligió una opción numérica rápida (1, 2, 3, 4, 5)
    if (/^[1-5]$/.test(limpio)) {
      return {
        intencion: 'OPCION_NUMERICA',
        opcionElegida: parseInt(limpio, 10),
        tieneSintomasMedicos: false
      };
    }

    // 2. Detectar comando de reinicio
    if (['reiniciar', 'menu', 'menú', 'inicio', 'empezar', '0', 'cancelar'].includes(lower)) {
      return {
        intencion: 'REINICIAR',
        tieneSintomasMedicos: false
      };
    }

    // 3. Extraer CÉDULA PANAMEÑA (ej. 8-1234-56789, PE-12-345, E-8-123456) o DNI
    let cedulaExtraida: string | undefined;
    const regexCedulaPanama = /\b((?:1[0-3]|[1-9]|PE|E|N|PI|AV)-\d{1,5}-\d{1,6})\b/i;
    const matchPanama = limpio.match(regexCedulaPanama);
    if (matchPanama) {
      cedulaExtraida = matchPanama[1].toUpperCase();
    } else {
      const regexCedulaEtiqueta = /(?:c[eé]dula|doc(?:umento)?|dni|id)\s*[:#-]?\s*([0-9A-Za-z-]{6,15})/i;
      const matchEtiqueta = limpio.match(regexCedulaEtiqueta);
      if (matchEtiqueta) {
        cedulaExtraida = matchEtiqueta[1].toUpperCase();
      }
    }

    // 4. Extraer NOMBRE DEL PACIENTE (ej. "me llamo Juan Perez", "soy Maria Gomez", "nombre: Carlos Ruiz")
    let nombreExtraido: string | undefined;
    const patronesNombre = [
      /(?:me llamo|mi nombre es|nombre\s*[:=-]?|paciente\s*[:=-]?)\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){0,3})/i,
      /(?:^|\b)soy\s+([a-záéíóúñA-ZÁÉÍÓÚÑ]+(?:\s+[a-záéíóúñA-ZÁÉÍÓÚÑ]+){0,3})/i
    ];
    for (const pat of patronesNombre) {
      const m = limpio.match(pat);
      if (m && m[1]) {
        const candidato = m[1]
          .replace(/\b(y|con|cedula|cédula|doc|documento|para|quiero|cita|mañana|manana|hoy|el|la|a|las|tengo|siento)\b.*/i, '')
          .trim();
        if (candidato.length >= 3 && !/\d/.test(candidato)) {
          nombreExtraido = candidato
            .split(/\s+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
          break;
        }
      }
    }

    // 5. Extraer FECHA ("hoy", "mañana", "pasado mañana", día de semana o YYYY-MM-DD)
    // Tomamos la fecha actual real del sistema como punto de partida
    const hoyReal = new Date();
    let fechaExtraida: string | undefined;
    let etiquetaFecha: string | undefined;

    const formatearYYYYMMDD = (d: Date): string => {
      // Si cae domingo (0), mover al lunes siguiente para garantizar atención clínica
      if (d.getDay() === 0) {
        d.setDate(d.getDate() + 1);
      }
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    };

    const matchIso = limpio.match(/\b(202\d-\d{2}-\d{2})\b/);
    const matchSlash = limpio.match(/\b(\d{1,2})[\/](\d{1,2})[\/](202\d)\b/);

    if (matchIso) {
      fechaExtraida = matchIso[1];
      etiquetaFecha = matchIso[1];
    } else if (matchSlash) {
      fechaExtraida = `${matchSlash[3]}-${matchSlash[2].padStart(2, '0')}-${matchSlash[1].padStart(2, '0')}`;
      etiquetaFecha = fechaExtraida;
    } else if (lower.includes('pasado mañana') || lower.includes('pasado manana')) {
      const d = new Date(hoyReal);
      d.setDate(d.getDate() + 2);
      fechaExtraida = formatearYYYYMMDD(d);
      etiquetaFecha = `pasado mañana (${fechaExtraida})`;
    } else if ((lower.includes('mañana') || lower.includes('manana')) && !/por la ma[ñn]ana|de la ma[ñn]ana|en la ma[ñn]ana/i.test(lower)) {
      const d = new Date(hoyReal);
      d.setDate(d.getDate() + 1);
      fechaExtraida = formatearYYYYMMDD(d);
      etiquetaFecha = `mañana (${fechaExtraida})`;
    } else if (/\bhoy\b/i.test(lower)) {
      const d = new Date(hoyReal);
      fechaExtraida = formatearYYYYMMDD(d);
      etiquetaFecha = `hoy (${fechaExtraida})`;
    } else {
      const diasSemana: Array<{ palabras: string[]; targetDay: number; label: string }> = [
        { palabras: ['lunes'], targetDay: 1, label: 'Lunes' },
        { palabras: ['martes'], targetDay: 2, label: 'Martes' },
        { palabras: ['miercoles', 'miércoles'], targetDay: 3, label: 'Miércoles' },
        { palabras: ['jueves'], targetDay: 4, label: 'Jueves' },
        { palabras: ['viernes'], targetDay: 5, label: 'Viernes' },
        { palabras: ['sabado', 'sábado'], targetDay: 6, label: 'Sábado' }
      ];
      for (const diaInfo of diasSemana) {
        if (diaInfo.palabras.some(p => lower.includes(p))) {
          const d = new Date(hoyReal);
          const currentDay = d.getDay();
          let diff = (diaInfo.targetDay - currentDay + 7) % 7;
          if (diff === 0) diff = 7;
          d.setDate(d.getDate() + diff);
          fechaExtraida = formatearYYYYMMDD(d);
          etiquetaFecha = `${diaInfo.label} (${fechaExtraida})`;
          break;
        }
      }
    }

    // 6. Extraer HORA DESEADA (ej. "a las 5", "a las 7", "a las 9:30", "15:00", "4 pm", "10 am")
    let horaExtraida: string | undefined;
    let etiquetaHora: string | undefined;

    // Removemos primero la cédula del string temporal para no confundir números de cédula con horas
    const textoSinCedula = cedulaExtraida ? limpio.replace(cedulaExtraida, '') : limpio;
    const textoSinFecha = fechaExtraida ? textoSinCedula.replace(fechaExtraida, '') : textoSinCedula;

    const regexHora = /(?:a las|para las|hora)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|de la tarde|de la mañana)?|\b(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.|hrs|horas)\b|\b([01]?\d|2[0-3]):([0-5]\d)\b/i;
    const matchHora = textoSinFecha.match(regexHora);

    if (matchHora) {
      let hRaw = parseInt(matchHora[1] || matchHora[4] || matchHora[7], 10);
      const mRaw = parseInt(matchHora[2] || matchHora[5] || matchHora[8] || '0', 10);
      const mer = (matchHora[3] || matchHora[6] || '').toLowerCase();

      if (!isNaN(hRaw) && hRaw >= 1 && hRaw <= 23) {
        if (mer.includes('pm') || mer.includes('p.m') || mer.includes('tarde')) {
          if (hRaw < 12) hRaw += 12;
        } else if (mer.includes('am') || mer.includes('a.m') || mer.includes('mañana')) {
          if (hRaw === 12) hRaw = 0;
        } else {
          // Heurística médica inteligente: si dice "a las 5", "a las 4", "a las 3", "a las 2", "a la 1" o "a las 6", en clínica suele ser de la tarde (13:00 a 18:00),
          // mientras que "a las 7", "a las 8", "a las 9", "a las 10", "a las 11" es en la mañana (07:00 a 11:00)
          if (hRaw >= 1 && hRaw <= 6) {
            hRaw += 12;
          }
        }

        const minRedondeado = mRaw >= 15 && mRaw < 45 ? '30' : '00';
        horaExtraida = `${String(hRaw).padStart(2, '0')}:${minRedondeado}`;
        const ampmStr = hRaw >= 12 ? 'PM' : 'AM';
        const h12 = hRaw % 12 || 12;
        etiquetaHora = `${h12}:${minRedondeado} ${ampmStr} (${horaExtraida})`;
      }
    }

    // 7. Detectar si hay síntomas médicos o solicitud de triaje
    const palabrasSintomas = [
      'dolor', 'fiebre', 'cabeza', 'pecho', 'aire', 'tos', 'gripe', 'mareo', 'presion', 'presión',
      'palpitacion', 'corazon', 'corazón', 'niño', 'bebe', 'bebé', 'pediatr', 'piel', 'mancha',
      'picazon', 'alergia', 'estomago', 'vómito', 'vomito', 'malestar', 'urgencia', 'desmayo', 'sintoma', 'síntoma'
    ];
    const tieneSintomasMedicos = palabrasSintomas.some(p => lower.includes(p));

    // 8. Detectar preguntas fuera de dominio (ej. recetas de fármacos o temas no clínicos)
    const pideRecetaProhibida = /\b(recetame|recétame|que pastilla tomo|qué pastilla tomo|dame antibiotico|dame antibiótico)\b/i.test(lower);
    if (pideRecetaProhibida) {
      return {
        intencion: 'FUERA_DE_DOMINIO',
        tieneSintomasMedicos: true
      };
    }

    // Clasificar intención principal
    let intencion: EntidadesExtraidasIA['intencion'] = 'SALUDO_O_MENU';

    if (tieneSintomasMedicos) {
      intencion = 'SINTOMAS_TRIAJE';
    } else if (fechaExtraida || horaExtraida || lower.includes('cita') || lower.includes('turno') || lower.includes('agendar') || lower.includes('reservar')) {
      intencion = 'SOLICITUD_CITA_DIRECTA';
    } else if (cedulaExtraida || nombreExtraido) {
      intencion = 'PROPORCIONAR_DATOS';
    } else if (['si', 'sí', 'confirmo', 'confirmar', 'ok', 'listo', 'dale'].includes(lower)) {
      intencion = 'CONFIRMAR';
    }

    return {
      intencion,
      nombreExtraido,
      cedulaExtraida,
      fechaExtraida,
      etiquetaFecha,
      horaExtraida,
      etiquetaHora,
      tieneSintomasMedicos
    };
  }

  private static obtenerMedicoPorEspecialidad(especialidadId: number) {
    // Dr. Roberto Mendoza (Consultorio 201) -> Medicina General (1) y Cardiología (2)
    // Esto garantiza que todas las citas de prueba general o cardiológica aparezcan directamente en el Portal del Médico (/doctor y /doctor/agenda)
    if (especialidadId === 2 || especialidadId === 1) {
      return {
        medicoId: 'c0000000-0000-0000-0000-000000000001',
        medicoNombre: 'Dr. Roberto Mendoza Valdivia',
        especialidadIdReal: especialidadId === 2 ? 2 : 1,
        especialidadNombreReal: especialidadId === 2 ? 'Cardiología' : 'Medicina General',
        consultorioId: 3,
        consultorioNombre: 'Consultorio 201 (Piso 2)'
      };
    }
    return {
      medicoId: 'c0000000-0000-0000-0000-000000000002',
      medicoNombre: 'Dra. Carmen Silva Rojas',
      especialidadIdReal: 3,
      especialidadNombreReal: 'Pediatría',
      consultorioId: 2,
      consultorioNombre: 'Consultorio 102 (Piso 1)'
    };
  }

  private static formatearHora12(hhmm: string): string {
    const [hStr, mStr] = hhmm.split(':');
    const h = parseInt(hStr, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${h12}:${mStr} ${ampm}`;
  }

  /**
   * PROCESADOR CENTRAL CONVERSACIONAL (Combina Menú de Respuestas Elegibles + Prompt IA de Extracción + Verificación de Horarios Llenos)
   */
  public static async procesarMensajeEntrante(params: {
    telefonoRemitente: string;
    nombrePerfil?: string;
    mensajeTexto: string;
  }): Promise<{
    conversacion: ConversacionWhatsAppItem;
    respuestaBot: string;
    citaCreada?: CitaResponse | null;
    enviadoMetaCloud: boolean;
    entidadesDetectadas?: EntidadesExtraidasIA;
  }> {
    const remitente = this.normalizarTelefono(params.telefonoRemitente);
    const texto = params.mensajeTexto.trim();
    const ahora = new Date().toISOString();

    let conv = this.conversaciones.get(remitente);

    if (!conv) {
      conv = {
        id: uuidv4(),
        whatsappFrom: remitente,
        nombrePaciente: params.nombrePerfil && params.nombrePerfil !== 'Mi WhatsApp Personal (+507 6598-2118)' ? params.nombrePerfil : undefined,
        pacienteId: 'e0000000-0000-0000-0000-000000000001',
        estadoConversacion: 'ACTIVA',
        ultimaInteraccion: ahora,
        mensajes: []
      };
      this.conversaciones.set(remitente, conv);
    }

    const msgUsuario: MensajeChatbotItem = {
      id: uuidv4(),
      conversacionId: conv.id,
      remitente: 'USUARIO',
      tipoMensaje: 'TEXTO',
      contenido: texto,
      creadoEn: ahora
    };
    conv.mensajes.push(msgUsuario);
    conv.ultimaInteraccion = ahora;

    // 1. Analizar el texto con el extractor inteligente de entidades e intenciones
    const analisis = this.analizarMensajeConIA(texto);
    msgUsuario.intencionDetectada = analisis.intencion;

    // Guardar en la memoria de la conversación cualquier entidad que el paciente haya mencionado en este mensaje
    if (analisis.nombreExtraido) conv.nombrePaciente = analisis.nombreExtraido;
    if (analisis.cedulaExtraida) conv.cedulaPaciente = analisis.cedulaExtraida;
    if (analisis.fechaExtraida) conv.fechaDeseada = analisis.fechaExtraida;
    if (analisis.horaExtraida) conv.horaDeseada = analisis.horaExtraida;

    // ------------------------------------------------------------------------
    // REGLA DE NO RESPONDER (Guardrail Médico: Prohibido recetar medicamentos)
    // ------------------------------------------------------------------------
    if (analisis.intencion === 'FUERA_DE_DOMINIO') {
      const respGuardrail =
        `⚠️ *Aviso de Seguridad Clínica — MedPulse IA*\n\n` +
        `Como asistente médico automatizado, *no estoy autorizado para recetar medicamentos ni indicar dosis farmacológicas* por WhatsApp.\n\n` +
        `Puedo evaluarte mediante **Triaje Clínico** y agendarte una consulta con nuestros médicos especialistas. Elige una opción:\n` +
        `*1️⃣* Evaluar mis síntomas (Triaje IA)\n` +
        `*2️⃣* Agendar cita indicando fecha y hora\n` +
        `*3️⃣* Consultar horarios disponibles hoy y mañana`;
      this.agregarMensajeBot(conv, respGuardrail, 'GUARDRAIL_SEGURIDAD');
      return { conversacion: conv, respuestaBot: respGuardrail, citaCreada: null, enviadoMetaCloud: false, entidadesDetectadas: analisis };
    }

    // ------------------------------------------------------------------------
    // REINICIO O MENÚ PRINCIPAL GUIADO POR OPCIONES
    // ------------------------------------------------------------------------
    if (analisis.intencion === 'REINICIAR') {
      conv.estadoConversacion = 'ACTIVA';
      conv.nivelTriaje = undefined;
      conv.fechaDeseada = undefined;
      conv.horaDeseada = undefined;
      conv.citaCreadaCodigo = undefined;

      const respMenu = this.construirMenuPrincipal();
      this.agregarMensajeBot(conv, respMenu, 'MENU_PRINCIPAL');
      return { conversacion: conv, respuestaBot: respMenu, citaCreada: null, enviadoMetaCloud: false, entidadesDetectadas: analisis };
    }

    // ------------------------------------------------------------------------
    // MANEJO DE OPCIONES NUMÉRICAS (1, 2, 3, 4) ELEGIDAS POR EL USUARIO
    // ------------------------------------------------------------------------
    if (analisis.intencion === 'OPCION_NUMERICA') {
      const op = analisis.opcionElegida!;

      // Si el usuario estaba eligiendo una hora alternativa sugerida cuando su hora estaba ocupada
      const ctxAlternativas: string[] = (conv as any)._horasAlternativas || [];
      if (ctxAlternativas.length >= op && conv.estadoConversacion === 'ESPERANDO_CONFIRMACION') {
        conv.horaDeseada = ctxAlternativas[op - 1];
        (conv as any)._horasAlternativas = [];
        // Proceder a agendar o pedir cédula/nombre si faltan
        return await this.intentarCerrarOCompletarCita(conv, remitente, analisis);
      }

      if (op === 1) {
        conv.estadoConversacion = 'EN_TRIAJE';
        const resp =
          `🩺 *Opción 1: Evaluación de Triaje Clínico IA*\n\n` +
          `Cuéntame brevemente qué síntomas sientes o selecciona uno de estos casos frecuentes:\n\n` +
          `• Escribe tus síntomas (ej. *"Tengo fiebre de 39 y dolor de cabeza desde hace 2 días"*)\n` +
          `• O dime directamente junto con cuándo quieres tu cita (ej. *"Soy Juan Pérez, cédula 8-1234-56789, tengo palpitaciones y quiero cita mañana a las 10 am"*)`;
        this.agregarMensajeBot(conv, resp, 'INICIAR_TRIAJE');
        return { conversacion: conv, respuestaBot: resp, citaCreada: null, enviadoMetaCloud: false, entidadesDetectadas: analisis };
      }

      if (op === 2) {
        conv.estadoConversacion = 'ESPERANDO_CEDULA_FECHA';
        if (!conv.especialidadSugeridaId) {
          conv.especialidadSugeridaId = 1;
          conv.especialidadSugeridaNombre = 'Medicina General';
        }
        const resp =
          `📅 *Opción 2: Agendamiento Inteligente por Fecha y Hora*\n\n` +
          `Puedes escribirme en un solo mensaje tu **Nombre**, **Cédula**, **Fecha** (` +
          `*"hoy"*, *"mañana"* o fecha) y **Hora deseada**.\n\n` +
          `👉 *Ejemplos que entiendo automáticamente:*\n` +
          `• _"Quiero una cita para mañana a las 5, soy Carlos Ruiz, cédula 8-1234-56789"_\n` +
          `• _"Cita para hoy a las 7 am con cédula 8-888-9999"_\n` +
          `_(Si la hora que pides está llena o fuera de turno, te avisaré al instante y te daré las horas libres para que elijas otra)_`;
        this.agregarMensajeBot(conv, resp, 'INICIAR_AGENDA_DIRECTA');
        return { conversacion: conv, respuestaBot: resp, citaCreada: null, enviadoMetaCloud: false, entidadesDetectadas: analisis };
      }

      if (op === 3) {
        const hoy = new Date();
        const manana = new Date(hoy);
        manana.setDate(manana.getDate() + 1);
        if (manana.getDay() === 0) manana.setDate(manana.getDate() + 1);
        const fManana = manana.toISOString().slice(0, 10);

        const slotsCardio = await AgendamientoService.obtenerDisponibilidad('c0000000-0000-0000-0000-000000000001', fManana);
        const slotsGeneral = await AgendamientoService.obtenerDisponibilidad('c0000000-0000-0000-0000-000000000002', fManana);

        const muestraCardio = slotsCardio.slice(0, 4).map(s => this.formatearHora12(s.horaInicio)).join(', ');
        const muestraGen = slotsGeneral.slice(0, 4).map(s => this.formatearHora12(s.horaInicio)).join(', ');

        const resp =
          `🕒 *Horarios Disponibles Próximos (${fManana}):*\n\n` +
          `👨‍⚕️ *Dr. Roberto Mendoza (Cardiología - Cons. 201):*\n` +
          `Turnos libres: ${muestraCardio} ...\n\n` +
          `👩‍⚕️ *Dra. Carmen Silva (Medicina General / Pediatría - Cons. 102):*\n` +
          `Turnos libres: ${muestraGen} ...\n\n` +
          `Para reservar cualquiera, escríbeme por ejemplo:\n` +
          `*"Quiero cita mañana a las 9 am, soy Ana Gómez, cédula 8-1234-56789"*`;
        this.agregarMensajeBot(conv, resp, 'CONSULTA_DISPONIBILIDAD');
        return { conversacion: conv, respuestaBot: resp, citaCreada: null, enviadoMetaCloud: false, entidadesDetectadas: analisis };
      }

      if (op === 4) {
        const resp =
          `🚨 *Protocolo de Urgencias Médicas — MedPulse*\n\n` +
          `Si presentas **dolor fuerte en el pecho, falta de aire severa, pérdida de conocimiento o sangrado abundante**, NO esperes turno por WhatsApp.\n` +
          `Acude inmediatamente a Urgencias Hospitalarias o llama al **911**.`;
        this.agregarMensajeBot(conv, resp, 'INFO_URGENCIAS');
        return { conversacion: conv, respuestaBot: resp, citaCreada: null, enviadoMetaCloud: false, entidadesDetectadas: analisis };
      }
    }

    // ------------------------------------------------------------------------
    // SI EL MENSAJE TIENE SÍNTOMAS MÉDICOS -> EJECUTAR TRIAJE IA
    // ------------------------------------------------------------------------
    if (analisis.tieneSintomasMedicos) {
      const triaje = await TriajeService.evaluarPaciente({
        sintomas: [texto],
        motivoPrincipal: texto
      });

      const infoMedico = this.obtenerMedicoPorEspecialidad(triaje.especialidadSugeridaId);
      conv.nivelTriaje = triaje.nivelTriaje;
      conv.resumenTriaje = texto;
      conv.especialidadSugeridaId = infoMedico.especialidadIdReal;
      conv.especialidadSugeridaNombre = infoMedico.especialidadNombreReal;
      conv.medicoSugeridoId = infoMedico.medicoId;
      conv.medicoSugeridoNombre = infoMedico.medicoNombre;

      if (triaje.nivelTriaje === 'URGENTE') {
        conv.estadoConversacion = 'DERIVADA_RECEPCION';
        const respUrgente =
          `🚨 *ALERTA MÉDICA MEDPULSE — PRIORIDAD URGENTE (ROJA)*\n\n` +
          `He analizado tus síntomas (*"${texto}"*) y detecto signos de alarma crítica.\n` +
          `⚠️ *Qué debo hacer:* Acude de inmediato al cuarto de urgencias hospitalarias más cercano.\n` +
          `🚫 *Por seguridad médica:* No debo agendar una cita ambulatoria normal para estos síntomas, ya que requieres valoración presencial inmediata.`;
        this.agregarMensajeBot(conv, respUrgente, 'ALERTA_URGENTE');
        return await this.finalizarConEnvioMeta(conv, remitente, respUrgente, null, analisis);
      }

      // Si además de decir los síntomas ya dijo fecha/hora o cédula en la misma frase, intentamos validar la hora y agendar de una vez
      if (conv.fechaDeseada || conv.horaDeseada || conv.cedulaPaciente) {
        return await this.intentarCerrarOCompletarCita(conv, remitente, analisis, triaje.recomendaciones[0]);
      }

      conv.estadoConversacion = 'ESPERANDO_CEDULA_FECHA';
      const datosCapturados = [
        conv.nombrePaciente ? `• *Paciente:* ${conv.nombrePaciente}` : null,
        conv.cedulaPaciente ? `• *Cédula:* ${conv.cedulaPaciente}` : null
      ].filter(Boolean).join('\n');

      const respTriaje =
        `🩺 *Resultado de Triaje Clínico IA — MedPulse*\n\n` +
        `• *Nivel de Urgencia:* ${triaje.nivelTriaje} (${triaje.prioridadAtencion})\n` +
        `• *Especialidad Derivada:* ${infoMedico.especialidadNombreReal}\n` +
        `• *Médico Asignado:* ${infoMedico.medicoNombre}\n` +
        `• *Recomendación:* ${triaje.recomendaciones[0]}\n` +
        (datosCapturados ? `${datosCapturados}\n` : '') +
        `\n📅 *¿Para cuándo deseas tu cita?*\n` +
        `Respóndeme con tu **Nombre**, **Cédula**, **Fecha y Hora** (ej. *"Soy Juan Pérez, cédula 8-1234-56789, quiero cita para mañana a las 9 am"* o *"hoy a las 5 pm"*).`;

      this.agregarMensajeBot(conv, respTriaje, 'RESULTADO_TRIAJE');
      return await this.finalizarConEnvioMeta(conv, remitente, respTriaje, null, analisis);
    }

    // ------------------------------------------------------------------------
    // SI EL USUARIO PIDE CITA CON FECHA/HORA O ENVÍA SUS DATOS (Ej: "Quiero cita para mañana a las 5" o "hoy a las 7")
    // ------------------------------------------------------------------------
    if (
      analisis.intencion === 'SOLICITUD_CITA_DIRECTA' ||
      analisis.intencion === 'PROPORCIONAR_DATOS' ||
      analisis.intencion === 'CONFIRMAR' ||
      conv.estadoConversacion === 'ESPERANDO_CEDULA_FECHA' ||
      conv.estadoConversacion === 'ESPERANDO_CONFIRMACION'
    ) {
      return await this.intentarCerrarOCompletarCita(conv, remitente, analisis);
    }

    // ------------------------------------------------------------------------
    // SALUDO INICIAL: MOSTRAR MENÚ INTERACTIVO CON RESPUESTAS ELEGIBLES
    // ------------------------------------------------------------------------
    const respBienvenida = this.construirMenuPrincipal(conv.nombrePaciente);
    this.agregarMensajeBot(conv, respBienvenida, 'MENU_BIENVENIDA');
    return await this.finalizarConEnvioMeta(conv, remitente, respBienvenida, null, analisis);
  }

  /**
   * Valida la Fecha y Hora pedida por el paciente (ej. "mañana a las 5" o "hoy a las 7"):
   * - Si la hora está ocupada o fuera de rango -> avisa que esa hora está llena/no disponible y ofrece horarios alternativos para elegir.
   * - Si la hora está libre pero falta Cédula o Nombre -> aparta temporalmente la hora y pide el dato faltante.
   * - Si todo está completo y la hora está libre -> GUARDA la cita en AgendamientoService y envía el pase.
   */
  private static async intentarCerrarOCompletarCita(
    conv: ConversacionWhatsAppItem,
    remitente: string,
    analisis: EntidadesExtraidasIA,
    notaTriajePrevia?: string
  ): Promise<{
    conversacion: ConversacionWhatsAppItem;
    respuestaBot: string;
    citaCreada?: CitaResponse | null;
    enviadoMetaCloud: boolean;
    entidadesDetectadas?: EntidadesExtraidasIA;
  }> {
    const infoMedico = this.obtenerMedicoPorEspecialidad(conv.especialidadSugeridaId || 1);
    conv.especialidadSugeridaId = infoMedico.especialidadIdReal;
    conv.especialidadSugeridaNombre = infoMedico.especialidadNombreReal;
    conv.medicoSugeridoId = infoMedico.medicoId;
    conv.medicoSugeridoNombre = infoMedico.medicoNombre;

    // Si no especificó fecha pero sí hora (ej. "a las 7"), asumimos HOY (o lunes si hoy es domingo)
    if (!conv.fechaDeseada) {
      const hoy = new Date();
      if (hoy.getDay() === 0) hoy.setDate(hoy.getDate() + 1);
      conv.fechaDeseada = hoy.toISOString().slice(0, 10);
    }

    const fechaTarget = conv.fechaDeseada;

    // 1. Si el paciente pidió una HORA ESPECÍFICA (ej. "mañana a las 5" -> 17:00, o "hoy a las 7" -> 07:00), verificar si está libre o llena
    if (conv.horaDeseada) {
      const verificacion = await AgendamientoService.verificarSlotEspecifico(
        infoMedico.medicoId,
        fechaTarget,
        conv.horaDeseada
      );

      if (!verificacion.disponible) {
        conv.estadoConversacion = 'ESPERANDO_CONFIRMACION';
        const alternativas = verificacion.alternativasDisponibles.slice(0, 4);
        (conv as any)._horasAlternativas = alternativas.map(a => a.horaInicio);

        const horaPedida12 = this.formatearHora12(conv.horaDeseada);
        const razonTexto =
          verificacion.motivoRechazo === 'HORA_OCUPADA'
            ? `❌ *La hora ${horaPedida12} del día ${fechaTarget} ya está LLENA / OCUPADA* (Reservada en agenda: ${verificacion.citaExistenteCodigo}).`
            : `⏳ *La hora ${horaPedida12} del día ${fechaTarget} está fuera del turno disponible del especialista* (Horario de atención: 08:00 AM a 06:00 PM).`;

        const listaOpciones = alternativas.length > 0
          ? alternativas
              .map((alt, idx) => `*${idx + 1}️⃣* ${this.formatearHora12(alt.horaInicio)} (${alt.horaInicio} hrs)`)
              .join('\n')
          : 'No quedan turnos para esa fecha. Por favor indícame otro día (ej. *"mañana a las 9 am"*).';

        // Limpiamos la hora rechazada para que elija otra
        conv.horaDeseada = undefined;

        const respOcupado =
          `${razonTexto}\n\n` +
          `👨‍⚕️ *Médico:* ${infoMedico.medicoNombre} (${infoMedico.especialidadNombreReal})\n` +
          `📅 *Fecha seleccionada:* ${fechaTarget}\n\n` +
          `Por favor *prueba otra hora* respondiendo con el número de opción o escribiendo la hora:\n` +
          `${listaOpciones}`;

        this.agregarMensajeBot(conv, respOcupado, 'HORA_OCUPADA_ALTERNATIVAS');
        return await this.finalizarConEnvioMeta(conv, remitente, respOcupado, null, analisis);
      }
    }

    // 2. Si la fecha y hora son válidas, revisamos si ya identificamos CÉDULA y NOMBRE; si no, los pedimos amablemente
    if (!conv.cedulaPaciente) {
      conv.estadoConversacion = 'ESPERANDO_CEDULA_FECHA';
      const horaConfirmadaTxt = conv.horaDeseada
        ? `a las *${this.formatearHora12(conv.horaDeseada)}*`
        : `(primer turno disponible del día)`;

      const respPedirCedula =
        `👍 ¡Perfecto${conv.nombrePaciente ? `, *${conv.nombrePaciente}*` : ''}! Tengo disponible la fecha *${fechaTarget}* ${horaConfirmadaTxt} con *${infoMedico.medicoNombre}* (${infoMedico.especialidadNombreReal}).\n\n` +
        (notaTriajePrevia ? `🩺 *Triaje:* ${notaTriajePrevia}\n\n` : '') +
        `🪪 *Último paso para guardar tu cita:*\n` +
        `Por favor escríbeme tu **Nombre completo** y tu **Cédula Panameña** (ejemplo: *"Soy Juan Pérez, cédula 8-1234-56789"*).`;

      this.agregarMensajeBot(conv, respPedirCedula, 'SOLICITAR_CEDULA_PACIENTE');
      return await this.finalizarConEnvioMeta(conv, remitente, respPedirCedula, null, analisis);
    }

    // 3. Tenemos Fecha, Médico, Cédula (y Nombre o Perfil): GUARDAR LA CITA EN AGENDAMIENTOSERVICE
    try {
      let citaCreada: CitaResponse;
      let horarioFinalTexto = '';

      if (conv.horaDeseada) {
        // Reservar en la hora exacta verificada por el paciente
        citaCreada = await AgendamientoService.reservarCita({
          pacienteId: conv.pacienteId || 'e0000000-0000-0000-0000-000000000001',
          pacienteNombre: conv.nombrePaciente || 'Paciente WhatsApp',
          pacienteDocumento: conv.cedulaPaciente,
          pacienteTelefono: remitente,
          medicoId: infoMedico.medicoId,
          especialidadId: infoMedico.especialidadIdReal,
          consultorioId: infoMedico.consultorioId,
          fecha: fechaTarget,
          horaInicio: conv.horaDeseada,
          duracionMin: 30,
          motivoConsulta: `[WhatsApp ${remitente} · Paciente: ${conv.nombrePaciente || 'Titular'} · Cédula: ${conv.cedulaPaciente}] ${conv.resumenTriaje || 'Cita agendada por WhatsApp IA'}`,
          canalOrigen: 'CHATBOT_WHATSAPP',
          reservadoPor: 'PACIENTE',
          sincronizarGoogleCalendar: true
        });
        horarioFinalTexto = `${this.formatearHora12(conv.horaDeseada)} (${conv.horaDeseada})`;
      } else {
        // Si no pidió hora específica, asignar el primer turno libre automáticamente
        const auto = await AgendamientoService.asignarCitaAutomatica({
          pacienteId: conv.pacienteId || 'e0000000-0000-0000-0000-000000000001',
          pacienteNombre: conv.nombrePaciente || 'Paciente WhatsApp',
          pacienteDocumento: conv.cedulaPaciente,
          pacienteTelefono: remitente,
          medicoId: infoMedico.medicoId,
          especialidadId: infoMedico.especialidadIdReal,
          fecha: fechaTarget,
          motivoConsulta: `[WhatsApp ${remitente} · Paciente: ${conv.nombrePaciente || 'Titular'} · Cédula: ${conv.cedulaPaciente}] ${conv.resumenTriaje || 'Cita agendada por WhatsApp IA'}`,
          canalOrigen: 'CHATBOT_WHATSAPP',
          reservadoPor: 'PACIENTE'
        });
        citaCreada = auto.cita;
        horarioFinalTexto = auto.horaAsignada;
      }

      conv.citaCreadaCodigo = citaCreada.codigoCita;
      conv.citaCreadaId = citaCreada.id;
      conv.estadoConversacion = 'FINALIZADA';

      const nombreMostrar = conv.nombrePaciente || 'Paciente Verificado';
      const respExito =
        `✅ *¡SOLICITUD DE CITA REGISTRADA EN MEDPULSE!*\n\n` +
        `📋 *Código de Reserva:* ${citaCreada.codigoCita}\n` +
        `⏳ *Estado Actual:* *PENDIENTE DE CONFIRMACIÓN* (Por Administración / Secretaría)\n` +
        `👤 *Paciente:* ${nombreMostrar}\n` +
        `🪪 *Cédula:* ${conv.cedulaPaciente}\n` +
        `🩺 *Especialidad:* ${infoMedico.especialidadNombreReal}\n` +
        `👨‍⚕️ *Médico:* ${infoMedico.medicoNombre}\n` +
        `📅 *Fecha:* ${fechaTarget}\n` +
        `⏰ *Hora Separada:* ${horarioFinalTexto}\n` +
        `📍 *Consultorio:* ${infoMedico.consultorioNombre}\n\n` +
        `✨ _Tu turno ha quedado separado en estado *PENDIENTE* para que Administración o Secretaría lo confirme en la plataforma web._\n\n` +
        `Escribe *0* o *"menú"* si deseas hacer otra consulta.`;

      // Limpiar fecha/hora temporal por si quiere hacer otra prueba en la misma conversación
      conv.horaDeseada = undefined;

      this.agregarMensajeBot(conv, respExito, 'CITA_GUARDADA');
      return await this.finalizarConEnvioMeta(conv, remitente, respExito, citaCreada, analisis);
    } catch (err: any) {
      // Si justo hubo colisión de horario al guardar
      const slotsRestantes = await AgendamientoService.obtenerDisponibilidad(infoMedico.medicoId, fechaTarget);
      const sugerencias = slotsRestantes.slice(0, 4);
      (conv as any)._horasAlternativas = sugerencias.map(s => s.horaInicio);
      conv.estadoConversacion = 'ESPERANDO_CONFIRMACION';
      conv.horaDeseada = undefined;

      const respColision =
        `❌ *Esa hora ya está llena en la agenda del especialista.*\n` +
        `Por favor elige otra hora disponible para el día *${fechaTarget}* respondiendo con el número:\n` +
        sugerencias.map((s, i) => `*${i + 1}️⃣* ${this.formatearHora12(s.horaInicio)} (${s.horaInicio})`).join('\n');

      this.agregarMensajeBot(conv, respColision, 'CONFLICTO_HORA_LLENA');
      return await this.finalizarConEnvioMeta(conv, remitente, respColision, null, analisis);
    }
  }

  private static construirMenuPrincipal(nombre?: string): string {
    return (
      `👋 ¡Hola${nombre ? ` *${nombre}*` : ''}! Bienvenido a *${this.configEmpresa.nombreEmpresa}* (${this.configEmpresa.numeroWhatsAppEmpresa}).\n\n` +
      `Soy tu asistente clínico con IA. Puedes **elegir una respuesta rápida** enviando el número o escribirme directamente:\n\n` +
      `*1️⃣* Evaluar mis síntomas (Triaje Clínico IA)\n` +
      `*2️⃣* Agendar cita médica (Detecto Nombre, Cédula, Fecha y Hora)\n` +
      `*3️⃣* Ver horarios disponibles para hoy y mañana\n` +
      `*4️⃣* Información de Urgencias Médicas\n\n` +
      `💡 *Tip rápido:* También puedes escribirme directo, por ejemplo:\n` +
      `_"Soy Juan Pérez, cédula 8-1234-56789, quiero una cita para mañana a las 5"_`
    );
  }

  private static async finalizarConEnvioMeta(
    conv: ConversacionWhatsAppItem,
    remitente: string,
    respuestaBot: string,
    citaCreada: CitaResponse | null,
    entidadesDetectadas: EntidadesExtraidasIA
  ) {
    let enviadoMetaCloud = false;
    if (this.accessToken && this.configEmpresa.phoneNumberId) {
      const envio = await this.enviarMensajeMetaCloudAPI(remitente, respuestaBot);
      enviadoMetaCloud = envio.ok;
    }
    return {
      conversacion: conv,
      respuestaBot,
      citaCreada,
      enviadoMetaCloud,
      entidadesDetectadas
    };
  }

  private static agregarMensajeBot(conv: ConversacionWhatsAppItem, contenido: string, intencion: string) {
    conv.mensajes.push({
      id: uuidv4(),
      conversacionId: conv.id,
      remitente: 'BOT',
      tipoMensaje: 'TEXTO',
      contenido,
      intencionDetectada: intencion,
      creadoEn: new Date().toISOString()
    });
    conv.ultimaInteraccion = new Date().toISOString();
  }

  public static async enviarMensajeMetaCloudAPI(destinatario: string, texto: string): Promise<{ ok: boolean; detalle?: any }> {
    try {
      const numeroLimpio = destinatario.replace(/[^0-9]/g, '');
      const url = `https://graph.facebook.com/v21.0/${this.configEmpresa.phoneNumberId}/messages`;
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: numeroLimpio,
          type: 'text',
          text: { preview_url: false, body: texto }
        })
      });
      const data = await resp.json().catch(() => ({}));
      return { ok: resp.ok, detalle: data };
    } catch (err: any) {
      return { ok: false, detalle: err.message };
    }
  }
}
