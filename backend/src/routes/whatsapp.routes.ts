import { Router } from 'express';
import { WhatsAppController } from '../controllers/whatsapp.controller.js';

const router = Router();

// Handshake de validación requerido por Meta Cloud API
router.get('/webhook', WhatsAppController.verificarWebhook);

// Recepción de eventos y mensajes entrantes reales de WhatsApp Cloud API
router.post('/webhook', WhatsAppController.procesarMensaje);

// Configuración del número empresarial (+507 6598-2118) y System Prompt IA
router.get('/config', WhatsAppController.obtenerConfiguracion);
router.post('/config', WhatsAppController.actualizarConfiguracion);

// Generación y estado del Código QR de conexión en vivo con WhatsApp
router.get('/qr', WhatsAppController.obtenerQR);
router.post('/qr/iniciar', WhatsAppController.iniciarQR);

// Historial de conversaciones y citas agendadas por WhatsApp
router.get('/conversaciones', WhatsAppController.listarConversaciones);

// Endpoint interactivo de simulación / conversación completa con guardado de citas en agenda
router.post('/simular', WhatsAppController.simularMensaje);

// Reiniciar conversación para nuevas pruebas
router.post('/reiniciar', WhatsAppController.reiniciarConversacion);

// Enviar mensaje real de prueba vía Meta Cloud API
router.post('/enviar-prueba', WhatsAppController.enviarMensajePruebaReal);

export default router;
