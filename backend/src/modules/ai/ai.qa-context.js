import { AsyncLocalStorage } from 'node:async_hooks';

// This context is created by the private worker only. No HTTP parameter can
// activate it. AsyncLocalStorage keeps simultaneous guest requests untouched.
const storage = new AsyncLocalStorage();
export const currentQa = () => storage.getStore();

export function createQaContext({ maxCalls = 24, maxTokens = 80000, signal, deadline = Date.now() + 900000 } = {}) {
  return {
    contexts: new Map(), responses: new Map(), histories: new Map(), calls: [], blockedActions: [],
    maxCalls: Math.min(24, Math.max(1, Number(maxCalls) || 24)),
    maxTokens: Math.min(80000, Math.max(1000, Number(maxTokens) || 80000)),
    inputTokens: 0, outputTokens: 0, cachedInputTokens: 0, budgetHit: false,
    signal, deadline, reservedTokens: 0, uncertainTokens: 0, responseBounds: new Map(),
  };
}
export const withQaContext = (context, fn) => storage.run(context, fn);

export function prepareQaCall(request) {
  const qa = currentQa();
  if (!qa) return request;
  qa.signal?.throwIfAborted();
  if (Date.now() >= qa.deadline) throw Object.assign(new Error('QA expired'), { code: 'QA_EXPIRED' });
  // Conservative reservation, not a provider tokenizer or billing guarantee.
  // Tool continuations include prior context; failed calls keep a reservation
  // because a provider may have consumed tokens without returning usage.
  const previousBound = request.previous_response_id ? qa.responseBounds.get(request.previous_response_id) : 0;
  const inputBound = Buffer.byteLength(JSON.stringify(request), 'utf8') + 4096 + (previousBound || 0);
  const remaining = qa.maxTokens - qa.inputTokens - qa.outputTokens - qa.reservedTokens - qa.uncertainTokens;
  if (qa.calls.length >= qa.maxCalls || remaining <= inputBound || (request.previous_response_id && previousBound == null)) {
    qa.budgetHit = true;
    throw Object.assign(new Error('QA budget reached'), { code: 'QA_BUDGET_REACHED' });
  }
  const outputLimit = Math.min(request.max_output_tokens || 2000, 2000, remaining - inputBound);
  qa.reservedTokens += inputBound + outputLimit;
  qa.calls.push({ status: 'pending', model: request.model, reserved_tokens: inputBound + outputLimit, context_bound: inputBound });
  // Retain the advisor's own limits; bound otherwise unlimited generation.
  return { ...request, max_output_tokens: outputLimit };
}

export function qaRequestOptions(options = {}) {
  const qa = currentQa();
  if (!qa) return options;
  qa.signal?.throwIfAborted();
  const timeout = Math.min(options.timeout || 10000, 10000, qa.deadline - Date.now());
  if (timeout <= 0) throw Object.assign(new Error('QA expired'), { code: 'QA_EXPIRED' });
  return { ...options, maxRetries: 0, timeout,
    signal: AbortSignal.any([AbortSignal.timeout(timeout), ...[qa.signal, options.signal].filter(Boolean)]) };
}

export function finishQaCall(response, error) {
  const qa = currentQa();
  if (!qa) return;
  const call = qa.calls.at(-1);
  if (!call || call.status !== 'pending') return;
  qa.reservedTokens -= call.reserved_tokens;
  if (error) {
    qa.uncertainTokens += call.reserved_tokens;
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
  if (!Number.isSafeInteger(response.usage?.input_tokens) || !Number.isSafeInteger(response.usage?.output_tokens)) {
    qa.uncertainTokens += call.reserved_tokens;
  }
  if (response.id) qa.responseBounds.set(response.id, call.context_bound + call.output_tokens);
  if (qa.inputTokens + qa.outputTokens + qa.uncertainTokens >= qa.maxTokens) qa.budgetHit = true;
}

export function qaUsage(qa) {
  return { input_tokens: qa.inputTokens, output_tokens: qa.outputTokens,
    cached_input_tokens: qa.cachedInputTokens, total_tokens: qa.inputTokens + qa.outputTokens,
    model_attempts: qa.calls.length, model_responses: qa.calls.filter(c=>c.status==='completed').length,
    calls: qa.calls, blocked_actions: qa.blockedActions, budget_reached: qa.budgetHit,
    reserved_tokens: qa.reservedTokens, uncertain_tokens: qa.uncertainTokens,
    budget_method: 'conservative_utf8_reservation_not_billing_guarantee' };
}

export function blockQaAction(action) {
  const qa = currentQa();
  if (!qa) return false;
  qa.blockedActions.push(String(action));
  return true;
}
