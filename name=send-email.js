import nodemailer from 'nodemailer';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Método não permitido' });
  }

  const { name, email, phone = '', message } = req.body || {};

  // Validação básica
  if (!name || !email || !message) {
    return res.status(400).json({ message: 'Campos obrigatórios ausentes' });
  }
  if (typeof message !== 'string' || message.length > 10000) {
    return res.status(413).json({ message: 'Mensagem inválida ou muito grande' });
  }

  // Construir transporter: prioriza configuração SMTP explícita, caso contrário tenta Gmail com app password
  let transporter;
  try {
    if (process.env.SMTP_HOST && process.env.SMTP_USER) {
      transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: (process.env.SMTP_SECURE === 'true'), // true para 465
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS // app password recomendado
        }
      });
    } else {
      return res.status(500).json({ message: 'Configuração de e-mail ausente' });
    }

    // Verifica conexão com o servidor de e-mail antes de enviar
    await transporter.verify();
  } catch (err) {
    console.error('Erro ao configurar/verificar transporter:', err);
    return res.status(500).json({ message: 'Erro na configuração de e-mail' });
  }

  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || 'no-reply@example.com';
  const to = process.env.EMAIL_TO || process.env.EMAIL_USER;

  const mailOptions = {
    from,
    to,
    subject: `Nova mensagem de ${name}`,
    text: `Nome: ${name}\nE-mail: ${email}\nTelefone: ${phone}\n\nMensagem:\n${message}`,
    html: `<p><strong>Nome:</strong> ${escapeHtml(name)}</p>
           <p><strong>E-mail:</strong> ${escapeHtml(email)}</p>
           <p><strong>Telefone:</strong> ${escapeHtml(phone)}</p>
           <hr/>
           <p>${escapeHtml(message).replace(/\n/g, '<br/>')}</p>`
  };

  try {
    await transporter.sendMail(mailOptions);
    return res.status(200).json({ message: 'E-mail enviado com sucesso' });
  } catch (error) {
    console.error('Erro ao enviar e-mail:', error);
    return res.status(500).json({ message: 'Erro ao enviar e-mail' });
  }
}

// pequena função de escape para evitar injeção de HTML no corpo
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
