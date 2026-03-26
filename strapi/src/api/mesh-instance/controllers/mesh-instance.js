'use strict';

const { createCoreController } = require('@strapi/strapi').factories;
const { canonicalizeUrl } = require('../../../lib/canonicalUrl');
const { generateToken, hashToken, verifyToken } = require('../../../lib/tokenHelper');

module.exports = createCoreController('api::mesh-instance.mesh-instance', ({ strapi }) => ({

  /**
   * GET /api/health
   * Internal health check endpoint.
   */
  async health(ctx) {
    ctx.body = { status: 'ok', timestamp: new Date().toISOString() };
  },

  /**
   * POST /api/register
   * Register a new MeshInfo instance or update an existing one.
   *
   * Body:
   *   displayName     string  required
   *   url             string  required
   *   description     string  optional
   *   country         string  optional (ISO 3166-1 alpha-2)
   *   region          string  optional
   *   metro           string  optional
   *   contactUrl      string  optional
   *   contactEmail    string  optional
   *   reportingMode   string  optional ("none"|"heartbeat"|"stats")
   *   softwareVersion string  optional
   *
   * Returns:
   *   On new registration:  { registered: true, id, token }
   *   On re-registration:   { registered: false, id, message }
   *   On token mismatch:    401
   */
  async register(ctx) {
    const {
      displayName,
      url,
      description,
      country,
      region,
      metro,
      contactUrl,
      contactEmail,
      reportingMode,
      softwareVersion,
      token: providedToken,
    } = ctx.request.body || {};

    // --- Validate required fields ---
    if (!displayName || typeof displayName !== 'string' || !displayName.trim()) {
      return ctx.badRequest('displayName is required');
    }
    if (!url || typeof url !== 'string' || !url.trim()) {
      return ctx.badRequest('url is required');
    }

    // --- Canonicalize URL ---
    let canonicalUrl;
    try {
      canonicalUrl = canonicalizeUrl(url);
    } catch (err) {
      return ctx.badRequest(`Invalid URL: ${err.message}`);
    }

    // --- Validate reportingMode ---
    const validModes = ['none', 'heartbeat', 'stats'];
    const mode = validModes.includes(reportingMode) ? reportingMode : 'none';

    // --- Check if already registered ---
    const existing = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
      where: { canonicalUrl },
    });

    if (existing) {
      // If the caller provides a token that matches, treat as re-registration / update.
      if (providedToken) {
        const valid = await verifyToken(providedToken, existing.authTokenHash);
        if (!valid) {
          // Don't reveal that the canonical URL exists—just reject.
          return ctx.unauthorized('Invalid token');
        }

        // Token matched: allow update of mutable fields.
        await strapi.db.query('api::mesh-instance.mesh-instance').update({
          where: { id: existing.id },
          data: {
            displayName: displayName.trim(),
            description: description || existing.description,
            country: country || existing.country,
            region: region || existing.region,
            metro: metro || existing.metro,
            contactUrl: contactUrl || existing.contactUrl,
            contactEmail: contactEmail || existing.contactEmail,
            reportingMode: mode,
            softwareVersion: softwareVersion || existing.softwareVersion,
            lastSeenAt: new Date(),
          },
        });

        return ctx.send({
          registered: false,
          id: existing.documentId || existing.id,
          message: 'Instance updated successfully',
        });
      }

      // No token provided and URL exists: reject silently to avoid leaking info.
      return ctx.conflict(
        'An instance with this URL is already registered. Provide your token to update it.'
      );
    }

    // --- New registration ---
    const token = generateToken();
    const tokenHash = await hashToken(token);
    const now = new Date();

    const created = await strapi.db.query('api::mesh-instance.mesh-instance').create({
      data: {
        displayName: displayName.trim(),
        canonicalUrl,
        originalUrl: url.trim(),
        description: description || null,
        country: country || null,
        region: region || null,
        metro: metro || null,
        contactUrl: contactUrl || null,
        contactEmail: contactEmail || null,
        reportingMode: mode,
        softwareVersion: softwareVersion || null,
        status: 'pending',
        visibility: 'public',
        authTokenHash: tokenHash,
        lastSeenAt: now,
      },
    });

    // Return the plaintext token exactly once.
    ctx.status = 201;
    ctx.body = {
      registered: true,
      id: created.documentId || created.id,
      token,
      message: 'Instance registered. Awaiting moderator approval before appearing publicly.',
    };
  },

  /**
   * POST /api/instances/:id/heartbeat
   * Update lastSeenAt for an approved or pending instance.
   *
   * Body:
   *   token           string  required
   *   softwareVersion string  optional
   *
   * The :id segment accepts either the numeric database id or the documentId.
   */
  async heartbeat(ctx) {
    const { id } = ctx.params;
    const { token, softwareVersion } = ctx.request.body || {};

    if (!token) {
      return ctx.unauthorized('Token is required');
    }

    const instance = await this._findInstanceById(id);
    if (!instance) {
      return ctx.notFound('Instance not found');
    }

    const valid = await verifyToken(token, instance.authTokenHash);
    if (!valid) {
      return ctx.unauthorized('Invalid token');
    }

    // Reject operations on permanently rejected instances.
    if (instance.status === 'rejected') {
      return ctx.forbidden('Instance has been rejected');
    }

    await strapi.db.query('api::mesh-instance.mesh-instance').update({
      where: { id: instance.id },
      data: {
        lastSeenAt: new Date(),
        ...(softwareVersion ? { softwareVersion } : {}),
      },
    });

    // Log the heartbeat event.
    await strapi.db.query('api::heartbeat-event.heartbeat-event').create({
      data: {
        meshInstance: instance.id,
        eventType: 'heartbeat',
        metadata: { softwareVersion: softwareVersion || null },
      },
    });

    ctx.body = { ok: true };
  },

  /**
   * POST /api/instances/:id/stats
   * Store coarse stats snapshot.
   *
   * Body:
   *   token              string   required
   *   softwareVersion    string   optional
   *   nodeCount          integer  optional
   *   boundsNorth        float    optional
   *   boundsSouth        float    optional
   *   boundsEast         float    optional
   *   boundsWest         float    optional
   *   lastDataRefreshAt  string   optional (ISO datetime)
   */
  async stats(ctx) {
    const { id } = ctx.params;
    const {
      token,
      softwareVersion,
      nodeCount,
      boundsNorth,
      boundsSouth,
      boundsEast,
      boundsWest,
      lastDataRefreshAt,
    } = ctx.request.body || {};

    if (!token) {
      return ctx.unauthorized('Token is required');
    }

    const instance = await this._findInstanceById(id);
    if (!instance) {
      return ctx.notFound('Instance not found');
    }

    const valid = await verifyToken(token, instance.authTokenHash);
    if (!valid) {
      return ctx.unauthorized('Invalid token');
    }

    if (instance.status === 'rejected') {
      return ctx.forbidden('Instance has been rejected');
    }

    const now = new Date();

    // Update the instance's lastSeenAt and softwareVersion.
    await strapi.db.query('api::mesh-instance.mesh-instance').update({
      where: { id: instance.id },
      data: {
        lastSeenAt: now,
        ...(softwareVersion ? { softwareVersion } : {}),
      },
    });

    // Create a stats snapshot.
    await strapi.db.query('api::stats-snapshot.stats-snapshot').create({
      data: {
        meshInstance: instance.id,
        nodeCount: Number.isInteger(nodeCount) ? nodeCount : null,
        boundsNorth: boundsNorth != null ? parseFloat(boundsNorth) : null,
        boundsSouth: boundsSouth != null ? parseFloat(boundsSouth) : null,
        boundsEast: boundsEast != null ? parseFloat(boundsEast) : null,
        boundsWest: boundsWest != null ? parseFloat(boundsWest) : null,
        softwareVersion: softwareVersion || null,
        lastDataRefreshAt: lastDataRefreshAt ? new Date(lastDataRefreshAt) : null,
        payloadReceivedAt: now,
      },
    });

    // Log a stats heartbeat event.
    await strapi.db.query('api::heartbeat-event.heartbeat-event').create({
      data: {
        meshInstance: instance.id,
        eventType: 'stats',
        metadata: { softwareVersion: softwareVersion || null, nodeCount: nodeCount || null },
      },
    });

    ctx.body = { ok: true };
  },

  /**
   * GET /api/instances
   * List approved + public instances. Used server-side by Astro.
   */
  async listPublic(ctx) {
    const instances = await strapi.db.query('api::mesh-instance.mesh-instance').findMany({
      where: {
        status: 'approved',
        visibility: 'public',
      },
      orderBy: { displayName: 'asc' },
    });

    ctx.body = {
      data: instances.map(toPublicInstance),
    };
  },

  /**
   * GET /api/instances/:id
   * Get a single approved + public instance by documentId, numeric id, or slug.
   */
  async getPublic(ctx) {
    const { id } = ctx.params;

    const instance = await this._findPublicInstance(id);
    if (!instance) {
      return ctx.notFound('Instance not found');
    }

    ctx.body = { data: toPublicInstance(instance) };
  },

  // ─── Internal helpers ─────────────────────────────────────────────────────

  async _findInstanceById(id) {
    // Try documentId first, then numeric id, then slug.
    let instance = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
      where: { documentId: id },
    });
    if (!instance && /^\d+$/.test(id)) {
      instance = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
        where: { id: parseInt(id, 10) },
      });
    }
    if (!instance) {
      instance = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
        where: { slug: id },
      });
    }
    return instance || null;
  },

  async _findPublicInstance(id) {
    const base = { status: 'approved', visibility: 'public' };

    let instance = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
      where: { ...base, documentId: id },
    });
    if (!instance && /^\d+$/.test(id)) {
      instance = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
        where: { ...base, id: parseInt(id, 10) },
      });
    }
    if (!instance) {
      instance = await strapi.db.query('api::mesh-instance.mesh-instance').findOne({
        where: { ...base, slug: id },
      });
    }
    return instance || null;
  },
}));

/**
 * Map an internal instance record to a public-safe DTO.
 * Strips private/sensitive fields.
 */
function toPublicInstance(instance) {
  return {
    id: instance.documentId || instance.id,
    displayName: instance.displayName,
    canonicalUrl: instance.canonicalUrl,
    slug: instance.slug,
    description: instance.description,
    country: instance.country,
    region: instance.region,
    metro: instance.metro,
    contactUrl: instance.contactUrl,
    softwareVersion: instance.softwareVersion,
    lastSeenAt: instance.lastSeenAt,
    createdAt: instance.createdAt,
    updatedAt: instance.updatedAt,
  };
}
