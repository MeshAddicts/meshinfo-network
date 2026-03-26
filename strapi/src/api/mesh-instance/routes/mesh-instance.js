'use strict';

const { createCoreRouter } = require('@strapi/strapi').factories;

module.exports = createCoreRouter('api::mesh-instance.mesh-instance', {
  config: {
    find: { auth: { scope: ['api::mesh-instance.mesh-instance.find'] } },
    findOne: { auth: { scope: ['api::mesh-instance.mesh-instance.findOne'] } },
    create: { auth: { scope: ['api::mesh-instance.mesh-instance.create'] } },
    update: { auth: { scope: ['api::mesh-instance.mesh-instance.update'] } },
    delete: { auth: { scope: ['api::mesh-instance.mesh-instance.delete'] } },
  },
});
