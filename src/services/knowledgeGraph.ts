/**
 * Knowledge Graph Service
 * 
 * Browser-based triple store for corporate ownership mapping and
 * relationship analysis. Inspired by PayPal's graph ML approach
 * for fraud detection (TWIML Episode #593).
 * 
 * Key Features:
 * - Triple store (subject-predicate-object) for relationships
 * - Corporate ownership chain queries
 * - Graph-based anomaly detection patterns
 * - Entity embedding support for similarity search
 * 
 * @module knowledgeGraph
 */

import { db } from '../db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface Triple {
  id: string;
  subject: string;           // Entity URI, e.g., 'company:amazon-inc'
  predicate: string;         // Relationship, e.g., 'owns', 'operates', 'employs'
  object: string;            // Target entity, e.g., 'facility:us-east-dc-001'
  confidence: number;        // 0-1, how confident we are in this relationship
  sources: string[];         // Evidence record IDs supporting this triple
  timestamp: Date;
  metadata?: Record<string, unknown>;
}

export interface Entity {
  uri: string;               // Unique identifier, e.g., 'company:amazon-inc'
  type: EntityType;
  label: string;             // Human-readable name
  properties: Record<string, unknown>;
  embedding?: number[];      // Vector embedding for similarity search
  createdAt: Date;
  updatedAt: Date;
}

export type EntityType = 
  | 'company' 
  | 'subsidiary' 
  | 'facility' 
  | 'permit' 
  | 'subsidy' 
  | 'violation' 
  | 'person' 
  | 'location'
  | 'union'
  | 'contractor';

export interface GraphQueryResult {
  bindings: Record<string, string>[];
  paths: Triple[][];
  executionTime: number;
}

export interface OwnershipChain {
  root: string;              // Ultimate parent company
  chain: Array<{
    entity: string;
    relationship: string;
    confidence: number;
  }>;
  depth: number;
}

export interface AnomalyPattern {
  id: string;
  type: 'coordinated_applications' | 'shell_company' | 'timing_correlation' | 'shared_officers';
  entities: string[];
  confidence: number;
  description: string;
  evidence: string[];
}

// ============================================================================
// KNOWLEDGE GRAPH SERVICE
// ============================================================================

class KnowledgeGraphService {
  private tripleCache: Map<string, Triple> = new Map();
  private entityCache: Map<string, Entity> = new Map();

  // ============================================================================
  // TRIPLE MANAGEMENT
  // ============================================================================

  /**
   * Add a triple (relationship) to the knowledge graph
   */
  async addTriple(
    subject: string,
    predicate: string,
    object: string,
    options: {
      confidence?: number;
      sources?: string[];
      metadata?: Record<string, unknown>;
    } = {}
  ): Promise<Triple> {
    const id = this.generateTripleId(subject, predicate, object);
    
    // Check for existing triple
    const existing = await this.getTriple(id);
    if (existing) {
      // Update confidence and sources
      existing.confidence = Math.max(existing.confidence, options.confidence ?? 0.5);
      existing.sources = [...new Set([...existing.sources, ...(options.sources ?? [])])];
      existing.timestamp = new Date();
      await this.persistTriple(existing);
      return existing;
    }

    const triple: Triple = {
      id,
      subject,
      predicate,
      object,
      confidence: options.confidence ?? 0.5,
      sources: options.sources ?? [],
      timestamp: new Date(),
      metadata: options.metadata,
    };

    await this.persistTriple(triple);
    this.tripleCache.set(id, triple);
    
    console.log(`[KnowledgeGraph] Added: ${subject} --${predicate}--> ${object}`);
    
    return triple;
  }

