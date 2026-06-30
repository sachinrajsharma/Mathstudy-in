'use strict';
/*
 * scripts/spam-clean.js — shared spam-link scrubber for MathStudy blog content.
 * Removes injected link-farm anchors (astrologyforum.net etc.) entirely — link AND
 * its text — then tidies the empty wrappers/separators they leave behind.
 * Keeps legitimate links (udgamwelfarefoundation.com, real socials).
 * Used by the local blogs.json cleaner and the live-DB cleaner (clean-spam-links.js).
 */

// Domains to scrub. Escaped for regex. Add more here if new spam appears.
const SPAM_DOMAINS = [
  'astrologyforum\\.net',
  'example\\.com',
  'demosites\\.royal-elementor-addons\\.com',
];

const anchorRe = new RegExp(
  '<a\\b[^>]*href\\s*=\\s*["\\\']?\\s*https?:\\/\\/(?:www\\.)?(?:' + SPAM_DOMAINS.join('|') + ')[^>]*>[\\s\\S]*?<\\/a>',
  'gi'
);
const bareUrlRe = new RegExp(
  'https?:\\/\\/(?:www\\.)?(?:' + SPAM_DOMAINS.join('|') + ')[^\\s"\\\'<)]*',
  'gi'
);

function cleanSpam(html) {
  let s = String(html || '');
  s = s.replace(anchorRe, '');      // drop spam anchors (link + text)
  s = s.replace(bareUrlRe, '');     // drop any bare spam URLs left as text
  // tidy the debris the removed links leave behind
  s = s.replace(/<li[^>]*>\s*<\/li>/gi, '');                 // empty list items
  s = s.replace(/<(p|span|strong|em|h[1-6])[^>]*>\s*<\/\1>/gi, ''); // empty inline/para tags
  s = s.replace(/<ul[^>]*>\s*<\/ul>/gi, '').replace(/<ol[^>]*>\s*<\/ol>/gi, '');
  s = s.replace(/(\s*[|,·•\-–]\s*){2,}/g, ' ');               // runs of leftover separators
  s = s.replace(/[ \t]{2,}/g, ' ').replace(/(\n\s*){3,}/g, '\n\n'); // whitespace
  return s.trim();
}

function countSpam(html) {
  return (String(html || '').match(anchorRe) || []).length + (String(html || '').match(bareUrlRe) || []).length;
}

module.exports = { cleanSpam, countSpam, SPAM_DOMAINS };
