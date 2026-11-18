import { AsyncLocalStorage } from 'node:async_hooks';

// This context is created by the private worker only. No HTTP parameter can
// activate it. AsyncLocalStorage keeps simultaneous guest requests untouched.
const storage = new AsyncLocalStorage();
export const currentQa = () => storage.getStore();

export function createQaContext({ maxCalls = 24, maxTokens = 80000 } = {}) {
  return {
    contexts: new Map(), responses: new Map(), histories: new Map(), calls: [], blockedActions: [],
    maxCalls: Math.min(24, Math.max(1, Number(maxCalls) || 24)),
    maxTokens: Math.min(80000, Math.max(1000, Number(maxTokens) || 80000)),
    inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, budgetHit: false,
  };
}
export const withQaContext = (context, fn) => storage.run(context, fn);

export function prepareQaCall(request) {
  const qa = currentQa();
  if (!qa) return request;
  if (qa.calls.length >= qa.maxCalls || qa.inputTokens + qa.outputTokens >= qa.maxTokens) {
    qa.budgetHit = true;
    throw Object.assign(new Error('QA budget reached'), { code: 'QA_BUDGET_REACHED' });
  }
  qa.calls.push({ status: 'pending', model: request.model });
  // Retain the advisor's own limits; bound otherwise unlimited generation.
  return { ...request, max_output_tokens: Math.min(request.max_output_tokens || 2000, 2000) };
}

export function finishQaCall(response, error) {
  const qa = currentQa();
  if (!qa) return;
  const call = qa.calls.at(-1);
  if (!call || call.status !== 'pending') return;
  if (error) {
    call.status = 'failed';
    const code = String(error.code || error.status || 'unknown');
    call.code = /^[a-zA-Z0-9_]{1,60}$/.test(code) ? code : 'unknown';
    return;
  }
  const count = value => Number.isSafeInteger(value) && value >= 0 ? value : 0;
  call.status = response.status || 'completed';
  call.model = response.model || call.model;
  call.input_tokens = count(response.usage?.input_tokens);
  call.output_tokens = count(response.usage?.output_tokens);
  call.cached_input_tokens = count(response.usage?.input_tokens_details?.cached_tokens);
  qa.inputTokens += call.input_tokens;
  qa.outputTokens += call.output_tokens;
  qa.cachedInputTokens += call.cached_input_tokens;
}

export function qaUsage(qa) {
  return { input_tokens: qa.inputTokens, output_tokens: qa.outputTokens,
    cached_input_tokens: qa.cachedInputTokens, total_tokens: qa.inputTokens + qa.outputTokens,
    model_attempts: qa.calls.length, model_responses: qa.calls.filter(c=>c.status==='completed').length,
    calls: qa.calls, blocked_actions: qa.blockedActions, budget_reached: qa.budgetHit };
}

export function blockQaAction(action) {
  const qa = currentQa();
  if (!qa) return false;
  qa.blockedActions.push(String(action));
  return true;
}
