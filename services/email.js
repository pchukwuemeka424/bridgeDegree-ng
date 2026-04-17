'use strict';

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM || 'onboarding@resend.dev';
const BASE_URL = process.env.BASE_URL || 'https://www.bridgedegree.com';
const LOGO_URL = `${BASE_URL.replace(/\/$/, '')}/images/logo.png`;

/**
 * Reusable email wrapper: injects content into a consistent Bridge Degree layout with logo.
 * @param {Object} opts - { subject, preheader, title, bodyHtml, ctaText, ctaUrl }
 * @returns {string} Full HTML email
 */
function buildEmailHtml(opts) {
  const {
    subject = '',
    preheader = '',
    title = 'Hello',
    bodyHtml = '',
    ctaText = '',
    ctaUrl = '',
  } = opts;

  const ctaBlock =
    ctaText && ctaUrl
      ? `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
      <tr>
        <td align="center">
          <a href="${escapeHtml(ctaUrl)}" style="display: inline-block; padding: 14px 28px; background: linear-gradient(135deg, #c45c26 0%, #1e3a5f 100%); color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">${escapeHtml(ctaText)}</a>
        </td>
      </tr>
    </table>`
      : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  ${preheader ? `<meta name="description" content="${escapeHtml(preheader)}">` : ''}
  <title>${escapeHtml(subject || title)}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f6f9;">
  <div style="display: none; max-height: 0; overflow: hidden;">${preheader ? escapeHtml(preheader) : ''}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f6f9; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width: 560px; background: #ffffff; border-radius: 12px; box-shadow: 0 4px 24px rgba(30, 58, 95, 0.08); overflow: hidden;">
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid #e8ecf0;">
              <a href="${escapeHtml(BASE_URL)}" style="text-decoration: none;">
                <img src="${LOGO_URL}" alt="Bridge Degree" width="180" height="48" style="display: inline-block; max-width: 180px; height: auto;" />
              </a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <h1 style="margin: 0 0 20px; font-size: 22px; font-weight: 700; color: #1e3a5f; line-height: 1.3;">${escapeHtml(title)}</h1>
              <div style="font-size: 16px; line-height: 1.6; color: #4a5568;">
                ${bodyHtml}
              </div>
              ${ctaBlock}
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 32px; background: #f8fafc; border-top: 1px solid #e8ecf0;">
              <p style="margin: 0; font-size: 13px; color: #64748b; text-align: center;">
                Nigeria's Career Infrastructure Platform<br/>
                <a href="${escapeHtml(BASE_URL)}" style="color: #1e3a5f; text-decoration: none;">www.bridgedegree.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const STATUS_LABELS = {
  submitted: 'Submitted',
  under_review: 'Under Review',
  shortlisted: 'Shortlisted',
  accepted: 'Accepted',
  rejected: 'Rejected',
};

const STATUS_MESSAGES = {
  submitted: 'Your application has been recorded and is in our system.',
  under_review: 'Our team is now reviewing your application. We will get back to you with an update.',
  shortlisted: 'Congratulations! You have been shortlisted. We will contact you with next steps soon.',
  accepted: 'Congratulations! Your application has been accepted. We look forward to supporting your journey.',
  rejected: 'After careful review, we are unable to offer you a place at this time. We encourage you to apply again in the future.',
};

/**
 * Send application status update email to the applicant.
 * @param {Object} application - { email, firstname, applicationId }
 * @param {string} newStatus - one of submitted, under_review, shortlisted, accepted, rejected
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendApplicationStatusEmail(application, newStatus) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping status email.');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }

  const to = application.email;
  const firstName = application.firstname || 'Applicant';
  const applicationId = application.applicationId || '';
  const label = STATUS_LABELS[newStatus] || newStatus;
  const message = STATUS_MESSAGES[newStatus] || 'Your application status has been updated.';

  const dashboardUrl = `${BASE_URL}/student/dashboard?email=${encodeURIComponent(to)}&applicationId=${encodeURIComponent(applicationId)}`;

  const subject = `Bridge Degree – Application ${label}`;
  const preheader = `Your application status: ${label}.`;
  const title = `Application status: ${label}`;
  const bodyHtml = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>${escapeHtml(message)}</p>
    <p><strong>Application ID:</strong> ${escapeHtml(applicationId)}</p>
    <p>You can check your status anytime from your dashboard.</p>
  `;

  const html = buildEmailHtml({
    subject,
    preheader,
    title,
    bodyHtml,
    ctaText: 'View my application',
    ctaUrl: dashboardUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Send welcome email when a new student registers (submits application at students/apply).
 * @param {Object} application - { email, firstname, applicationId }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendWelcomeEmail(application) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping welcome email.');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }

  const to = application.email;
  const firstName = application.firstname || 'there';
  const applicationId = application.applicationId || '';
  const dashboardUrl = `${BASE_URL}/student/dashboard?email=${encodeURIComponent(to)}&applicationId=${encodeURIComponent(applicationId)}`;

  const subject = 'Welcome to Bridge Degree – Application received';
  const preheader = `Hi ${firstName}, we've received your application. Save your Application ID: ${applicationId}.`;
  const title = 'Welcome to Bridge Degree';
  const bodyHtml = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>Thank you for applying to Bridge Degree — Nigeria's Career Infrastructure Platform.</p>
    <p>We've received your application and it's now in our system. Our team will review it and get back to you with updates.</p>
    <p><strong>Your Application ID:</strong> ${escapeHtml(applicationId)}</p>
    <p>Keep this ID safe. You can use it with your email to check your application status or set a password and sign in to your dashboard.</p>
  `;

  const html = buildEmailHtml({
    subject,
    preheader,
    title,
    bodyHtml,
    ctaText: 'View my application',
    ctaUrl: dashboardUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error('Resend error:', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Welcome email failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Generic send using the reusable template.
 * @param {Object} opts - { to, subject, preheader?, title, bodyHtml, ctaText?, ctaUrl? }
 */
async function sendEmail(opts) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping email.');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }
  const { to, subject, preheader, title, bodyHtml, ctaText, ctaUrl } = opts;
  const html = buildEmailHtml({ subject, preheader, title, bodyHtml, ctaText, ctaUrl });
  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: Array.isArray(to) ? to : [to],
      subject,
      html,
    });
    if (error) return { success: false, error: error.message };
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Email send failed:', err);
    return { success: false, error: err.message };
  }
}

