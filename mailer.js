const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'corplinks.notify@gmail.com',
    pass: 'xxxx xxxx xxxx xxxx'
  }
});

const EMAIL_MAP = {
  'khodakivskyi@enterprise.com': 'igorhodaskovskiy@gmail.com',
  'petrenko@enterprise.com':     'igorhodaskovskiy@gmail.com',
  'koval@enterprise.com':        'igorhodaskovskiy@gmail.com',
  'bondarenko@enterprise.com':   'igorhodaskovskiy@gmail.com',
  'shevchenko@enterprise.com':   'igorhodaskovskiy@gmail.com',
  'tarasenko@enterprise.com':    'igorhodaskovskiy@gmail.com',
  'sydorenko@enterprise.com':    'igorhodaskovskiy@gmail.com',
  'yanenko@enterprise.com':      'igorhodaskovskiy@gmail.com',
  'lytvynenko@enterprise.com':   'igorhodaskovskiy@gmail.com',
  'moroz@enterprise.com':        'igorhodaskovskiy@gmail.com',
};

async function sendMail(to, subject, html) {
  try {
    var realEmail = EMAIL_MAP[to] || to;
    if (!realEmail || realEmail.indexOf('@') === -1) return;
    await transporter.sendMail({
      from: '"CorpLinks System" <corplinks.notify@gmail.com>',
      to: realEmail,
      subject: subject,
      html: html
    });
    console.log('Email sent: ' + to + ' -> ' + realEmail);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendMail };