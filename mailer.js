async function sendMail(to, subject, html) {
  try {
    var EMAIL_MAP = {
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

    var realEmail = EMAIL_MAP[to] || to;
    if (!realEmail || realEmail.indexOf('@') === -1) return;

    var res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer re_jAExJ7Hr_kA1YUwJ2gqKDq9LU2P9wAWcm',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'CorpLinks <onboarding@resend.dev>',
        to: realEmail,
        subject: subject,
        html: html
      })
    });

    var data = await res.json();
    console.log('Email sent: ' + to + ' -> ' + realEmail, data);
  } catch (err) {
    console.error('Email error:', err.message);
  }
}

module.exports = { sendMail };