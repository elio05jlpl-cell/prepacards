// Phase 2 : e-mails de l'essai, desinscription, contact, export, sante.
//
// Usage :  node worker/_test_phase2.mjs

import worker from './index.js';
import { envoyerEmailsEssai, jetonDesinscription } from './essais.js';
import { messageEssai } from './messages-essai.js';
import { parametresSession } from './paiement.js';

let echecs = 0;
function verifier(condition, message) {
  console.log(`  ${condition ? 'OK  ' : 'ECHEC'} ${message}`);
  if (!condition) echecs += 1;
}

const UID = '11111111-2222-3333-4444-555555555555';
const UID2 = '99999999-2222-3333-4444-555555555555';
const env = {
  SUPABASE_URL: 'https://exemple.supabase.co',
  SUPABASE_SERVICE_ROLE_KEY: 'service-secret',
  RESEND_API_KEY: 're_test',
  COURRIEL_EXPEDITEUR: 'PrépaCards <noreply@prepacards.fr>',
  COURRIEL_REPONSE: 'contact@prepacards.fr',
  WEBHOOK_SECRET: 'secret-webhook',
  EMAILS_ESSAI: '1',
};

// Un faux Supabase + Resend en memoire.
function faux(options = {}) {
  const journal = [];
  const reservations = new Set();
  const f = async (url, opts = {}) => {
    url = String(url);
    const corps = opts.body && typeof opts.body === 'string' && opts.body[0] === '{'
      ? JSON.parse(opts.body) : opts.body;
    journal.push({ url, opts, corps });
    if (url.endsWith('/rpc/emails_essai_a_envoyer')) {
      return new Response(JSON.stringify(options.liste || []), { status: 200 });
    }
    if (url.endsWith('/rpc/reserver_email')) {
      const cle = `${corps.p_user}|${corps.p_type}`;
      const ok = !reservations.has(cle) && !options.dejaReserve;
      reservations.add(cle);
      return new Response(JSON.stringify(ok), { status: 200 });
    }
    if (url.endsWith('/rpc/liberer_email')) return new Response('null', { status: 200 });
    if (url.startsWith('https://api.resend.com/')) {
      return options.resendEchoue
        ? new Response('refus', { status: 422 })
        : new Response('{"id":"x"}', { status: 200 });
    }
    if (url.includes('/rest/v1/profiles') && opts.method === 'PATCH') {
      return new Response(null, { status: options.patchEchoue ? 500 : 204 });
    }
    if (url.endsWith('/auth/v1/user')) {
      return options.jetonValide === false
        ? new Response('{}', { status: 401 })
        : new Response(JSON.stringify({ id: UID, email: 'eleve@exemple.fr' }), { status: 200 });
    }
    if (url.includes('/rest/v1/')) return new Response(JSON.stringify(options.lignes || []), { status: 200 });
    if (url.endsWith('/auth/v1/health')) {
      return options.baseHs ? new Response('', { status: 500 }) : new Response('{}', { status: 200 });
    }
    if (url.includes('challenges.cloudflare.com')) {
      return new Response(JSON.stringify({ success: options.turnstile !== false }), { status: 200 });
    }
    return new Response('', { status: 404 });
  };
  return { f, journal };
}

const ligne = (genre, promo = false, uid = UID) =>
  ({ uid, adresse: 'eleve@exemple.fr', genre, jours: 4, promo });

