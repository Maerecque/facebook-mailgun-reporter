const fetch = require('node-fetch');
const base64 = require('base-64');
const FormData = require('form-data');

/**
 * ENV Variables
 */

// Mailgun API Key
const API_KEY = process.env.MAILGUN_API_KEY;
// Mailgun Domain Site
const DOMAIN = process.env.DOMAIN_SITE;;
// Facebook webhook verify token
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
// Email adress sender
const MONITORING_FROM_EMAIL = process.env.MONITORING_FROM;
// Email name sender
const MONITORING_FROM_NAME = process.env.MONITORING_FROM_NAME;
// Email adress receiver
const MONITORING_TO_EMAIL = process.env.MONITORING_TO;
// Email name receiver
const MONITORING_TO_NAME = process.env.MONITORING_TO_NAME;

/**
 * Mailing function
 */
exports.handler = async function (event, context) {
  const body = JSON.parse(event.body)

  function createMessage(body) {
    const title = `Budget from adcampaign has been updated.`;
    return {
      text: `
        ${title}

        ${body.entry.map(entry => entry.changes.map(change => `
          field: ${change.field}
          rule id: ${change.value.rule_id}
          account id: ${change.value.account_id}
          object id: ${change.value.object_id}
          object type: ${change.value.object_type}
          trigger type: ${change.value.trigger_type}
          trigger field: ${change.value.trigger_field}
          current value: ${change.value.current_value}
          =========================
        `))}
      `,
      html: `
        <h1>${title}</h1>

        ${body.entry.map(entry => entry.changes.map(change => `
          <div class="change-block">
            <p><b>field:&nbsp;</b>${change.field}<p>
            <p><b>rule id:&nbsp;</b>${change.value.rule_id}<p>
            <p><b>account id:&nbsp;</b>${change.value.account_id}<p>
            <p><b>object id:&nbsp;</b>${change.value.object_id}<p>
            <p><b>object type:&nbsp;</b>${change.value.object_type}<p>
            <p><b>trigger type:&nbsp;</b>${change.value.trigger_type}<p>
            <p><b>trigger field:&nbsp;</b>${change.value.trigger_field}<p>
            <p><b>current value:&nbsp;</b>${change.value.current_value}<p>
          </div>
          <hr>
        `))}
      `
    }
  }

  if (event.httpMethod === "POST") {
    const {html, text} = createMessage(body)
  
    const form = new FormData();
    form.append("from", `${MONITORING_FROM_NAME} <${MONITORING_FROM_EMAIL}>`);
    form.append("to", `${MONITORING_TO_NAME} <${MONITORING_TO_EMAIL}>`);
    form.append("subject", "Budget Facebook Campaign Change");
    form.append("text", text);
    form.append("html", html);
  
    const options = {
      method: "POST",
      body: form,
      headers: {
        Authorization: `Basic  ${base64.encode("api:" + API_KEY)}`,
      },
    };
  
    await fetch(`https://api.mailgun.net/v3/${DOMAIN}/messages`, options);
  }

  if (event.httpMethod === "GET") {
    // Facebook verification queryparams
    const mode = event.queryStringParameters['hub.mode'];
    const token = event.queryStringParameters['hub.verify_token'];
    const challenge = event.queryStringParameters['hub.challenge'];

    // Checks if a token and mode is in the query string of the request
    if (mode && token) {
      // Checks the mode and token sent is correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Responds with the challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        return {
          statusCode: 200,
          body: challenge
        }
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        return {
          statusCode: 403,
          body: "FORBIDDEN"
        }
      }
    }
  }
};