/**
 * Notify a student they have been assigned to an internship placement (admin only).
 * @param {Object} application - { email, firstname, applicationId }
 * @param {Object} placement - { title, category?: { name } }
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
async function sendPlacementAssignedEmail(application, placement) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set; skipping placement assigned email.');
    return { success: false, error: 'RESEND_API_KEY not set' };
  }

  const to = application.email;
  if (!to) {
    return { success: false, error: 'No recipient email' };
  }

  const firstName = application.firstname || 'there';
  const applicationId = application.applicationId || '';
  const placementTitle = (placement && placement.title) || 'your new placement';
  const categoryLine =
    placement && placement.category && placement.category.name
      ? `<p><strong>Category:</strong> ${escapeHtml(placement.category.name)}</p>`
      : '';

  const dashboardUrl = `${BASE_URL}/student/dashboard?email=${encodeURIComponent(to)}&applicationId=${encodeURIComponent(applicationId)}`;

  const subject = `Bridge Degree – Placement assigned: ${placementTitle}`;
  const preheader = `You have been assigned to ${placementTitle}. View details on your dashboard.`;
  const title = 'You have a placement';
  const bodyHtml = `
    <p>Hi ${escapeHtml(firstName)},</p>
    <p>You have been assigned to the following internship placement:</p>
    <p style="margin: 16px 0; padding: 14px 18px; background: #f8fafc; border-radius: 8px; border-left: 4px solid #1e3a5f;">
      <strong style="font-size: 17px; color: #1e3a5f;">${escapeHtml(placementTitle)}</strong>
    </p>
    ${categoryLine}
    <p><strong>Application ID:</strong> ${escapeHtml(applicationId)}</p>
    <p>Open your student dashboard to review your placement and next steps.</p>
  `;

  const html = buildEmailHtml({
    subject,
    preheader,
    title,
    bodyHtml,
    ctaText: 'Open my dashboard',
    ctaUrl: dashboardUrl,
  });

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject,
      html,
    });
    if (error) {
      console.error('Resend error (placement assigned):', error);
      return { success: false, error: error.message };
    }
    return { success: true, id: data?.id };
  } catch (err) {
    console.error('Placement assigned email failed:', err);
    return { success: false, error: err.message };
  }
}

module.exports = {
  resend,
  buildEmailHtml,
  sendEmail,
  sendApplicationStatusEmail,
  sendWelcomeEmail,
  sendPlacementAssignedEmail,
  STATUS_LABELS,
  STATUS_MESSAGES,
};
