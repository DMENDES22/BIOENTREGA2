import { Delivery } from '../types';

let cachedGmailToken: string | null = null;
let syncIntervalId: any = null;

export const getGmailToken = (): string | null => {
  return cachedGmailToken;
};

export const setGmailToken = (token: string | null) => {
  cachedGmailToken = token;
};

// Encode standard email in RFC 822 format and return base64url string
export function buildRawEmail(to: string, subject: string, bodyHtml: string): string {
  const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
  const emailLines = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    `Content-Type: text/html; charset=utf-8`,
    `MIME-Version: 1.0`,
    `Content-Transfer-Encoding: base64`,
    ``,
    btoa(unescape(encodeURIComponent(bodyHtml)))
  ];
  return btoa(unescape(encodeURIComponent(emailLines.join('\r\n'))))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

// Send an email notification with direct attachment structure
export async function sendGmailNotification(
  token: string,
  toEmail: string,
  delivery: Delivery,
  statusMessage: string,
  driverName?: string
): Promise<boolean> {
  try {
    const subject = `[BioEntregas Sync] NF ${delivery.invoiceNumber} - Status: ${delivery.status}`;
    
    // Construct inline CSS HTML body
    const htmlBody = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff; color: #1e293b;">
        <div style="display: flex; align-items: center; border-bottom: 2px solid #98c30c; padding-bottom: 12px; margin-bottom: 20px;">
          <h1 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800;">biomig <span style="font-size: 11px; color: #98c30c; text-transform: uppercase;">Brasil</span></h1>
        </div>
        
        <h2 style="color: #1e293b; font-size: 16px; font-weight: 700; margin-top: 0;">Sincronização de Entrega</h2>
        <p style="font-size: 14px; line-height: 1.5; color: #475569;">
          ${statusMessage}
        </p>
        
        <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid #f1f5f9;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b; width: 130px;">Nota Fiscal (NF):</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${delivery.invoiceNumber}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Cliente:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #0f172a;">${delivery.clientName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Endereço:</td>
              <td style="padding: 6px 0; color: #334155;">${delivery.address}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Status Atual:</td>
              <td style="padding: 6px 0;">
                <span style="background-color: ${
                  delivery.status === 'ENTREGUE' ? '#d1fae5; color: #065f46;' :
                  delivery.status === 'EM_ROTA' ? '#ecfdf5; color: #1e3a8a;' :
                  delivery.status === 'PROBLEMA' ? '#fee2e2; color: #991b1b;' :
                  '#fef3c7; color: #92400e;'
                } padding: 4px 8px; border-radius: 4px; font-weight: bold; font-size: 11px;">
                  ${delivery.status}
                </span>
              </td>
            </tr>
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Volumes:</td>
              <td style="padding: 6px 0; color: #334155;">${delivery.volumes} item(ns)</td>
            </tr>
            ${driverName ? `
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Motorista:</td>
              <td style="padding: 6px 0; color: #334155;">${driverName}</td>
            </tr>` : ''}
            <tr>
              <td style="padding: 6px 0; font-weight: 600; color: #64748b;">Atualizado em:</td>
              <td style="padding: 6px 0; color: #334155; font-family: monospace;">${new Date(delivery.updatedAt).toLocaleDateString()} ${new Date(delivery.updatedAt).toLocaleTimeString()}</td>
            </tr>
          </table>
        </div>

        ${delivery.receiverName ? `
        <div style="border-top: 1px solid #e2e8f0; padding-top: 12px; margin-top: 20px;">
          <p style="margin: 4px 0; font-size: 13px;"><b>Recebedor:</b> ${delivery.receiverName}</p>
        </div>` : ''}

        <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-top: 30px; border-top: 1px dashed #e2e8f0; padding-top: 10px;">
          Esta é uma sincronização automática segura e autorizada via biomig Brasil.
        </p>

        <!-- payload para sincronização de dados oculto -->
        <div style="display: none; font-size: 1px; color: #ffffff;" id="bioentregas-sync-payload">
          ###BIO_SYNC###${btoa(unescape(encodeURIComponent(JSON.stringify(delivery))))}###
        </div>
      </div>
    `;

    const raw = buildRawEmail(toEmail, subject, htmlBody);
    
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Erro ao enviar mensagem via Gmail API:', errText);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Exception sending Gmail notification:', err);
    return false;
  }
}

// Helper to decode base64 securely
function decodeBase64(b64: string): string {
  try {
    return decodeURIComponent(escape(atob(b64)));
  } catch (e) {
    try {
      return atob(b64);
    } catch (err) {
      return '';
    }
  }
}

// Fetch and scan recent sync messages and return the deliveries parsed
export async function fetchGmailSyncDeliveries(token: string): Promise<Delivery[]> {
  try {
    const listRes = await fetch(
      'https://gmail.googleapis.com/gmail/v1/users/me/messages?q=subject:"[BioEntregas Sync]"&maxResults=25',
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );

    if (!listRes.ok) {
      throw new Error(`Failed to list messages: ${listRes.statusText}`);
    }

    const listData = await listRes.json();
    if (!listData.messages || listData.messages.length === 0) {
      return [];
    }

    const deliveriesMap: { [id: string]: Delivery } = {};

    // Fetch details for the found messages
    const fetchPromises = listData.messages.map(async (msg: { id: string }) => {
      try {
        const detailRes = await fetch(
          `https://gmail.googleapis.com/gmail/v1/users/me/messages/${msg.id}?format=full`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        if (!detailRes.ok) return null;
        
        const detailData = await detailRes.json();
        
        // Strategy 1: Check snippet first to speed up
        const snippet = detailData.snippet || '';
        let match = snippet.match(/###BIO_SYNC###(.*?)###/);
        
        if (!match) {
          // Strategy 2: If not in snippet, traverse the payload body or parts
          let bodyText = '';
          const extractBody = (part: any) => {
            if (part.body && part.body.data) {
              const decoded = decodeBase64(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
              bodyText += decoded;
            }
            if (part.parts) {
              part.parts.forEach(extractBody);
            }
          };

          if (detailData.payload) {
            extractBody(detailData.payload);
          }
          
          match = bodyText.match(/###BIO_SYNC###(.*?)###/);
        }

        if (match && match[1]) {
          const rawJson = decodeBase64(match[1].trim());
          const delivery = JSON.parse(rawJson) as Delivery;
          if (delivery && delivery.id) {
            // Keep the latest one if duplicate invoice
            const existing = deliveriesMap[delivery.id];
            if (!existing || new Date(delivery.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
              deliveriesMap[delivery.id] = delivery;
            }
          }
        }
      } catch (err) {
        console.warn(`Error parsing sync email message ${msg.id}:`, err);
      }
    });

    await Promise.all(fetchPromises);
    return Object.values(deliveriesMap);
  } catch (error) {
    console.error('Error fetching Gmail sync deliveries:', error);
    return [];
  }
}

