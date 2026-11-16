/**
 * Quiz result emails for the study apps.
 *
 * How to set up (about 5 minutes, once):
 *   1. Go to https://script.google.com and click "New project".
 *   2. Delete what is there and paste in this whole file. Click the save icon.
 *   3. Click Deploy > New deployment. Click the cog and choose "Web app".
 *      Execute as: Me.   Who has access: Anyone.   Click Deploy.
 *   4. Google asks you to authorise it. It needs permission to send email as you.
 *   5. Copy the "Web app URL" (it ends in /exec).
 *   6. On each tablet, open the app's settings and paste that URL into
 *      "Quiz reports for a parent". Tap "Send a test email".
 *
 * Emails go to the Google account that owns this script. No email address is
 * written here or in the apps. Keep the Web app URL private: anyone who has it
 * can send you a result email (up to DAILY_LIMIT a day).
 */

var DAILY_LIMIT = 80;

function doPost(e) {
  try {
    var d = JSON.parse(e.postData.contents);

    // Stop runaway or abusive use: a fixed number of emails per day.
    var lock = LockService.getScriptLock();
    lock.waitLock(5000);
    var props = PropertiesService.getScriptProperties();
    var day = Utilities.formatDate(new Date(), 'Europe/London', 'yyyy-MM-dd');
    var sent = Number(props.getProperty('sent-' + day) || 0);
    if (sent >= DAILY_LIMIT) { lock.releaseLock(); return reply({ ok: false, reason: 'daily limit reached' }); }
    props.setProperty('sent-' + day, String(sent + 1));
    lock.releaseLock();

    // Treat everything received as plain text of limited length.
    var text = function (v, max) { return String(v == null ? '' : v).replace(/[<>&]/g, '').slice(0, max || 120); };
    var whole = function (v) { return Math.max(0, Math.min(1000, Math.round(Number(v) || 0))); };

    var student = text(d.student, 40) || 'Student';
    var subject = text(d.subject, 40);
    var topic = text(d.topic, 120) || 'All topics';
    var quiz = text(d.quiz, 80) || 'Quiz';
    var score = whole(d.score);
    var total = Math.max(1, whole(d.total));
    var percent = Math.round((Math.min(score, total) / total) * 100);
    var progress = text(d.subjectProgress, 120);
    var app = text(d.app, 40);
    var when = Utilities.formatDate(new Date(), 'Europe/London', "EEEE d MMMM, HH:mm");

    var rows = [
      ['Student', student],
      ['Subject', subject],
      ['Topic', topic],
      ['Quiz', quiz],
      ['Score', score + ' out of ' + total],
      ['Percentage', percent + '%'],
      ['Subject completed', progress],
      ['When', when],
      ['App', app]
    ];
    var title = (d.test ? 'TEST: ' : '') + student + ': ' + subject + ' quiz, ' + score + '/' + total + ' (' + percent + '%)';
    var plain = rows.map(function (r) { return r[0] + ': ' + r[1]; }).join('\n');
    var html = '<table style="border-collapse:collapse;font:16px/1.5 Arial,sans-serif">' +
      rows.map(function (r) {
        return '<tr><td style="padding:6px 16px 6px 0;color:#555">' + r[0] + '</td><td style="padding:6px 0"><strong>' + r[1] + '</strong></td></tr>';
      }).join('') + '</table>';

    MailApp.sendEmail({
      to: Session.getEffectiveUser().getEmail(),
      subject: title,
      body: plain,
      htmlBody: html,
      name: 'Study apps'
    });
    return reply({ ok: true });
  } catch (err) {
    return reply({ ok: false, reason: String(err) });
  }
}

// Opening the URL in a browser shows that the script is running.
function doGet() {
  return reply({ ok: true, message: 'The quiz email script is running.' });
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
