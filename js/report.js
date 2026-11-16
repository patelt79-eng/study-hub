// Quiz result emails for a parent.
// Nothing is sent unless a parent has pasted their own Google Apps Script address
// into Settings on this tablet. The address and the student's name are saved on
// the tablet only; they are never in the app's code.
// If a result cannot be sent (for example the tablet is offline), it waits in a
// queue and is tried again the next time the app is open.

import * as store from './store.js';

const MAX_QUEUE = 50;

export const reportUrl = () => store.get('reportUrl', '');
export const reportName = () => store.get('reportName', '');

// Only a Google Apps Script web app address is accepted.
export function validReportUrl(url) {
  return /^https:\/\/script\.google\.com\/macros\/s\/[\w-]+\/exec$/.test(String(url || '').trim());
}

export function saveReportSettings(url, name) {
  const u = String(url || '').trim();
  if (u && !validReportUrl(u)) return false;
  if (u) store.set('reportUrl', u); else store.remove('reportUrl');
  const n = String(name || '').trim().slice(0, 40);
  if (n) store.set('reportName', n); else store.remove('reportName');
  return true;
}

// Apps Script does not allow the page to read its reply, so a request that leaves
// the tablet without a network error is counted as sent.
async function post(url, payload) {
  await fetch(url, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
  });
}

let flushing = false;

export async function flushReports() {
  const url = reportUrl();
  if (!url || flushing) return;
  flushing = true;
  try {
    let queue = store.get('reportQueue', []);
    while (queue.length) {
      await post(url, queue[0]);
      queue = store.get('reportQueue', []).slice(1);
      store.set('reportQueue', queue);
    }
  } catch (e) {
    // Offline or blocked: leave the queue for next time.
  } finally {
    flushing = false;
  }
}

// result: { subject, topic, quiz, score, total, subjectProgress }
export function sendQuizReport(result) {
  if (!reportUrl()) return;
  const queue = store.get('reportQueue', []);
  queue.push({ v: 1, app: 'Study Hub', student: reportName() || 'Student', ...result });
  store.set('reportQueue', queue.slice(-MAX_QUEUE));
  flushReports();
}

// Used by the "Send a test email" button. Returns true if the request left the tablet.
export async function sendTestReport() {
  const url = reportUrl();
  if (!url) return false;
  try {
    await post(url, {
      v: 1, app: 'Study Hub', student: reportName() || 'Student', test: true,
      subject: 'Test', topic: 'This is a test', quiz: 'Test email', score: 4, total: 5,
      subjectProgress: '3 of 6 topics done (50%)',
    });
    return true;
  } catch (e) {
    return false;
  }
}
