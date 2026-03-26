'use strict';

/**
 * Custom routes for registration, heartbeat, and stats ingestion.
 */
module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/health',
      handler: 'mesh-instance.health',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/register',
      handler: 'mesh-instance.register',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/instances/:id/heartbeat',
      handler: 'mesh-instance.heartbeat',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'POST',
      path: '/instances/:id/stats',
      handler: 'mesh-instance.stats',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/instances',
      handler: 'mesh-instance.listPublic',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
    {
      method: 'GET',
      path: '/instances/:id',
      handler: 'mesh-instance.getPublic',
      config: {
        auth: false,
        policies: [],
        middlewares: [],
      },
    },
  ],
};
