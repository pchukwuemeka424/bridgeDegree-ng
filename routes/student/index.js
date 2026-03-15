'use strict';

const express = require('express');
const router = express.Router();
const login = require('./login');
const dashboard = require('./dashboard');
const learning = require('./learning');

router.use(login);
router.use(dashboard);
router.use(learning);

module.exports = router;
