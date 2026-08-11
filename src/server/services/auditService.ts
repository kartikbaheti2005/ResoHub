import { runQuery, queryAll } from '../db/database';
import { User } from '../../types';

export interface AuditLogItem {
  id: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  action: string;
  entity: string;
  entityId: string;
  timestamp: string;
  metadata?: any;
}

export const auditService = {
  log: (actor: User, action: string, entity: string, entityId: string, metadata: any = {}): void => {
    const id = 'aud_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const timestamp = new Date().toISOString();

    runQuery(
      `INSERT INTO audit_logs (id, actor_id, actor_name, actor_role, action, entity, entity_id, timestamp, metadata)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        actor.id,
        actor.name,
        actor.role,
        action,
        entity,
        entityId,
        timestamp,
        JSON.stringify(metadata),
      ]
    );
  },

  getLogs: (limit = 50): AuditLogItem[] => {
    const rows = queryAll<any>(
      `SELECT id, actor_id as actorId, actor_name as actorName, actor_role as actorRole,
              action, entity, entity_id as entityId, timestamp, metadata
       FROM audit_logs
       ORDER BY timestamp DESC
       LIMIT ?`,
      [limit]
    );

    return rows.map((r) => ({
      ...r,
      metadata: r.metadata ? JSON.parse(r.metadata) : {},
    }));
  },
};
