import { pool } from '../../config/db.js';
import { generateAiReply } from './ai.service.js';
import { withAssistantEmoji } from './ai.presentation.js';
import { createQaContext, withQaContext, qaUsage } from './ai.qa-context.js';

const CHANNELS = new Set(['web','instagram','whatsapp','facebook']);
let busy = false;
let warned = false;

export function validateQaPayload(payload) {
  if (!Array.isArray(payload?.scenarios) || !payload.scenarios.length || payload.scenarios.length > 6) throw Error('QA_INVALID_SCENARIOS');
  let turns = 0;
  const scenarios = payload.scenarios.map((scenario, i) => {
    if (!CHANNELS.has(scenario.channel) || !Array.isArray(scenario.messages) || !scenario.messages.length || scenario.messages.length > 6) throw Error('QA_INVALID_MESSAGES');
    for (const message of scenario.messages) {
      if (typeof message !== 'string' || !message.trim() || message.length > 2400) throw Error('QA_INVALID_MESSAGE');
    }
    turns += scenario.messages.length;
    return { name: String(scenario.name || 'Caso '+(i+1)).slice(0, 100), channel: scenario.channel, messages: scenario.messages };
  });
  if (turns > 20 || JSON.stringify(payload).length > 24000) throw Error('QA_TOO_MANY_TURNS');
  return scenarios;
}

function publicState(state = {}) {
  return Object.fromEntries(['state','awaiting','check_in','check_out','adults','children','child_ages','total_guests','pets','category_slug']
    .filter(k=>state[k] !== undefined).map(k=>[k,state[k]]));
}

export async function executeQaRun(run, { generate = generateAiReply, progress = async()=>{}, shouldStop = async()=>false } = {}) {
  const scenarios = validateQaPayload(run.payload);
  const context = createQaContext({ maxCalls: run.max_calls, maxTokens: run.max_tokens });
  const transcript = [];
  let stopped = false;
  await withQaContext(context, async()=>{
    for (const [index, scenario] of scenarios.entries()) {
      const externalUserId = 'private-qa-'+run.id+'-'+index;
      const key = scenario.channel+':'+externalUserId;
      context.histories.set(key, []);
      for (const message of scenario.messages) {
        if (context.budgetHit || Date.now() > Date.parse(run.expires_at) || await shouldStop()) { stopped = true; break; }
        const start = performance.now(), beforeCalls = context.calls.length;
        const beforeInput = context.inputTokens, beforeOutput = context.outputTokens;
        let result, code;
        try {
          result = await generate({ channel: scenario.channel, externalUserId, message,
            history: structuredClone(context.histories.get(key)) });
        } catch (error) {
          code = /^[a-zA-Z0-9_]{1,60}$/.test(String(error.code)) ? String(error.code) : 'QA_TURN_FAILED';
        }
        const row = { scenario: scenario.name, channel: scenario.channel, question: message,
          reply: result?.reply ? withAssistantEmoji(result.reply) : null, mode: result?.mode || null,
          ...(result?.image_url ? { image_url: result.image_url } : {}),
          ...(code ? { error_code: code } : {}),
          duration_ms: Math.round(performance.now()-start),
          model_attempts: context.calls.length-beforeCalls,
          input_tokens: context.inputTokens-beforeInput, output_tokens: context.outputTokens-beforeOutput,
          state: publicState(context.contexts.get(key)?.whatsapp_mvp),
        };
        transcript.push(row);
        context.histories.get(key).push({author:'client',content:message});
        if (row.reply) context.histories.get(key).push({author:'assistant',content:row.reply});
        await progress({ transcript, usage: qaUsage(context) });
        if (code || context.budgetHit) { stopped = true; break; }
      }
      if (stopped) break;
    }
  });
  return { transcript, usage: qaUsage(context), stopped, isolation: 'memory_only_conversations_readonly_hotel_sources',
    expected_commit: run.expected_commit, finished_at: new Date().toISOString() };
}

// Only SQL administrators can submit jobs. This schema is not exposed to the
// public Data API and has no grants for guest or authenticated browser roles.
export async function processNextQaRun(db = pool, { commit = process.env.RENDER_GIT_COMMIT, execute = executeQaRun } = {}) {
  if (busy || !commit) return false;
  busy = true;
  let run;
  try {
    const claimed = await db.query(`
      WITH candidate AS (
        SELECT id FROM advisor_qa.runs
        WHERE status='queued' AND expected_commit=$1 AND expires_at>now()
          AND (SELECT count(*) FROM advisor_qa.runs WHERE started_at>now()-interval '24 hours') < 4
        ORDER BY created_at LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      UPDATE advisor_qa.runs r SET status='running',started_at=now()
      FROM candidate c WHERE r.id=c.id RETURNING r.*;`, [commit]);
    run = claimed.rows[0];
    if (!run) return false;
    const result = await execute(run, {
      progress: async result => db.query("UPDATE advisor_qa.runs SET result=$2::jsonb WHERE id=$1 AND status='running'", [run.id,JSON.stringify(result)]),
      shouldStop: async()=>{
        const status = await db.query('SELECT status FROM advisor_qa.runs WHERE id=$1',[run.id]);
        return status.rows[0]?.status !== 'running';
      },
    });
    await db.query("UPDATE advisor_qa.runs SET status=$2,result=$3::jsonb,finished_at=now() WHERE id=$1 AND status='running'",
      [run.id,result.stopped?'stopped':'completed',JSON.stringify(result)]);
    return true;
  } catch (error) {
    if (run) await db.query("UPDATE advisor_qa.runs SET status='failed',error_code='QA_RUN_FAILED',finished_at=now() WHERE id=$1 AND status='running'",[run.id]).catch(()=>{});
    if (!warned && error.code !== '42P01' && error.code !== '3F000') {
      console.warn('No se pudo ejecutar la prueba privada del asesor.'); warned = true;
    }
    return false;
  } finally { busy = false; }
}
