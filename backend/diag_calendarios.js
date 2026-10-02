/**
 * Diagnóstico rápido — verifica si ltp.campanario puede leer los calendarios
 */
require('dotenv').config();
const GAS_ID   = 'AKfycbzuaS4l3DCDOpkEV70J9_3RFejncNrAfuWAyRHxzbY7ioW-zk0i2kDrlOEhwawu6hDi0g';
const TOKEN    = 'LTP_SEC_2026_LEGAL_VAULT_KEY';
const CAL_SALA = 'c_19d0bf8733f11c48ab179877049714b6a4c2bec9ee54190075af32f2384aa4fc@group.calendar.google.com';
const CAL_EVAL = 'c_9c0e390266d24cb3953c3a911df0e237820c32beed34ab89df4e336239008b06@group.calendar.google.com';

async function callGas(action, extra = {}, timeoutMs = 45000) {
  const res = await fetch(`https://script.google.com/macros/s/${GAS_ID}/exec`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ authToken: TOKEN, action, ...extra }),
    signal:  AbortSignal.timeout(timeoutMs)
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.error);
  return json;
}

async function testCalendar(name, calId) {
  console.log(`\n🔍 Probando calendario: ${name}`);
  console.log(`   ID: ${calId}`);
  // Solo últimos 7 días — rango mínimo para diagnosticar acceso
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const until = new Date().toISOString();
  try {
    const r = await callGas('get_calendar_events', { calendarId: calId, since, until }, 45000);
    console.log(`   ✅ ACCESO OK — ${r.total} evento(s) en los últimos 7 días`);
    return true;
  } catch(e) {
    if (e.message?.includes('timeout') || e.name === 'TimeoutError') {
      console.log(`   ❌ TIMEOUT — El calendario NO está accesible para ltp.campanario`);
      console.log(`   → Solución: Comparte este calendario con ltp.campanario@eduvallediguillin.gob.cl`);
    } else {
      console.log(`   ❌ ERROR: ${e.message}`);
    }
    return false;
  }
}

async function main() {
  console.log('=== DIAGNÓSTICO ACCESO A CALENDARIOS ===');
  console.log('Cuenta GAS: ltp.campanario@eduvallediguillin.gob.cl\n');

  const ping = await callGas('ping');
  console.log(`✓ GAS online: ${ping.user} v${ping.version}`);

  const salaOk = await testCalendar('Sala de Computación', CAL_SALA);
  const evalOk = await testCalendar('Evaluaciones 2° Semestre', CAL_EVAL);

  console.log('\n=== RESUMEN ===');
  console.log(`Sala Computación : ${salaOk ? '✅ Accesible' : '❌ Sin acceso — compartir con ltp.campanario'}`);
  console.log(`Evaluaciones     : ${evalOk ? '✅ Accesible' : '❌ Sin acceso — compartir con ltp.campanario'}`);

  if (!salaOk || !evalOk) {
    console.log('\n📋 PASOS PARA COMPARTIR UN CALENDARIO:');
    console.log('1. Abre Google Calendar con la cuenta que administra el calendario');
    console.log('2. Clic en los 3 puntos del calendario → "Configuración y uso compartido"');
    console.log('3. Sección "Compartir con personas específicas" → Agregar persona');
    console.log('4. Escribe: ltp.campanario@eduvallediguillin.gob.cl');
    console.log('5. Permisos: "Ver todos los detalles del evento" (mínimo)');
    console.log('6. Guarda y ejecuta de nuevo: node sync_google_evaluations.js');
  }
}

main().catch(e => { console.error('Error fatal:', e.message); process.exit(1); });