// Function to synchronize existing local/DB deliveries list with Gmail-derived updates
export function mergeDeliveries(local: Delivery[], incoming: Delivery[]): { merged: Delivery[], updatedCount: number } {
  let updatedCount = 0;
  const deliveryMap = new Map<string, Delivery>();

  // Add all local deliveries
  local.forEach(d => deliveryMap.set(d.id, d));

  // Merge incoming deliveries
  incoming.forEach(inc => {
    const existing = deliveryMap.get(inc.id);
    if (!existing) {
      deliveryMap.set(inc.id, inc);
      updatedCount++;
    } else {
      const existingTime = new Date(existing.updatedAt).getTime();
      const incomingTime = new Date(inc.updatedAt).getTime();
      if (incomingTime > existingTime) {
        deliveryMap.set(inc.id, inc);
        updatedCount++;
      }
    }
  });

  const merged = Array.from(deliveryMap.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return { merged, updatedCount };
}

// Set up automatic synchronization loop matching changes in the background
export function startGmailAutoSync(
  token: string,
  getLocalDeliveries: () => Delivery[],
  onSyncComplete: (synced: Delivery[], count: number) => void,
  intervalMs: number = 20000
) {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
  }

  const runSync = async () => {
    try {
      const incoming = await fetchGmailSyncDeliveries(token);
      if (incoming.length > 0) {
        const local = getLocalDeliveries();
        const { merged, updatedCount } = mergeDeliveries(local, incoming);
        if (updatedCount > 0) {
          onSyncComplete(merged, updatedCount);
        }
      }
    } catch (e) {
      console.warn('Auto sync cycle error:', e);
    }
  };

  // Run immediately on start
  runSync();

  syncIntervalId = setInterval(runSync, intervalMs);
  return () => {
    if (syncIntervalId) {
      clearInterval(syncIntervalId);
      syncIntervalId = null;
    }
  };
}

export function stopGmailAutoSync() {
  if (syncIntervalId) {
    clearInterval(syncIntervalId);
    syncIntervalId = null;
  }
}