  /**
   * Add an entity to the knowledge graph
   */
  async addEntity(
    uri: string,
    type: EntityType,
    label: string,
    properties: Record<string, unknown> = {}
  ): Promise<Entity> {
    const existing = await this.getEntity(uri);
    if (existing) {
      existing.properties = { ...existing.properties, ...properties };
      existing.updatedAt = new Date();
      await this.persistEntity(existing);
      return existing;
    }

    const entity: Entity = {
      uri,
      type,
      label,
      properties,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await this.persistEntity(entity);
    this.entityCache.set(uri, entity);
    
    return entity;
  }

  // ============================================================================
  // QUERYING
  // ============================================================================

  /**
   * Find triples matching a pattern (any field can be null for wildcard)
   */
  async findTriples(
    subject?: string | null,
    predicate?: string | null,
    object?: string | null
  ): Promise<Triple[]> {
    const allTriples = await this.getAllTriples();
    
    return allTriples.filter(t => {
      if (subject && t.subject !== subject) return false;
      if (predicate && t.predicate !== predicate) return false;
      if (object && t.object !== object) return false;
      return true;
    });
  }

  /**
   * Execute a graph pattern query (simplified SPARQL-like)
   * 
   * Example patterns:
   * [
   *   { subject: '?company', predicate: 'owns', object: '?subsidiary' },
   *   { subject: '?subsidiary', predicate: 'operates', object: '?facility' },
   *   { subject: '?facility', predicate: 'has_violation', object: '?violation' }
   * ]
   */
  async query(patterns: Array<{
    subject: string;
    predicate: string;
    object: string;
  }>): Promise<GraphQueryResult> {
    const startTime = performance.now();
    const bindings: Record<string, string>[] = [];
    const paths: Triple[][] = [];

    // Simple pattern matching (no full SPARQL optimizer)
    const allTriples = await this.getAllTriples();
    
    // Start with first pattern
    const firstPattern = patterns[0];
    const initialMatches = this.matchPattern(allTriples, firstPattern, {});

    for (const match of initialMatches) {
      let currentBindings = [match.bindings];
      let currentPath = [match.triple];

      // Try to match remaining patterns
      for (let i = 1; i < patterns.length; i++) {
        const pattern = patterns[i];
        const newBindings: Record<string, string>[] = [];
        const newPaths: Triple[][] = [];

        for (const binding of currentBindings) {
          const matches = this.matchPattern(allTriples, pattern, binding);
          for (const m of matches) {
            newBindings.push({ ...binding, ...m.bindings });
            newPaths.push([...currentPath, m.triple]);
          }
        }

        currentBindings = newBindings;
        if (currentBindings.length === 0) break;
      }

      bindings.push(...currentBindings);
      paths.push(...currentPath.length === patterns.length ? [currentPath] : []);
    }

    return {
      bindings,
      paths,
      executionTime: performance.now() - startTime,
    };
  }

  /**
   * Find ownership chain for an entity (traverse up to parent companies)
   */
  async findOwnershipChain(entityUri: string, maxDepth: number = 10): Promise<OwnershipChain> {
    const chain: OwnershipChain['chain'] = [];
    let current = entityUri;
    let depth = 0;

    while (depth < maxDepth) {
      // Find who owns the current entity
      const owners = await this.findTriples(null, 'owns', current);
      
      if (owners.length === 0) {
        // No parent found - current is the root
        break;
      }

      // Take the highest confidence ownership
      const owner = owners.sort((a, b) => b.confidence - a.confidence)[0];
      
      chain.push({
        entity: owner.subject,
        relationship: 'owns',
        confidence: owner.confidence,
      });

      current = owner.subject;
      depth++;
    }

    return {
      root: current,
      chain: chain.reverse(),
      depth: chain.length,
    };
  }

  /**
   * Find all facilities owned by a company (including through subsidiaries)
   */
  async findOwnedFacilities(companyUri: string, maxDepth: number = 5): Promise<string[]> {
    const facilities: Set<string> = new Set();
    const visited: Set<string> = new Set();
    const queue: Array<{ entity: string; depth: number }> = [{ entity: companyUri, depth: 0 }];

    while (queue.length > 0) {
      const { entity, depth } = queue.shift()!;
      
      if (visited.has(entity) || depth > maxDepth) continue;
      visited.add(entity);

      // Find directly operated facilities
      const operates = await this.findTriples(entity, 'operates', null);
      operates.forEach(t => facilities.add(t.object));

      // Find subsidiaries to recurse
      const owns = await this.findTriples(entity, 'owns', null);
      owns.forEach(t => {
        if (!visited.has(t.object)) {
          queue.push({ entity: t.object, depth: depth + 1 });
        }
      });
    }

    return Array.from(facilities);
  }

  // ============================================================================
  // ANOMALY DETECTION
  // ============================================================================

  /**
   * Detect coordinated subsidy applications (fraud ring pattern)
   */
  async detectCoordinatedApplications(): Promise<AnomalyPattern[]> {
    const patterns: AnomalyPattern[] = [];
    
    // Find facilities that share the same parent company but applied for subsidies
    // in different jurisdictions around the same time
    const subsidyTriples = await this.findTriples(null, 'received_subsidy', null);
    
    // Group by parent company
    const byParent: Map<string, Triple[]> = new Map();
    
    for (const triple of subsidyTriples) {
      const chain = await this.findOwnershipChain(triple.subject);
      const parent = chain.root;
      
      if (!byParent.has(parent)) {
        byParent.set(parent, []);
      }
      byParent.get(parent)!.push(triple);
    }

    // Check for suspicious patterns
    for (const [parent, subsidies] of byParent) {
      if (subsidies.length > 3) {
        // Multiple subsidies to same parent - check timing
        const timestamps = subsidies.map(s => s.timestamp.getTime());
        const timeRange = Math.max(...timestamps) - Math.min(...timestamps);
        const days = timeRange / (1000 * 60 * 60 * 24);

        if (days < 365 && subsidies.length > 5) {
          patterns.push({
            id: `coord_${parent}`,
            type: 'coordinated_applications',
            entities: [parent, ...subsidies.map(s => s.subject)],
            confidence: Math.min(0.9, 0.5 + (subsidies.length * 0.05)),
            description: `${subsidies.length} subsidy applications through ${parent} within ${Math.round(days)} days`,
            evidence: subsidies.map(s => s.id),
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Detect shell company patterns (minimal operations, multiple subsidiaries)
   */
  async detectShellCompanies(): Promise<AnomalyPattern[]> {
    const patterns: AnomalyPattern[] = [];
    
    // Find entities that own many subsidiaries but operate few facilities directly
    const entities = await this.getAllEntities();
    
    for (const entity of entities.filter(e => e.type === 'company')) {
      const owns = await this.findTriples(entity.uri, 'owns', null);
      const operates = await this.findTriples(entity.uri, 'operates', null);
      
      // Shell company pattern: many subsidiaries, few direct operations
      if (owns.length > 3 && operates.length === 0) {
        patterns.push({
          id: `shell_${entity.uri}`,
          type: 'shell_company',
          entities: [entity.uri, ...owns.map(o => o.object)],
          confidence: Math.min(0.8, 0.4 + (owns.length * 0.1)),
          description: `${entity.label} owns ${owns.length} subsidiaries but operates 0 facilities directly`,
          evidence: owns.map(o => o.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Detect shared corporate officers across entities
   */
  async detectSharedOfficers(): Promise<AnomalyPattern[]> {
    const patterns: AnomalyPattern[] = [];
    
    // Find persons who are officers at multiple companies
    const officerTriples = await this.findTriples(null, 'has_officer', null);
    
    // Group by officer
    const byOfficer: Map<string, string[]> = new Map();
    
    for (const triple of officerTriples) {
      if (!byOfficer.has(triple.object)) {
        byOfficer.set(triple.object, []);
      }
      byOfficer.get(triple.object)!.push(triple.subject);
    }

    // Flag officers at multiple companies
    for (const [officer, companies] of byOfficer) {
      if (companies.length > 2) {
        patterns.push({
          id: `shared_officer_${officer}`,
          type: 'shared_officers',
          entities: [officer, ...companies],
          confidence: Math.min(0.85, 0.5 + (companies.length * 0.1)),
          description: `Officer ${officer} serves at ${companies.length} different companies`,
          evidence: officerTriples.filter(t => t.object === officer).map(t => t.id),
        });
      }
    }

    return patterns;
  }

  /**
   * Run all anomaly detection patterns
   */
  async detectAllAnomalies(): Promise<AnomalyPattern[]> {
    const [coordinated, shell, officers] = await Promise.all([
      this.detectCoordinatedApplications(),
      this.detectShellCompanies(),
      this.detectSharedOfficers(),
    ]);

    return [...coordinated, ...shell, ...officers]
      .sort((a, b) => b.confidence - a.confidence);
  }

  // ============================================================================
  // GRAPH STATISTICS
  // ============================================================================

  async getStats(): Promise<{
    tripleCount: number;
    entityCount: number;
    entityTypes: Record<EntityType, number>;
    predicates: Record<string, number>;
  }> {
    const triples = await this.getAllTriples();
    const entities = await this.getAllEntities();

    const entityTypes: Record<string, number> = {};
    for (const e of entities) {
      entityTypes[e.type] = (entityTypes[e.type] || 0) + 1;
    }

    const predicates: Record<string, number> = {};
    for (const t of triples) {
      predicates[t.predicate] = (predicates[t.predicate] || 0) + 1;
    }

    return {
      tripleCount: triples.length,
      entityCount: entities.length,
      entityTypes: entityTypes as Record<EntityType, number>,
      predicates,
    };
  }

  // ============================================================================
  // IMPORT/EXPORT
  // ============================================================================

  /**
   * Import corporate structure from SEC EDGAR data
   */
  async importFromSEC(companyData: {
    cik: string;
    name: string;
    subsidiaries?: Array<{ name: string; cik?: string }>;
    officers?: Array<{ name: string; title: string }>;
  }): Promise<void> {
    const companyUri = `company:${companyData.cik}`;
    
    await this.addEntity(companyUri, 'company', companyData.name, {
      cik: companyData.cik,
      source: 'SEC EDGAR',
    });

    // Add subsidiaries
    for (const sub of companyData.subsidiaries ?? []) {
      const subUri = `subsidiary:${sub.cik || sub.name.toLowerCase().replace(/\s+/g, '-')}`;
      await this.addEntity(subUri, 'subsidiary', sub.name, { parentCik: companyData.cik });
      await this.addTriple(companyUri, 'owns', subUri, { 
        confidence: 0.95, 
        sources: ['SEC EDGAR'] 
      });
    }

    // Add officers
    for (const officer of companyData.officers ?? []) {
      const officerUri = `person:${officer.name.toLowerCase().replace(/\s+/g, '-')}`;
      await this.addEntity(officerUri, 'person', officer.name, { title: officer.title });
      await this.addTriple(companyUri, 'has_officer', officerUri, {
        confidence: 0.95,
        sources: ['SEC EDGAR'],
        metadata: { title: officer.title },
      });
    }
  }

  /**
   * Export graph to JSON-LD format
   */
  async exportToJsonLd(): Promise<object> {
    const triples = await this.getAllTriples();
    const entities = await this.getAllEntities();

    return {
      '@context': {
        'dcim': 'https://dcim-compliance.org/ontology/',
        'owns': 'dcim:owns',
        'operates': 'dcim:operates',
        'has_violation': 'dcim:has_violation',
        'received_subsidy': 'dcim:received_subsidy',
      },
      '@graph': entities.map(e => ({
        '@id': e.uri,
        '@type': e.type,
        'label': e.label,
        ...e.properties,
      })),
      'relationships': triples.map(t => ({
        subject: t.subject,
        predicate: t.predicate,
        object: t.object,
        confidence: t.confidence,
      })),
    };
  }

  // ============================================================================
  // PRIVATE METHODS
  // ============================================================================

  private generateTripleId(subject: string, predicate: string, object: string): string {
    return `${subject}|${predicate}|${object}`;
  }

  private matchPattern(
    triples: Triple[],
    pattern: { subject: string; predicate: string; object: string },
    bindings: Record<string, string>
  ): Array<{ triple: Triple; bindings: Record<string, string> }> {
    const results: Array<{ triple: Triple; bindings: Record<string, string> }> = [];

    for (const triple of triples) {
      const newBindings: Record<string, string> = { ...bindings };
      let matches = true;

      // Check subject
      if (pattern.subject.startsWith('?')) {
        const varName = pattern.subject.slice(1);
        if (bindings[varName] && bindings[varName] !== triple.subject) {
          matches = false;
        } else {
          newBindings[varName] = triple.subject;
        }
      } else if (pattern.subject !== triple.subject) {
        matches = false;
      }

      // Check predicate
      if (pattern.predicate !== triple.predicate) {
        matches = false;
      }

      // Check object
      if (pattern.object.startsWith('?')) {
        const varName = pattern.object.slice(1);
        if (bindings[varName] && bindings[varName] !== triple.object) {
          matches = false;
        } else {
          newBindings[varName] = triple.object;
        }
      } else if (pattern.object !== triple.object) {
        matches = false;
      }

      if (matches) {
        results.push({ triple, bindings: newBindings });
      }
    }

    return results;
  }

  private async getAllTriples(): Promise<Triple[]> {
    try {
      return await db.table('knowledgeTriples').toArray();
    } catch {
      return [];
    }
  }

  private async getTriple(id: string): Promise<Triple | undefined> {
    if (this.tripleCache.has(id)) {
      return this.tripleCache.get(id);
    }
    try {
      return await db.table('knowledgeTriples').get(id);
    } catch {
      return undefined;
    }
  }

  private async persistTriple(triple: Triple): Promise<void> {
    await db.table('knowledgeTriples').put(triple);
    this.tripleCache.set(triple.id, triple);
  }

  private async getAllEntities(): Promise<Entity[]> {
    try {
      return await db.table('knowledgeEntities').toArray();
    } catch {
      return [];
    }
  }

  private async getEntity(uri: string): Promise<Entity | undefined> {
    if (this.entityCache.has(uri)) {
      return this.entityCache.get(uri);
    }
    try {
      return await db.table('knowledgeEntities').get(uri);
    } catch {
      return undefined;
    }
  }

  private async persistEntity(entity: Entity): Promise<void> {
    await db.table('knowledgeEntities').put(entity);
    this.entityCache.set(entity.uri, entity);
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const knowledgeGraph = new KnowledgeGraphService();

// ============================================================================
// REACT HOOK
// ============================================================================

import { useState, useCallback, useEffect } from 'react';

export function useKnowledgeGraph() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof knowledgeGraph.getStats>> | null>(null);
  const [anomalies, setAnomalies] = useState<AnomalyPattern[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [newStats, newAnomalies] = await Promise.all([
      knowledgeGraph.getStats(),
      knowledgeGraph.detectAllAnomalies(),
    ]);
    setStats(newStats);
    setAnomalies(newAnomalies);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addTriple = useCallback(async (
    subject: string,
    predicate: string,
    object: string,
    options?: Parameters<typeof knowledgeGraph.addTriple>[3]
  ) => {
    const triple = await knowledgeGraph.addTriple(subject, predicate, object, options);
    await refresh();
    return triple;
  }, [refresh]);

  const addEntity = useCallback(async (
    uri: string,
    type: EntityType,
    label: string,
    properties?: Record<string, unknown>
  ) => {
    const entity = await knowledgeGraph.addEntity(uri, type, label, properties);
    await refresh();
    return entity;
  }, [refresh]);

  const query = useCallback(async (patterns: Parameters<typeof knowledgeGraph.query>[0]) => {
    return await knowledgeGraph.query(patterns);
  }, []);

  const findOwnershipChain = useCallback(async (entityUri: string) => {
    return await knowledgeGraph.findOwnershipChain(entityUri);
  }, []);

  const findOwnedFacilities = useCallback(async (companyUri: string) => {
    return await knowledgeGraph.findOwnedFacilities(companyUri);
  }, []);

  return {
    stats,
    anomalies,
    loading,
    refresh,
    addTriple,
    addEntity,
    query,
    findOwnershipChain,
    findOwnedFacilities,
  };
}
