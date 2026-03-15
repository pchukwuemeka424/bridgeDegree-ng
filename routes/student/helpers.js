'use strict';

function normEmail(v) {
  return v ? String(v).trim().toLowerCase() : null;
}

function normId(v) {
  return v ? String(v).trim().toUpperCase() : null;
}

module.exports = { normEmail, normId };
