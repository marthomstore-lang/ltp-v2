import nodemailer from 'nodemailer';

export const OFFICIAL_SMTP_HOST = 'smtp.gmail.com';
export const OFFICIAL_SMTP_PORT = 465;
export const OFFICIAL_SMTP_USER = 'david.vidal@eduvallediguillin.gob.cl';
export const OFFICIAL_SMTP_PASS = 'dezymyybjgvuuiuk';
export const OFFICIAL_SMTP_FROM = '"LTP Liceo Pro" <david.vidal@eduvallediguillin.gob.cl>';

export interface SendMailResult {
  success: boolean;
  simulated: boolean;
  messageId?: string;
  error?: string;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  userName: string,
  tempPassword: string,
  expiresInMinutes: number = 30,
  userRun?: string,
  baseUrl: string = 'https://ltp-v2.vercel.app'
): Promise<SendMailResult> {
  const host = process.env.SMTP_HOST || OFFICIAL_SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || String(OFFICIAL_SMTP_PORT), 10);
  const user = process.env.SMTP_USER || OFFICIAL_SMTP_USER;
  const pass = process.env.SMTP_PASS || OFFICIAL_SMTP_PASS;
  const from = process.env.SMTP_FROM || OFFICIAL_SMTP_FROM;

  const directResetUrl = `${baseUrl}/?reset=${encodeURIComponent(tempPassword)}&id=${encodeURIComponent(userRun || toEmail)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Restablecimiento de Contraseña - LTP Liceo Pro</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f8fafc; color: #334155; margin: 0; padding: 20px; }
        .container { max-width: 550px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 30px; box-shadow: 0 10px 25px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 2px solid #6366f1; padding-bottom: 15px; margin-bottom: 20px; }
        .header h2 { color: #4f46e5; margin: 0; font-size: 1.5rem; }
        .code-box { background: #e0e7ff; color: #3730a3; border-radius: 8px; padding: 12px; text-align: center; font-size: 1.6rem; font-weight: 800; letter-spacing: 3px; margin: 15px 0; border: 1px dashed #6366f1; font-family: monospace; }
        .btn-direct { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff !important; padding: 14px 28px; font-size: 1rem; font-weight: 800; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); text-align: center; }
        .warning { background: #fffeb3; border-left: 4px solid #eab308; padding: 12px; font-size: 0.85rem; color: #854d0e; border-radius: 4px; margin-top: 20px; }
        .footer { text-align: center; margin-top: 30px; font-size: 0.75rem; color: #94a3b8; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h2>LTP Liceo Pro</h2>
          <p style="margin: 5px 0 0 0; color: #64748b; font-size: 0.9rem;">Plataforma Unificada Escolar</p>
        </div>
        
        <p>Estimado(a) <strong>${userName}</strong>,</p>
        <p>Has solicitado el restablecimiento de tu contraseña para la plataforma institucional.</p>
        
        <div style="text-align: center; margin: 25px 0;">
          <a href="${directResetUrl}" class="btn-direct">
            👉 Cambiar Contraseña e Iniciar Sesión Directo
          </a>
          <p style="margin: 8px 0 0 0; font-size: 0.78rem; color: #64748b;">
            Haz clic en el botón superior para ingresar tu nueva contraseña e iniciar sesión de inmediato sin tener que copiar códigos.
          </p>
        </div>

        <div style="margin: 20px 0; padding: 12px 16px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
          <span style="font-size: 0.8rem; font-weight: 700; color: #475569;">O si prefieres ingresar el código manualmente:</span>
          <div class="code-box">${tempPassword}</div>
          <span style="font-size: 0.75rem; color: #64748b;">RUT de Acceso: <strong>${userRun || toEmail}</strong></span>
        </div>
        
        <p>⚠️ <strong>Información Importante:</strong></p>
        <ul>
          <li>Este enlace y clave tienen una validez estricta de <strong>${expiresInMinutes} minutos</strong>.</li>
          <li>Al establecer tu nueva clave, ingresarás de forma automática a tu cuenta.</li>
        </ul>
        
        <div class="warning">
          Si no has solicitado este cambio, por favor ignora este correo o notifica inmediatamente al administrador de TI.
        </div>
        
        <p style="font-size: 0.75rem; color: #94a3b8; word-break: break-all; margin-top: 20px;">
          Enlace alternativo: <a href="${directResetUrl}" style="color: #4f46e5;">${directResetUrl}</a>
        </p>
        
        <div class="footer">
          &copy; 2026 Liceo Técnico Profesional — Sistema Integral LTP v2.0
        </div>
      </div>
    </body>
    </html>
  `;

  // Si no hay configuración SMTP real en .env, realizar simulación en consola para desarrollo
  const isTemplate = !user || !pass || user.includes('tu_correo') || pass.includes('tu_clave');
  if (!host || isTemplate) {
    console.log('\n================================================================');
    console.log('📧 [MODO DESARROLLO - ESPERANDO CREDENCIALES SMTP REALES DE GOOGLE WORKSPACE]');
    console.log(`Para: ${userName} <${toEmail}>`);
    console.log(`Asunto: Restablecimiento de Contraseña - LTP Liceo Pro`);
    console.log(`🔑 Clave Temporal Generada: ${tempPassword}`);
    console.log(`⏱️ Validez: ${expiresInMinutes} minutos`);
    console.log('💡 Configura tu correo @eduvallediguillin.gob.cl en backend/.env para recibirlo real en tu Gmail');
    console.log('================================================================\n');

    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`
    };
  }

  try {
    const isSecure = port === 465;
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Restablecimiento de Contraseña - LTP Liceo Pro',
      html: htmlContent
    });

    console.log(`✅ Correo de restablecimiento enviado a ${toEmail} (ID: ${info.messageId})`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error('❌ Error al enviar correo SMTP:', err.message || err);
    return {
      success: false,
      simulated: false,
      error: err.message || 'Error al conectar con servidor SMTP'
    };
  }
}

export async function sendTeacherWelcomeEmail(
  toEmail: string,
  userName: string,
  tempPassword: string,
  loginUrl: string = 'https://ltp-v2.vercel.app',
  userRun?: string
): Promise<SendMailResult> {
  const host = process.env.SMTP_HOST || OFFICIAL_SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || String(OFFICIAL_SMTP_PORT), 10);
  const user = process.env.SMTP_USER || OFFICIAL_SMTP_USER;
  const pass = process.env.SMTP_PASS || OFFICIAL_SMTP_PASS;
  const from = process.env.SMTP_FROM || OFFICIAL_SMTP_FROM;

  const directActivationUrl = `${loginUrl}/?welcome=1&reset=${encodeURIComponent(tempPassword)}&id=${encodeURIComponent(userRun || toEmail)}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>Bienvenido a la Plataforma Institucional - LTP Liceo Pro</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; margin: 0; padding: 20px; }
        .container { max-width: 580px; margin: 0 auto; background: #ffffff; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 20px; margin-bottom: 24px; }
        .header h1 { color: #4f46e5; margin: 0; font-size: 1.6rem; font-weight: 800; }
        .header p { margin: 6px 0 0 0; color: #64748b; font-size: 0.95rem; }
        .badge { display: inline-block; background: #e0e7ff; color: #3730a3; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; margin-top: 10px; }
        .card { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 10px; padding: 18px 22px; margin: 20px 0; }
        .card-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e2e8f0; }
        .card-row:last-child { border-bottom: none; }
        .card-label { font-weight: 700; color: #475569; font-size: 0.88rem; }
        .card-value { font-weight: 800; color: #0f172a; font-size: 0.95rem; font-family: monospace; }
        .btn-container { text-align: center; margin: 28px 0; }
        .btn { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #3730a3 100%); color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 800; font-size: 1rem; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); text-align: center; }
        .instructions { background: #fefce8; border-left: 4px solid #eab308; padding: 14px 18px; font-size: 0.86rem; color: #854d0e; border-radius: 6px; margin-top: 20px; line-height: 1.5; }
        .footer { text-align: center; margin-top: 32px; font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 16px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Liceo Técnico Profesional</h1>
          <p>Plataforma Unificada Escolar y Académica (LTP v2.0)</p>
          <span class="badge">🎉 Cuenta Oficial Habilitada</span>
        </div>

        <p style="font-size: 1rem;">Estimado(a) <strong>${userName}</strong>,</p>
        <p style="color: #475569; line-height: 1.5;">Le informamos que su cuenta institucional ha sido habilitada en la plataforma escolar del establecimiento. Puede ingresar directamente desde el botón a continuación para definir su contraseña personalizada de acceso:</p>

        <div class="btn-container">
          <a href="${directActivationUrl}" class="btn" target="_blank" style="color: #ffffff !important;">
            👉 Activar Cuenta y Elegir Mi Contraseña
          </a>
          <p style="margin: 10px 0 0 0; font-size: 0.82rem; color: #64748b;">
            Haga clic aquí para ingresar directamente a la plataforma y definir la contraseña que usted prefiera.
          </p>
        </div>

        <div class="card">
          <div class="card-row">
            <span class="card-label">🌐 Enlace de Acceso:</span>
            <span class="card-value" style="color: #4f46e5;">${loginUrl}</span>
          </div>
          ${userRun ? `
          <div class="card-row">
            <span class="card-label">🆔 RUT de Acceso:</span>
            <span class="card-value" style="color: #0f172a;">${userRun}</span>
          </div>` : ''}
          <div class="card-row">
            <span class="card-label">👤 Usuario / Correo Oficial:</span>
            <span class="card-value" style="color: #0284c7;">${toEmail}</span>
          </div>
          <div class="card-row">
            <span class="card-label">🔑 Clave Inicial de Activación:</span>
            <span class="card-value" style="background: #eef2ff; padding: 2px 8px; border-radius: 4px; color: #4338ca;">${tempPassword}</span>
          </div>
        </div>

        <div class="instructions">
          📌 <strong>Primeros Pasos para Ingresar:</strong>
          <ol style="margin: 8px 0 0 0; padding-left: 20px;">
            <li>Haga clic en el botón de arriba <strong>«Activar Cuenta y Elegir Mi Contraseña»</strong>.</li>
            <li>El sistema le solicitará definir la contraseña que usted desee para su cuenta.</li>
            <li>Al confirmar su nueva clave, ingresará de forma automática e inmediata a la plataforma.</li>
            <li>También puede ingresar de forma manual con su Correo Oficial (o RUT) y su Clave Inicial.</li>
          </ol>
        </div>

        <p style="font-size: 0.75rem; color: #94a3b8; word-break: break-all; margin-top: 18px; text-align: center;">
          Enlace alternativo directo: <a href="${directActivationUrl}" style="color: #4f46e5;">${directActivationUrl}</a>
        </p>

        <div class="footer">
          Mensaje generado automáticamente por el Sistema de Gestión Escolar — Liceo Técnico Profesional.<br/>
          &copy; 2026 Todos los derechos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    const isSecure = port === 465;
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: { user, pass },
      connectionTimeout: 8000,
      greetingTimeout: 8000,
      socketTimeout: 8000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const info = await transporter.sendMail({
      from,
      to: toEmail,
      subject: 'Bienvenido(a) a la Plataforma Institucional — Credenciales de Acceso LTP',
      html: htmlContent
    });

    console.log(`✅ Correo de bienvenida enviado a ${toEmail} con ID: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error(`❌ Error al enviar correo de bienvenida a ${toEmail}:`, err.message || err);
    return {
      success: false,
      simulated: false,
      error: err.message || 'Error al conectar con servidor SMTP'
    };
  }
}

export interface CourseBroadcastEmailOptions {
  toEmail: string;
  bccEmails?: string[];
  recipientName: string;
  audienceLabel?: string;
  senderName: string;
  senderRole: string;
  senderEmail?: string;
  courseName: string;
  subject: string;
  message: string;
  priority?: 'normal' | 'importante' | 'urgente';
  category?: string;
  loginUrl?: string;
}

export async function sendCourseBroadcastEmail(
  options: CourseBroadcastEmailOptions
): Promise<SendMailResult> {
  const {
    toEmail,
    bccEmails,
    recipientName,
    audienceLabel = 'Comunidad Escolar',
    senderName,
    senderRole,
    senderEmail,
    courseName,
    subject,
    message,
    priority = 'normal',
    category = 'General',
    loginUrl = 'http://localhost:3000'
  } = options;

  const host = process.env.SMTP_HOST || OFFICIAL_SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || String(OFFICIAL_SMTP_PORT), 10);
  const user = process.env.SMTP_USER || OFFICIAL_SMTP_USER;
  const pass = process.env.SMTP_PASS || OFFICIAL_SMTP_PASS;
  const from = process.env.SMTP_FROM || OFFICIAL_SMTP_FROM;

  const priorityColors = {
    normal: { bg: '#e0e7ff', text: '#3730a3', border: '#818cf8', label: 'Informativo / Normal' },
    importante: { bg: '#ffedd5', text: '#9a3412', border: '#fb923c', label: '⚠️ Importante' },
    urgente: { bg: '#fee2e2', text: '#991b1b', border: '#f87171', label: '🚨 URGENTE' }
  };

  const pConfig = priorityColors[priority] || priorityColors.normal;
  const formattedMessage = (message || '').replace(/\n/g, '<br/>');

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
      <meta charset="UTF-8">
      <title>${subject} - Comunicación Oficial LTP</title>
      <style>
        body { font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; margin: 0; padding: 24px; }
        .container { max-width: 620px; margin: 0 auto; background: #ffffff; border-radius: 14px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .header { text-align: center; border-bottom: 2px solid #4f46e5; padding-bottom: 18px; margin-bottom: 22px; }
        .header h1 { color: #4f46e5; margin: 0; font-size: 1.55rem; font-weight: 800; }
        .header p { margin: 6px 0 0 0; color: #64748b; font-size: 0.92rem; }
        .badge-row { display: flex; justify-content: center; gap: 8px; flex-wrap: wrap; margin-top: 12px; }
        .badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 700; font-size: 0.8rem; border: 1px solid transparent; }
        .course-badge { background: #4f46e5; color: #ffffff; }
        .priority-badge { background: ${pConfig.bg}; color: ${pConfig.text}; border-color: ${pConfig.border}; }
        .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 16px 20px; margin: 20px 0; font-size: 0.88rem; }
        .meta-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #f1f5f9; }
        .meta-row:last-child { border-bottom: none; }
        .meta-label { color: #64748b; font-weight: 600; }
        .meta-value { color: #0f172a; font-weight: 700; }
        .message-box { background: #ffffff; border-left: 4px solid #4f46e5; padding: 18px 22px; margin: 22px 0; border-radius: 0 10px 10px 0; background: #fcfdff; box-shadow: 0 2px 8px rgba(79, 70, 229, 0.05); }
        .message-title { font-size: 1.15rem; font-weight: 800; color: #1e1b4b; margin: 0 0 12px 0; }
        .message-body { font-size: 0.98rem; line-height: 1.65; color: #334155; }
        .btn-container { text-align: center; margin: 30px 0 15px 0; }
        .btn { display: inline-block; background: #4f46e5; color: #ffffff !important; padding: 12px 30px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 0.98rem; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.35); }
        .footer { text-align: center; margin-top: 30px; font-size: 0.78rem; color: #94a3b8; border-top: 1px solid #f1f5f9; padding-top: 18px; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Liceo Técnico Profesional</h1>
          <p>Comunicación Oficial Escolar (LTP v2.0)</p>
          <div class="badge-row">
            <span class="badge course-badge">🏫 Alcance: ${courseName}</span>
            <span class="badge priority-badge">${pConfig.label}</span>
            ${category ? `<span class="badge" style="background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1;">📁 ${category}</span>` : ''}
          </div>
        </div>

        <p style="font-size: 1rem; margin-bottom: 14px;">Estimado(a) <strong>${recipientName}</strong>,</p>
        <p style="color: #475569; line-height: 1.5; margin-top: 0;">
          Ha recibido un comunicado oficial dirigido a <strong>${audienceLabel} (${courseName})</strong>:
        </p>

        <div class="meta-card">
          <div class="meta-row">
            <span class="meta-label">👤 Enviado por:</span>
            <span class="meta-value">${senderName} <span style="font-weight: 400; color: #64748b;">(${senderRole})</span></span>
          </div>
          ${senderEmail ? `
          <div class="meta-row">
            <span class="meta-label">✉️ Correo Emisor:</span>
            <span class="meta-value">${senderEmail}</span>
          </div>` : ''}
          <div class="meta-row">
            <span class="meta-label">🎯 Alcance Destinatario:</span>
            <span class="meta-value" style="color: #4f46e5;">${courseName}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">📅 Fecha de Envío:</span>
            <span class="meta-value">${new Date().toLocaleDateString('es-CL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        </div>

        <div class="message-box">
          <h2 class="message-title">📌 ${subject}</h2>
          <div class="message-body">${formattedMessage}</div>
        </div>

        <div class="btn-container">
          <a href="${loginUrl}" class="btn" target="_blank" style="color: #ffffff !important;">Acceder a la Plataforma Institucional</a>
        </div>

        <div class="footer">
          Este es un comunicado institucional del <strong>Liceo Técnico Profesional</strong> enviado a través del Sistema Integral LTP v2.0.<br/>
          Recibe este correo como miembro de la comunidad educativa de <strong>${courseName}</strong>.<br/>
          &copy; ${new Date().getFullYear()} Liceo Técnico Profesional — Todos los derechos reservados.
        </div>
      </div>
    </body>
    </html>
  `;

  // Simulación en consola si no hay credenciales SMTP válidas
  const isTemplate = !user || !pass || user.includes('tu_correo') || pass.includes('tu_clave');
  if (!host || isTemplate) {
    const bccCount = Array.isArray(bccEmails) ? bccEmails.length : 0;
    console.log(`\n📧 [SIMULACIÓN CORREO COMUNICADO] Para: ${recipientName} <${toEmail}>${bccCount > 0 ? ` (+${bccCount} BCC)` : ''} | Alcance: ${courseName} | Asunto: ${subject}`);
    return {
      success: true,
      simulated: true,
      messageId: `simulated-${Date.now()}`
    };
  }

  try {
    const isSecure = port === 465;
    const transporter = nodemailer.createTransport({
      host: host || 'smtp.gmail.com',
      port,
      secure: isSecure,
      auth: { user, pass },
      connectionTimeout: 7000,
      greetingTimeout: 7000,
      socketTimeout: 9000,
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions: any = {
      from,
      to: toEmail || user || from,
      subject: `[${courseName}] [${priority.toUpperCase()}] ${subject} — LTP Liceo Pro`,
      html: htmlContent
    };
    if (Array.isArray(bccEmails) && bccEmails.length > 0) {
      mailOptions.bcc = bccEmails;
    }

    const info = await transporter.sendMail(mailOptions);

    console.log(`✅ Correo de comunicado enviado (${Array.isArray(bccEmails) && bccEmails.length > 0 ? `${bccEmails.length} destinatarios BCC` : toEmail}) ID: ${info.messageId}`);
    return {
      success: true,
      simulated: false,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error(`❌ Error al enviar correo de comunicado a ${toEmail}:`, err.message || err);
    return {
      success: false,
      simulated: false,
      error: err.message || 'Error al conectar con servidor SMTP'
    };
  }
}

