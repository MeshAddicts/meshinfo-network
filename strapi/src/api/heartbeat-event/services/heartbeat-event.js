'use strict';

const { createCoreService } = require('@strapi/strapi').factories;

module.exports = createCoreService('api::heartbeat-event.heartbeat-event');
