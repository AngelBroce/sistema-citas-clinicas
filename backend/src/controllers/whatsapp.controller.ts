import { Request, Response } from 'express';
import { ChatbotService } from '../services/chatbot.service.js';

export class WhatsAppController {
  /**
   * GET /api/whatsapp/webhook
   */
  public static async verificarWebhook(req: Request, res: Response): Promise<void> {
    try {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];

      const configActual = ChatbotService.obtenerConfiguracion();

      if (mode === 'subscribe' && token === configActual.verifyToken) {
        res.status(200).send(challenge);
      } else {
        res.status(403).json({ error: 'Token de verificación inválido' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error interno en verificación' });
    }
  }

  /**
   * POST /api/whatsapp/webhook
   */
  public static async procesarMensaje(req: Request, res: Response): Promise<void> {
    try {
      const entry = req.body?.entry?.[0];
      const change = entry?.changes?.[0];
      const value = change?.value;
      const message = value?.messages?.[0];
      const contact = value?.contacts?.[0];

      res.status(200).send('EVENT_RECEIVED');

      if (!message || message.type !== 'text') {
        return;
      }

      const remitente = '+' + String(message.from).replace(/^\+/, '');
      const nombrePerfil = contact?.profile?.name || undefined;
      const textoMensaje = message.text?.body || '';

      await ChatbotService.procesarMensajeEntrante({
        telefonoRemitente: remitente,
        nombrePerfil,
        mensajeTexto: textoMensaje
      });
    } catch (error) {
      console.error('[WhatsApp Processing Error]:', error);
    }
  }

  /**
   * GET /api/whatsapp/config
   */
  public static async obtenerConfiguracion(_req: Request, res: Response): Promise<void> {
    try {
      const config = ChatbotService.obtenerConfiguracion();
      res.json({
        ok: true,
        systemPrompt: ChatbotService.SYSTEM_PROMPT_IA,
        qrStatus: ChatbotService.obtenerEstadoQR(),
        data: config
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al obtener la configuración de WhatsApp.'
      });
    }
  }

  /**
   * POST /api/whatsapp/config
   */
  public static async actualizarConfiguracion(req: Request, res: Response): Promise<void> {
    try {
      const nuevaConfig = ChatbotService.actualizarConfiguracion(req.body);
      res.json({
        ok: true,
        message: `Número empresarial ${nuevaConfig.numeroWhatsAppEmpresa} vinculado exitosamente a ${nuevaConfig.nombreEmpresa}.`,
        data: nuevaConfig
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al actualizar la configuración de WhatsApp.'
      });
    }
  }

  /**
   * GET /api/whatsapp/qr
   * Obtiene o inicia el código QR de conexión en vivo con el WhatsApp del usuario (+507 6598-2118)
   */
  public static async obtenerQR(req: Request, res: Response): Promise<void> {
    try {
      const actual = ChatbotService.obtenerEstadoQR();
      if (actual.estado === 'DESCONECTADO' || req.query.regen === 'true') {
        const nuevo = await ChatbotService.iniciarConexionQR(req.query.regen === 'true');
        res.json({ ok: true, data: nuevo });
        return;
      }
      res.json({ ok: true, data: actual });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al obtener el código QR de WhatsApp.'
      });
    }
  }

  /**
   * POST /api/whatsapp/qr/iniciar
   * Fuerza la regeneración de un nuevo código QR de vinculación de WhatsApp
   */
  public static async iniciarQR(req: Request, res: Response): Promise<void> {
    try {
      const forzar = Boolean(req.body?.forzarNuevo);
      const estado = await ChatbotService.iniciarConexionQR(forzar);
      res.json({
        ok: true,
        data: estado
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al iniciar la conexión QR de WhatsApp.'
      });
    }
  }

  /**
   * GET /api/whatsapp/conversaciones
   */
  public static async listarConversaciones(_req: Request, res: Response): Promise<void> {
    try {
      const conversaciones = ChatbotService.listarConversaciones();
      res.json({
        ok: true,
        total: conversaciones.length,
        data: conversaciones
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al listar conversaciones de WhatsApp.'
      });
    }
  }

  /**
   * POST /api/whatsapp/simular
   * Procesa un mensaje con el motor de IA / Menú de Opciones / Extractor de Nombre, Cédula, Fecha y Hora
   */
  public static async simularMensaje(req: Request, res: Response): Promise<void> {
    try {
      const configEmpresa = ChatbotService.obtenerConfiguracion();
      const {
        telefono = configEmpresa.numeroWhatsAppEmpresa || '+507 6598-2118',
        nombrePerfil,
        mensaje
      } = req.body;

      if (!mensaje || !String(mensaje).trim()) {
        res.status(400).json({
          ok: false,
          error: 'El campo "mensaje" es obligatorio.'
        });
        return;
      }

      const resultado = await ChatbotService.procesarMensajeEntrante({
        telefonoRemitente: telefono,
        nombrePerfil,
        mensajeTexto: String(mensaje)
      });

      res.json({
        ok: true,
        canal: 'CHATBOT_WHATSAPP',
        empresaConfigurada: configEmpresa.nombreEmpresa,
        numeroEmpresa: configEmpresa.numeroWhatsAppEmpresa,
        remitente: resultado.conversacion.whatsappFrom,
        mensajeEntrada: mensaje,
        respuestaBot: resultado.respuestaBot,
        entidadesDetectadas: resultado.entidadesDetectadas,
        estadoConversacion: resultado.conversacion.estadoConversacion,
        nivelTriaje: resultado.conversacion.nivelTriaje,
        especialidadSugerida: resultado.conversacion.especialidadSugeridaNombre,
        medicoSugerido: resultado.conversacion.medicoSugeridoNombre,
        citaCreada: resultado.citaCreada || null,
        conversacion: resultado.conversacion,
        enviadoMetaCloud: resultado.enviadoMetaCloud
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al procesar mensaje de WhatsApp'
      });
    }
  }

  /**
   * POST /api/whatsapp/reiniciar
   */
  public static async reiniciarConversacion(req: Request, res: Response): Promise<void> {
    try {
      const configEmpresa = ChatbotService.obtenerConfiguracion();
      const { telefono = configEmpresa.numeroWhatsAppEmpresa } = req.body;
      ChatbotService.reiniciarConversacion(telefono);

      res.json({
        ok: true,
        message: `Conversación del número ${telefono} reiniciada correctamente.`
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al reiniciar la conversación.'
      });
    }
  }

  /**
   * POST /api/whatsapp/enviar-prueba
   */
  public static async enviarMensajePruebaReal(req: Request, res: Response): Promise<void> {
    try {
      const configEmpresa = ChatbotService.obtenerConfiguracion();
      const {
        telefono = '+50765982118',
        mensaje = `🏥 *${configEmpresa.nombreEmpresa}*\n\n¡Hola! Tu línea de WhatsApp (+507 6598-2118) ya está conectada.`
      } = req.body;

      const resultado = await ChatbotService.enviarMensajeMetaCloudAPI(telefono, mensaje);

      if (!resultado.ok) {
        res.status(400).json({
          ok: false,
          error: 'No se pudo enviar a Meta Cloud API.',
          detalleMeta: resultado.detalle
        });
        return;
      }

      res.json({
        ok: true,
        message: `Mensaje enviado al WhatsApp real ${telefono}`,
        detalleMeta: resultado.detalle
      });
    } catch (error: any) {
      res.status(500).json({
        ok: false,
        error: error.message || 'Error al enviar mensaje de prueba.'
      });
    }
  }
}
