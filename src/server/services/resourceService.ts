import { queryAll, queryOne, runQuery } from '../db/database';
import { auditService } from './auditService';
import { Resource, ResourceCategory, User } from '../../types';

export const resourceService = {
  getCategories: (): ResourceCategory[] => {
    return queryAll<ResourceCategory>('SELECT id, name, description, icon FROM categories ORDER BY name ASC');
  },

  getResources: (params?: {
    category?: string;
    search?: string;
    minCapacity?: number;
    status?: string;
    requiredEquipment?: string[];
  }): Resource[] => {
    let sql = `SELECT r.id, r.name, r.category_id as categoryId, r.category_name as categoryName,
                      r.location, r.capacity, r.status, r.description, r.image_url as imageUrl,
                      r.created_at as createdAt, r.updated_at as updatedAt,
                      s.system_count as systemCount, s.laptop_count as laptopCount,
                      s.has_projector as hasProjector, s.has_screen as hasScreen,
                      s.has_ac as hasAC, s.has_internet as hasInternet,
                      s.has_audio_system as hasAudioSystem, s.has_microphones as hasMicrophones,
                      s.has_smart_board as hasSmartBoard, s.installed_software as installedSoftware,
                      s.other_notes as otherNotes
               FROM resources r
               LEFT JOIN resource_specifications s ON r.id = s.resource_id
               WHERE 1=1`;
    const queryParams: any[] = [];

    if (params?.category) {
      sql += ` AND r.category_id = ?`;
      queryParams.push(params.category);
    }

    if (params?.status) {
      sql += ` AND r.status = ?`;
      queryParams.push(params.status);
    }

    if (params?.minCapacity) {
      sql += ` AND r.capacity >= ?`;
      queryParams.push(Number(params.minCapacity));
    }

    if (params?.search) {
      const q = `%${params.search.toLowerCase()}%`;
      sql += ` AND (LOWER(r.name) LIKE ? OR LOWER(r.location) LIKE ? OR LOWER(r.description) LIKE ? OR LOWER(r.category_name) LIKE ?)`;
      queryParams.push(q, q, q, q);
    }

    sql += ` ORDER BY r.name ASC`;

    const rows = queryAll<any>(sql, queryParams);

    return rows.map((r) => {
      const installedSoftware = r.installedSoftware ? JSON.parse(r.installedSoftware) : [];
      const specs = {
        systemCount: r.systemCount || 0,
        laptopCount: r.laptopCount || 0,
        hasProjector: Boolean(r.hasProjector),
        hasScreen: Boolean(r.hasScreen),
        hasAC: Boolean(r.hasAC),
        hasInternet: Boolean(r.hasInternet),
        hasAudioSystem: Boolean(r.hasAudioSystem),
        hasMicrophones: Boolean(r.hasMicrophones),
        hasSmartBoard: Boolean(r.hasSmartBoard),
        installedSoftware,
        otherNotes: r.otherNotes || '',
      };

      return {
        id: r.id,
        name: r.name,
        categoryId: r.categoryId,
        categoryName: r.categoryName,
        location: r.location,
        capacity: r.capacity,
        status: r.status,
        description: r.description,
        specifications: specs,
        imageUrl: r.imageUrl,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      };
    });
  },

  getResourceById: (id: string): Resource | null => {
    const list = resourceService.getResources();
    return list.find((r) => r.id === id) || null;
  },

  createResource: (manager: User, data: any): Resource => {
    const cat = queryOne<ResourceCategory>('SELECT name FROM categories WHERE id = ?', [data.categoryId]);
    const categoryName = cat ? cat.name : 'General';

    const resourceId = 'res_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const now = new Date().toISOString();

    runQuery(
      `INSERT INTO resources (id, name, category_id, category_name, location, capacity, status, description, image_url, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resourceId,
        data.name,
        data.categoryId,
        categoryName,
        data.location,
        data.capacity,
        data.status || 'AVAILABLE',
        data.description || '',
        data.imageUrl || 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=600&auto=format&fit=crop&q=60',
        now,
        now,
      ]
    );

    const specs = data.specifications || {};
    const softwareJson = JSON.stringify(specs.installedSoftware || []);

    runQuery(
      `INSERT INTO resource_specifications (
        resource_id, system_count, laptop_count, has_projector, has_screen, has_ac, has_internet,
        has_audio_system, has_microphones, has_smart_board, installed_software, other_notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        resourceId,
        specs.systemCount || 0,
        specs.laptopCount || 0,
        specs.hasProjector ? 1 : 0,
        specs.hasScreen ? 1 : 0,
        specs.hasAC ? 1 : 0,
        specs.hasInternet ? 1 : 0,
        specs.hasAudioSystem ? 1 : 0,
        specs.hasMicrophones ? 1 : 0,
        specs.hasSmartBoard ? 1 : 0,
        softwareJson,
        specs.otherNotes || '',
      ]
    );

    auditService.log(manager, 'CREATE_RESOURCE', 'resource', resourceId, { name: data.name });

    return resourceService.getResourceById(resourceId)!;
  },

  updateResource: (manager: User, id: string, updates: any): Resource => {
    const existing = resourceService.getResourceById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND', status: 404, message: 'Resource not found.' };
    }

    const now = new Date().toISOString();
    let categoryName = existing.categoryName;

    if (updates.categoryId && updates.categoryId !== existing.categoryId) {
      const cat = queryOne<ResourceCategory>('SELECT name FROM categories WHERE id = ?', [updates.categoryId]);
      if (cat) categoryName = cat.name;
    }

    runQuery(
      `UPDATE resources SET
        name = ?, category_id = ?, category_name = ?, location = ?,
        capacity = ?, status = ?, description = ?, image_url = ?, updated_at = ?
       WHERE id = ?`,
      [
        updates.name || existing.name,
        updates.categoryId || existing.categoryId,
        categoryName,
        updates.location || existing.location,
        updates.capacity !== undefined ? updates.capacity : existing.capacity,
        updates.status || existing.status,
        updates.description !== undefined ? updates.description : existing.description,
        updates.imageUrl || existing.imageUrl,
        now,
        id,
      ]
    );

    if (updates.specifications) {
      const s = updates.specifications;
      const softwareJson = JSON.stringify(s.installedSoftware || []);

      runQuery(
        `UPDATE resource_specifications SET
          system_count = ?, laptop_count = ?, has_projector = ?, has_screen = ?,
          has_ac = ?, has_internet = ?, has_audio_system = ?, has_microphones = ?,
          has_smart_board = ?, installed_software = ?, other_notes = ?
         WHERE resource_id = ?`,
        [
          s.systemCount || 0,
          s.laptopCount || 0,
          s.hasProjector ? 1 : 0,
          s.hasScreen ? 1 : 0,
          s.hasAC ? 1 : 0,
          s.hasInternet ? 1 : 0,
          s.hasAudioSystem ? 1 : 0,
          s.hasMicrophones ? 1 : 0,
          s.hasSmartBoard ? 1 : 0,
          softwareJson,
          s.otherNotes || '',
          id,
        ]
      );
    }

    auditService.log(manager, 'UPDATE_RESOURCE', 'resource', id, updates);

    return resourceService.getResourceById(id)!;
  },

  deleteResource: (manager: User, id: string): void => {
    const existing = resourceService.getResourceById(id);
    if (!existing) {
      throw { code: 'NOT_FOUND', status: 404, message: 'Resource not found.' };
    }

    runQuery('DELETE FROM resources WHERE id = ?', [id]);
    auditService.log(manager, 'DELETE_RESOURCE', 'resource', id, { name: existing.name });
  },
};