console.log('--- Textes ---');
for (const g of ['essai_j1', 'essai_j7', 'essai_j25', 'essai_j31']) {
  const m = messageEssai(g, { jours: 4, lienDesinscription: 'https://prepacards.fr/api/desabonner?u=x&t=y', promo: g.endsWith('1') || g.endsWith('7') });
  verifier(m && m.sujet && m.texte && m.html, `${g} : sujet, texte et html presents`);
  verifier(m && !/undefined|null|NaN|\{\{/.test(m.texte + m.html + m.sujet), `${g} : aucune valeur qui fuit`);
}
verifier(messageEssai('essai_j25', { jours: 1 }).sujet.includes('1 jour ') === false
  && messageEssai('essai_j25', { jours: 1 }).sujet.includes('1 jour'), 'singulier : 1 jour');
verifier(messageEssai('essai_j25', { jours: 0 }).sujet.includes('aujourd’hui'), 'dernier jour : aujourd’hui');
verifier(messageEssai('inconnu') === null, 'genre inconnu : null');
const m1 = messageEssai('essai_j1', { lienDesinscription: 'https://prepacards.fr/api/desabonner?u=a&t=b', promo: true });
verifier(m1.texte.includes('desabonner') && m1.html.includes('Ne plus recevoir'), 'conseils : lien de desinscription');
verifier(!messageEssai('essai_j25', { jours: 3 }).texte.includes('desabonner'), 'rappel de compte : pas de desinscription');
verifier(!/<script/i.test(messageEssai('essai_j1', { lienDesinscription: '"><script>x</script>', promo: true }).html),
  'un lien piege est echappe');

console.log('\n--- Envoi planifie ---');
let { f, journal } = faux({ liste: [ligne('essai_j1', true), ligne('essai_j25')] });
let bilan = await envoyerEmailsEssai(env, f);
verifier(bilan.actif && bilan.envoyes === 2 && bilan.echecs === 0, `2 e-mails envoyes (${JSON.stringify(bilan)})`);
const mails = journal.filter((j) => j.url.startsWith('https://api.resend.com/'));
verifier(mails.length === 2, 'deux appels au service d’e-mail');
const promo = mails.find((j) => j.corps.subject.includes('Bien démarrer'));
verifier(promo && promo.corps.headers['List-Unsubscribe'].includes('/api/desabonner?u=' + UID),
  'conseils : en-tete List-Unsubscribe');
verifier(promo.corps.headers['List-Unsubscribe-Post'] === 'List-Unsubscribe=One-Click', 'desinscription en un clic declaree');
const rappel = mails.find((j) => j.corps.subject.includes('essai'));
verifier(rappel && !rappel.corps.headers, 'rappel de compte : pas d’en-tete de desinscription');
verifier(mails.every((j) => j.corps.to[0] === 'eleve@exemple.fr'), 'au bon destinataire');

({ f, journal } = faux({ liste: [ligne('essai_j1', true)] }));
bilan = await envoyerEmailsEssai({ ...env, EMAILS_ESSAI: '0' }, f);
verifier(!bilan.actif && journal.length === 0, 'interrupteur a 0 : aucun appel');
({ f, journal } = faux({ liste: [ligne('essai_j1', true)] }));
bilan = await envoyerEmailsEssai({ ...env, EMAILS_ESSAI: undefined }, f);
verifier(!bilan.actif && journal.length === 0, 'interrupteur absent : aucun appel');
({ f, journal } = faux({ liste: [ligne('essai_j1', true)] }));
bilan = await envoyerEmailsEssai({ ...env, RESEND_API_KEY: undefined }, f);
verifier(!bilan.actif && journal.length === 0, 'Resend non configure : aucun appel');

({ f, journal } = faux({ liste: [ligne('essai_j25')], dejaReserve: true }));
bilan = await envoyerEmailsEssai(env, f);
verifier(bilan.envoyes === 0 && bilan.deja === 1, 'deja reserve : pas de second envoi');
verifier(!journal.some((j) => j.url.startsWith('https://api.resend.com/')), 'et rien n’est envoye');

({ f, journal } = faux({ liste: [ligne('essai_j25')], resendEchoue: true }));
bilan = await envoyerEmailsEssai(env, f);
verifier(bilan.echecs === 1 && journal.some((j) => j.url.endsWith('/rpc/liberer_email')),
  'envoi refuse : la place est liberee pour le lendemain');

({ f, journal } = faux({ liste: [{ uid: 'pas-un-uuid', adresse: 'a@b.fr', genre: 'essai_j25' }, ligne('essai_j25')] }));
bilan = await envoyerEmailsEssai(env, f);
verifier(bilan.envoyes === 1, 'un identifiant invalide est ignore');

const beaucoup = Array.from({ length: 200 }, (_, i) =>
  ligne('essai_j25', false, `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`));
({ f, journal } = faux({ liste: beaucoup }));
bilan = await envoyerEmailsEssai(env, f);
verifier(bilan.envoyes <= 80, `au plus 80 envois par passage (${bilan.envoyes})`);

let ctxAttendu = [];
({ f, journal } = faux({ liste: [] }));
globalThis.fetch = f;
await worker.scheduled({}, env, { waitUntil: (p) => ctxAttendu.push(p) });
verifier(ctxAttendu.length === 1, 'le declencheur planifie existe et s’accroche au Worker');
await Promise.allSettled(ctxAttendu);

console.log('\n--- Desinscription ---');
const jeton = await jetonDesinscription(UID, env);
verifier(/^[0-9a-f]{64}$/.test(jeton), 'jeton HMAC de 64 caracteres');
verifier(jeton !== await jetonDesinscription(UID2, env), 'un jeton par compte');
({ f, journal } = faux());
globalThis.fetch = f;
let r = await worker.fetch(new Request(`https://prepacards.fr/api/desabonner?u=${UID}&t=${jeton}`,
  { headers: { 'cf-connecting-ip': '3.3.3.1' } }), env);
verifier(r.status === 200 && (await r.text()).includes('désinscrit'), 'lien valide : desinscrit');
verifier(journal.some((j) => j.opts.method === 'PATCH' && j.corps.marketing_ok === false), 'marketing_ok passe a faux');
verifier(r.headers.get('content-security-policy'), 'page protegee par une CSP');
({ f, journal } = faux());
globalThis.fetch = f;
r = await worker.fetch(new Request(`https://prepacards.fr/api/desabonner?u=${UID2}&t=${jeton}`,
  { headers: { 'cf-connecting-ip': '3.3.3.2' } }), env);
verifier(r.status === 400 && !journal.some((j) => j.opts.method === 'PATCH'), 'jeton d’un autre compte : refuse, rien modifie');
r = await worker.fetch(new Request(`https://prepacards.fr/api/desabonner?u=pas-un-uuid&t=${jeton}`,
  { headers: { 'cf-connecting-ip': '3.3.3.3' } }), env);
verifier(r.status === 400, 'identifiant invalide : refuse');
r = await worker.fetch(new Request(`https://prepacards.fr/api/desabonner?u=${UID}&t=${jeton}`,
  { method: 'POST', headers: { 'cf-connecting-ip': '3.3.3.4', 'content-length': '33' },
    body: 'List-Unsubscribe=One-Click' }), env);
verifier(r.status === 200, 'POST « en un clic » des messageries accepte');
r = await worker.fetch(new Request(`https://prepacards.fr/api/desabonner?u=${UID}&t=${jeton}`,
  { headers: { 'cf-connecting-ip': '3.3.3.5' } }), { ...env, WEBHOOK_SECRET: undefined });
verifier(r.status === 400, 'sans secret configure : aucun lien n’est valide');

console.log('\n--- Contact ---');
function contact(corps, ip = '4.4.4.1', extra = {}) {
  const t = JSON.stringify(corps);
  return new Request('https://prepacards.fr/api/contact', { method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip,
      'content-length': String(new TextEncoder().encode(t).length), ...extra }, body: t });
}
const bon = { email: 'Eleve@Exemple.fr', nom: 'Eleve', sujet: 'Question', message: 'Bonjour, comment exporter mes cartes ?' };
({ f, journal } = faux());
globalThis.fetch = f;
r = await worker.fetch(contact(bon), env);
verifier(r.status === 200, 'message valide : accepte');
let envoi = journal.find((j) => j.url.startsWith('https://api.resend.com/'));
verifier(envoi && envoi.corps.reply_to[0] === 'eleve@exemple.fr', 'repondre-a = le visiteur');
verifier(envoi && envoi.corps.to[0] === 'contact@prepacards.fr', 'livre a la boite de contact');
verifier(envoi && envoi.corps.subject.startsWith('[Contact site]'), 'sujet balise');
({ f, journal } = faux());
globalThis.fetch = f;
r = await worker.fetch(contact({ ...bon, site_web: 'http://spam' }, '4.4.4.2'), env);
verifier(r.status === 200 && !journal.some((j) => j.url.startsWith('https://api.resend.com/')), 'champ piege : « ok » mais rien n’est envoye');
r = await worker.fetch(contact({ ...bon, email: 'pas-un-mail' }, '4.4.4.3'), env);
verifier(r.status === 400, 'adresse invalide : 400');
r = await worker.fetch(contact({ ...bon, message: 'court' }, '4.4.4.4'), env);
verifier(r.status === 400, 'message trop court : 400');
({ f, journal } = faux());
globalThis.fetch = f;
r = await worker.fetch(contact({ ...bon, sujet: 'Salut\r\nBcc: victime@x.fr' }, '4.4.4.5'), env);
envoi = journal.find((j) => j.url.startsWith('https://api.resend.com/'));
verifier(envoi && !/[\r\n]/.test(envoi.corps.subject), 'aucun saut de ligne dans le sujet (pas d’injection d’en-tete)');
r = await worker.fetch(contact({ ...bon, message: 'x'.repeat(30000) }, '4.4.4.6'), env);
verifier(r.status === 413, 'message de 30 Ko : 413');
r = await worker.fetch(contact(bon, '4.4.4.7', { origin: 'https://evil.example' }), env);
verifier(r.status === 403, 'autre origine : 403');
({ f, journal } = faux({ turnstile: false }));
globalThis.fetch = f;
r = await worker.fetch(contact({ ...bon, jeton: 'faux' }, '4.4.4.8'), { ...env, TURNSTILE_SECRET: 'ts' });
verifier(r.status === 400 && !journal.some((j) => j.url.startsWith('https://api.resend.com/')), 'Turnstile refuse : rien n’est envoye');
({ f, journal } = faux({ turnstile: true }));
globalThis.fetch = f;
r = await worker.fetch(contact({ ...bon, jeton: 'bon' }, '4.4.4.9'), { ...env, TURNSTILE_SECRET: 'ts' });
verifier(r.status === 200, 'Turnstile valide : envoye');
r = await worker.fetch(contact(bon, '4.4.4.10'), { ...env, TURNSTILE_SECRET: 'ts' });
verifier(r.status === 400, 'Turnstile configure mais pas de jeton : refuse');
r = await worker.fetch(contact(bon, '4.4.4.11'), { ...env, RESEND_API_KEY: undefined });
verifier(r.status === 503, 'e-mail non configure : 503 clair');
let dernier = 0;
for (let i = 0; i < 6; i += 1) dernier = (await worker.fetch(contact(bon, '4.4.4.99'), env)).status;
verifier(dernier === 429, `quota par adresse IP (${dernier})`);

console.log('\n--- Export des donnees ---');
function exporter(jetonAcces, ip) {
  return new Request('https://prepacards.fr/api/compte/exporter', { method: 'POST',
    headers: { 'cf-connecting-ip': ip, 'content-length': '0',
      ...(jetonAcces ? { authorization: `Bearer ${jetonAcces}` } : {}) } });
}
({ f, journal } = faux({ lignes: [{ cree_le: '2026-10-01', statut: '' }] }));
globalThis.fetch = f;
r = await worker.fetch(exporter('', '5.5.5.1'), env);
verifier(r.status === 401, 'sans jeton : 401');
({ f, journal } = faux({ jetonValide: false }));
globalThis.fetch = f;
r = await worker.fetch(exporter('faux', '5.5.5.2'), env);
verifier(r.status === 401, 'jeton refuse par Supabase : 401');
({ f, journal } = faux({ lignes: [{ cree_le: '2026-10-01', statut: '', octets: 10, cartes: 3 }] }));
globalThis.fetch = f;
r = await worker.fetch(exporter('bon', '5.5.5.3'), env);
const donnees = await r.json();
verifier(r.status === 200 && donnees.compte.adresse === 'eleve@exemple.fr', 'export : adresse et profil');
verifier((r.headers.get('content-disposition') || '').includes('attachment'), 'telechargé comme un fichier');
verifier(journal.filter((j) => j.url.includes('/rest/v1/')).every((j) => j.url.includes(UID)),
  'toutes les lectures sont limitees au compte du jeton');
verifier(!JSON.stringify(donnees).includes('service-secret'), 'aucun secret dans le fichier');

console.log('\n--- Sante ---');
({ f, journal } = faux());
globalThis.fetch = f;
r = await worker.fetch(new Request('https://prepacards.fr/api/sante', { headers: { 'cf-connecting-ip': '6.6.6.1' } }), env);
verifier(r.status === 200 && (await r.json()).ok === true, 'base joignable : 200');
({ f, journal } = faux({ baseHs: true }));
globalThis.fetch = f;
r = await worker.fetch(new Request('https://prepacards.fr/api/sante', { headers: { 'cf-connecting-ip': '6.6.6.2' } }), env);
const hs = await r.text();
verifier(r.status === 503 && !/supabase|exemple/.test(hs), 'base en panne : 503 sans detail');

console.log('\n--- Paiement : consentement aux CGV ---');
const base = { prix: 'price_x', reference: 'pc_1', email: 'a@b.fr', essaiFin: null, maintenant: Date.now() };
verifier(!parametresSession(base).has('consent_collection[terms_of_service]'), 'par defaut : aucun champ de consentement (ne casse pas Stripe)');
const avec = parametresSession({ ...base, consentementCgv: true });
verifier(avec.get('consent_collection[terms_of_service]') === 'required', 'active : consentement exige');
verifier(avec.get('custom_text[terms_of_service_acceptance][message]').includes('rétractation'), 'et renonciation mentionnee');

console.log('\n' + '='.repeat(56));
if (echecs) { console.log(`${echecs} ECHEC(S).`); process.exit(1); }
console.log('Tous les controles passent.');
